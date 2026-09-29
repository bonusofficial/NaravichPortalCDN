import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKeyStatus } from '../../../common/enums';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ name: 'project_id', type: 'char', length: 36 })
  projectId: string;

  @Column({ length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ name: 'public_id', length: 32 })
  publicId: string;

  @Column({ name: 'secret_hash', length: 64, select: false })
  secretHash: string;

  @Column({
    name: 'previous_secret_hash',
    type: 'char',
    length: 64,
    nullable: true,
    select: false,
  })
  previousSecretHash: string | null;

  @Column({
    name: 'previous_secret_expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  previousSecretExpiresAt: Date | null;

  @Column({ length: 40 })
  prefix: string;

  @Column({ type: 'simple-json' })
  scopes: string[];

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({
    name: 'rate_limit_per_minute',
    type: 'int',
    unsigned: true,
    default: 60,
  })
  rateLimitPerMinute: number;

  @Column({ name: 'ip_allowlist', type: 'simple-json', nullable: true })
  ipAllowlist: string[] | null;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  expiresAt: Date | null;

  @Column({
    name: 'last_used_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  lastUsedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', type: 'char', length: 36, nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
