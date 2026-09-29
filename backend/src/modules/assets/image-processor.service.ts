import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  size: number;
  inputFormat: string;
  inputMime: string;
  quality: number;
  attempts: number;
  originalWidth: number;
  originalHeight: number;
}

export interface ProcessImageOptions {
  allowedFormats: string[];
  maxOutputBytes: number;
  maxWidth: number;
  maxHeight: number;
  startingQuality: number;
  minQuality?: number;
  qualityStep?: number;
  stripMetadata?: boolean;
}

@Injectable()
export class ImageProcessorService {
  private readonly maxInputPixels: number;
  private readonly maxConcurrency: number;
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(config: ConfigService) {
    this.maxInputPixels = Number(
      config.get<string>('MAX_INPUT_PIXELS', '40000000'),
    );
    this.maxConcurrency = Number(
      config.get<string>('PROCESSING_CONCURRENCY', '2'),
    );
  }

  async process(
    inputPath: string,
    options: ProcessImageOptions,
  ): Promise<ProcessedImage> {
    await this.acquire();
    try {
      return await this.processInternal(inputPath, options);
    } finally {
      this.release();
    }
  }

  private async processInternal(
    inputPath: string,
    options: ProcessImageOptions,
  ): Promise<ProcessedImage> {
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(inputPath, {
        limitInputPixels: this.maxInputPixels,
        failOn: 'warning',
      }).metadata();
    } catch {
      throw new UnprocessableEntityException({
        code: 'INVALID_IMAGE',
        message: 'The uploaded file could not be decoded as a safe image',
      });
    }

    const format = metadata.format;
    if (!format || !['jpeg', 'png', 'webp'].includes(format)) {
      throw new UnprocessableEntityException({
        code: 'UNSUPPORTED_IMAGE_FORMAT',
        message: 'Only JPEG, PNG, and WebP images are supported',
      });
    }
    if (!options.allowedFormats.includes(format)) {
      throw new UnprocessableEntityException({
        code: 'FORMAT_NOT_ALLOWED',
        message: `The ${format} format is disabled for this project`,
      });
    }
    if (!metadata.width || !metadata.height) {
      throw new UnprocessableEntityException({
        code: 'INVALID_IMAGE_DIMENSIONS',
        message: 'Image dimensions could not be determined',
      });
    }

    let targetWidth = Math.min(metadata.width, options.maxWidth);
    let targetHeight = Math.min(metadata.height, options.maxHeight);
    let quality = options.startingQuality;
    const minQuality = options.minQuality ?? 46;
    const qualityStep = options.qualityStep ?? 8;

    for (let attempt = 1; attempt <= 20; attempt += 1) {
      let pipeline = sharp(inputPath, {
        limitInputPixels: this.maxInputPixels,
        failOn: 'warning',
      })
        .rotate()
        .resize({
          width: targetWidth,
          height: targetHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      if (options.stripMetadata === false) pipeline = pipeline.withMetadata();
      const result = await pipeline
        .webp({ quality, effort: 4, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });

      if (result.info.size <= options.maxOutputBytes) {
        return {
          data: result.data,
          width: result.info.width,
          height: result.info.height,
          size: result.info.size,
          inputFormat: format,
          inputMime: format === 'jpeg' ? 'image/jpeg' : `image/${format}`,
          quality,
          attempts: attempt,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
        };
      }

      if (quality > minQuality) {
        quality = Math.max(minQuality, quality - qualityStep);
      } else {
        targetWidth = Math.max(320, Math.floor(result.info.width * 0.85));
        targetHeight = Math.max(320, Math.floor(result.info.height * 0.85));
        quality = Math.min(options.startingQuality, 74);
      }
    }

    throw new UnprocessableEntityException({
      code: 'IMAGE_CANNOT_BE_COMPRESSED',
      message: `The image could not be reduced below ${options.maxOutputBytes} bytes safely`,
    });
  }

  private async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    this.waiting.shift()?.();
  }
}
