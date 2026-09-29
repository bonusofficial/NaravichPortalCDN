import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ name: 'setting_key', length: 64 })
  key: string;

  @Column({ name: 'setting_value', type: 'simple-json' })
  value: Record<string, unknown>;

  @Column({ name: 'updated_by_id', type: 'char', length: 36, nullable: true })
  updatedById: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
