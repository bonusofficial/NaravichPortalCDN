import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssetStatus } from '../../../common/enums';
import { Project } from '../../projects/entities/project.entity';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ name: 'project_id', type: 'char', length: 36 })
  projectId: string;

  @Index({ unique: true })
  @Column({ name: 'object_key', length: 500 })
  objectKey: string;

  @Column({ name: 'public_url', length: 1000 })
  publicUrl: string;

  @Index({ unique: true })
  @Column({
    name: 'original_object_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  originalObjectKey: string | null;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'input_mime', length: 100 })
  inputMime: string;

  @Column({ name: 'output_mime', length: 100 })
  outputMime: string;

  @Column({ name: 'original_bytes', type: 'bigint', unsigned: true })
  originalBytes: string;

  @Column({ name: 'output_bytes', type: 'bigint', unsigned: true })
  outputBytes: string;

  @Column({
    name: 'original_width',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  originalWidth: number | null;

  @Column({
    name: 'original_height',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  originalHeight: number | null;

  @Column({ type: 'int', unsigned: true })
  width: number;

  @Column({ type: 'int', unsigned: true })
  height: number;

  @Column({ type: 'smallint', unsigned: true, nullable: true })
  quality: number | null;

  @Column({
    name: 'processing_attempts',
    type: 'smallint',
    unsigned: true,
    default: 0,
  })
  processingAttempts: number;

  @Column({ name: 'checksum_sha256', type: 'char', length: 64 })
  checksumSha256: string;

  @Index({ unique: true })
  @Column({ name: 'request_id', type: 'char', length: 36 })
  requestId: string;

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.READY })
  status: AssetStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  deletedAt: Date | null;
}
