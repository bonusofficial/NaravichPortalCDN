import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  rename,
  rm,
  statfs,
  writeFile,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

@Injectable()
export class StorageService implements OnModuleInit {
  readonly root: string;
  readonly tempRoot: string;
  readonly diskWarningPercent: number;
  readonly diskStopUploadPercent: number;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('STORAGE_ROOT', './storage'));
    this.tempRoot = resolve(config.get<string>('TEMP_ROOT', './storage/.tmp'));
    this.publicBaseUrl = config
      .get<string>('PUBLIC_ASSET_BASE_URL', 'http://localhost:3000/files')
      .replace(/\/$/, '');
    this.diskWarningPercent = Number(
      config.get<string>('DISK_WARNING_PERCENT', '70'),
    );
    this.diskStopUploadPercent = Number(
      config.get<string>('DISK_STOP_UPLOAD_PERCENT', '88'),
    );
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      mkdir(this.root, { recursive: true }),
      mkdir(this.tempRoot, { recursive: true }),
      mkdir(resolve(this.root, '.trash'), { recursive: true }),
    ]);
  }

  buildObjectKey(projectSlug: string, assetId: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${projectSlug}/${year}/${month}/${assetId}.webp`;
  }

  buildOriginalObjectKey(
    projectSlug: string,
    assetId: string,
    extension: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `.originals/${projectSlug}/${year}/${month}/${assetId}.${extension}`;
  }

  publicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${objectKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`;
  }

  async write(objectKey: string, data: Buffer): Promise<void> {
    const destination = this.safePath(objectKey);
    const temporary = resolve(this.tempRoot, `${randomUUID()}.processed`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(temporary, data, { flag: 'wx' });
    await rename(temporary, destination);
  }

  async copyFrom(objectKey: string, sourcePath: string): Promise<void> {
    const destination = this.safePath(objectKey);
    const temporary = resolve(this.tempRoot, `${randomUUID()}.original`);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(sourcePath, temporary);
    await rename(temporary, destination);
  }

  pathFor(objectKey: string): string {
    return this.safePath(objectKey);
  }

  async remove(objectKey: string): Promise<void> {
    await rm(this.safePath(objectKey), { force: true });
  }

  async moveToTrash(objectKey: string, deletedAt = new Date()): Promise<void> {
    const source = this.safePath(objectKey);
    const date = deletedAt.toISOString().slice(0, 10);
    const destination = resolve(this.root, '.trash', date, objectKey);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }

  async restoreFromTrash(objectKey: string, deletedAt: Date): Promise<void> {
    const source = resolve(
      this.root,
      '.trash',
      deletedAt.toISOString().slice(0, 10),
      objectKey,
    );
    const destination = this.safePath(objectKey);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }

  async removeFromTrash(objectKey: string, deletedAt: Date): Promise<void> {
    const trashRoot = resolve(this.root, '.trash');
    const target = resolve(
      trashRoot,
      deletedAt.toISOString().slice(0, 10),
      objectKey,
    );
    if (!target.startsWith(`${trashRoot}${sep}`)) {
      throw new Error('Unsafe trash path');
    }
    await rm(target, { force: true });
  }

  async purgeTrash(): Promise<void> {
    const trash = resolve(this.root, '.trash');
    await rm(trash, { recursive: true, force: true });
    await mkdir(trash, { recursive: true });
  }

  async health() {
    await access(this.root, constants.R_OK | constants.W_OK);
    const stats = await statfs(this.root, { bigint: true });
    const totalBytes = stats.blocks * stats.bsize;
    const availableBytes = stats.bavail * stats.bsize;
    const usedBytes = totalBytes - availableBytes;
    const usedPercent =
      totalBytes === 0n
        ? 0
        : Number(((usedBytes * 10000n) / totalBytes).toString()) / 100;
    const state =
      usedPercent >= this.diskStopUploadPercent
        ? 'critical'
        : usedPercent >= this.diskWarningPercent
          ? 'warning'
          : 'healthy';

    return {
      writable: true,
      totalBytes: totalBytes.toString(),
      usedBytes: usedBytes.toString(),
      availableBytes: availableBytes.toString(),
      usedPercent,
      warningPercent: this.diskWarningPercent,
      stopUploadPercent: this.diskStopUploadPercent,
      state,
      acceptsUploads: state !== 'critical',
    };
  }

  private safePath(objectKey: string): string {
    const target = resolve(this.root, objectKey);
    if (!target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Unsafe storage path');
    }
    return target;
  }
}
