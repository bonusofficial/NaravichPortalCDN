const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { afterEach, beforeEach, test } = require('node:test');
const { ConfigService } = require('@nestjs/config');
const sharp = require('sharp');
const {
  ImageProcessorService,
} = require('../dist/modules/assets/image-processor.service');

let directory;
let inputPath;
let service;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'naravich-image-test-'));
  inputPath = join(directory, 'input.png');
  await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 4,
      background: { r: 16, g: 169, b: 200, alpha: 1 },
    },
  })
    .png()
    .toFile(inputPath);
  service = new ImageProcessorService(
    new ConfigService({
      MAX_INPUT_PIXELS: '40000000',
      PROCESSING_CONCURRENCY: '2',
    }),
  );
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test('converts an allowed image to WebP within the configured byte limit', async () => {
  const result = await service.process(inputPath, {
    allowedFormats: ['jpeg', 'png', 'webp'],
    maxOutputBytes: 500000,
    maxWidth: 4096,
    maxHeight: 4096,
    startingQuality: 82,
  });

  assert.equal(result.inputFormat, 'png');
  assert.ok(result.size <= 500000);
  assert.equal(result.width, 1200);
  assert.equal(result.height, 800);
  assert.equal((await sharp(result.data).metadata()).format, 'webp');
});
