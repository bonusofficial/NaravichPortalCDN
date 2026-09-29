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
import { ProjectStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 253, nullable: true })
  domain: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Column({
    name: 'quota_bytes',
    type: 'bigint',
    unsigned: true,
    default: '107374182400',
  })
  quotaBytes: string;

  @Column({ name: 'allowed_formats', type: 'simple-json' })
  allowedFormats: string[];

  @Column({
    name: 'max_input_bytes',
    type: 'int',
    unsigned: true,
    default: 25000000,
  })
  maxInputBytes: number;

  @Column({
    name: 'max_output_bytes',
    type: 'int',
    unsigned: true,
    default: 5000000,
  })
  maxOutputBytes: number;

  @Column({
    name: 'starting_quality',
    type: 'smallint',
    unsigned: true,
    default: 82,
  })
  startingQuality: number;

  @Column({ name: 'max_width', type: 'int', unsigned: true, default: 4096 })
  maxWidth: number;

  @Column({ name: 'max_height', type: 'int', unsigned: true, default: 4096 })
  maxHeight: number;

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
