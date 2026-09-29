import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UploadOutcome } from '../../../common/enums';
import { ApiKey } from '../../api-keys/entities/api-key.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('upload_logs')
export class UploadLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'request_id', type: 'char', length: 36 })
  requestId: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Index()
  @Column({ name: 'project_id', type: 'char', length: 36, nullable: true })
  projectId: string | null;

  @ManyToOne(() => ApiKey, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey | null;

  @Column({ name: 'api_key_id', type: 'char', length: 36, nullable: true })
  apiKeyId: string | null;

  @Column({ type: 'enum', enum: UploadOutcome })
  outcome: UploadOutcome;

  @Column({ name: 'http_status', type: 'smallint', unsigned: true })
  httpStatus: number;

  @Column({ name: 'source_ip', type: 'varchar', length: 45, nullable: true })
  sourceIp: string | null;

  @Column({
    name: 'input_bytes',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  inputBytes: string | null;

  @Column({
    name: 'output_bytes',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  outputBytes: string | null;

  @Column({ name: 'duration_ms', type: 'int', unsigned: true })
  durationMs: number;

  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'object_key', type: 'varchar', length: 500, nullable: true })
  objectKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
