import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteFeatures1727616002000 implements MigrationInterface {
  name = 'CompleteFeatures1727616002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assets
        ADD COLUMN original_object_key varchar(500) NULL AFTER public_url,
        ADD COLUMN original_width int unsigned NULL AFTER output_bytes,
        ADD COLUMN original_height int unsigned NULL AFTER original_width,
        ADD COLUMN quality smallint unsigned NULL AFTER height,
        ADD COLUMN processing_attempts smallint unsigned NOT NULL DEFAULT 0 AFTER quality,
        ADD UNIQUE KEY uq_assets_original_object_key (original_object_key)
    `);
    await queryRunner.query(`
      ALTER TABLE api_keys
        ADD COLUMN previous_secret_hash char(64) NULL AFTER secret_hash,
        ADD COLUMN previous_secret_expires_at datetime(6) NULL AFTER previous_secret_hash
    `);
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN must_change_password tinyint NOT NULL DEFAULT 0 AFTER password_hash,
        ADD COLUMN mfa_secret varchar(128) NULL AFTER mfa_enabled
    `);
    await queryRunner.query(`
      CREATE TABLE system_settings (
        setting_key varchar(64) NOT NULL,
        setting_value longtext NOT NULL,
        updated_by_id char(36) NULL,
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (setting_key),
        CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS system_settings');
    await queryRunner.query(
      'ALTER TABLE users DROP COLUMN mfa_secret, DROP COLUMN must_change_password',
    );
    await queryRunner.query(
      'ALTER TABLE api_keys DROP COLUMN previous_secret_expires_at, DROP COLUMN previous_secret_hash',
    );
    await queryRunner.query(
      'ALTER TABLE assets DROP INDEX uq_assets_original_object_key, DROP COLUMN processing_attempts, DROP COLUMN quality, DROP COLUMN original_height, DROP COLUMN original_width, DROP COLUMN original_object_key',
    );
  }
}
