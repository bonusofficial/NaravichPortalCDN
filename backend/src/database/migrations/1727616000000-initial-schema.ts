import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1727616000000 implements MigrationInterface {
  name = 'InitialSchema1727616000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id char(36) NOT NULL,
        name varchar(120) NOT NULL,
        email varchar(190) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role enum('admin','operator','viewer') NOT NULL DEFAULT 'operator',
        is_active tinyint NOT NULL DEFAULT 1,
        mfa_enabled tinyint NOT NULL DEFAULT 0,
        last_login_at datetime(6) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_users_email (email),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE projects (
        id char(36) NOT NULL,
        name varchar(160) NOT NULL,
        slug varchar(120) NOT NULL,
        description text NULL,
        status enum('active','disabled') NOT NULL DEFAULT 'active',
        quota_bytes bigint unsigned NOT NULL DEFAULT 107374182400,
        allowed_formats longtext NOT NULL,
        max_input_bytes int unsigned NOT NULL DEFAULT 25000000,
        max_output_bytes int unsigned NOT NULL DEFAULT 5000000,
        starting_quality smallint unsigned NOT NULL DEFAULT 82,
        max_width int unsigned NOT NULL DEFAULT 4096,
        max_height int unsigned NOT NULL DEFAULT 4096,
        created_by_id char(36) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_projects_slug (slug),
        PRIMARY KEY (id),
        CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE api_keys (
        id char(36) NOT NULL,
        project_id char(36) NOT NULL,
        name varchar(120) NOT NULL,
        public_id varchar(32) NOT NULL,
        secret_hash char(64) NOT NULL,
        prefix varchar(40) NOT NULL,
        scopes longtext NOT NULL,
        status enum('active','revoked') NOT NULL DEFAULT 'active',
        rate_limit_per_minute int unsigned NOT NULL DEFAULT 60,
        ip_allowlist longtext NULL,
        expires_at datetime(6) NULL,
        last_used_at datetime(6) NULL,
        created_by_id char(36) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_api_keys_public_id (public_id),
        KEY idx_api_keys_project_id (project_id),
        PRIMARY KEY (id),
        CONSTRAINT fk_api_keys_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_api_keys_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE assets (
        id char(36) NOT NULL,
        project_id char(36) NOT NULL,
        object_key varchar(500) NOT NULL,
        public_url varchar(1000) NOT NULL,
        original_name varchar(255) NOT NULL,
        input_mime varchar(100) NOT NULL,
        output_mime varchar(100) NOT NULL,
        original_bytes bigint unsigned NOT NULL,
        output_bytes bigint unsigned NOT NULL,
        width int unsigned NOT NULL,
        height int unsigned NOT NULL,
        checksum_sha256 char(64) NOT NULL,
        request_id char(36) NOT NULL,
        status enum('ready','deleted') NOT NULL DEFAULT 'ready',
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        deleted_at datetime(6) NULL,
        UNIQUE KEY uq_assets_object_key (object_key),
        UNIQUE KEY uq_assets_request_id (request_id),
        KEY idx_assets_project_id (project_id),
        KEY idx_assets_created_at (created_at),
        PRIMARY KEY (id),
        CONSTRAINT fk_assets_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE upload_logs (
        id char(36) NOT NULL,
        request_id char(36) NOT NULL,
        project_id char(36) NULL,
        api_key_id char(36) NULL,
        outcome enum('success','failed') NOT NULL,
        http_status smallint unsigned NOT NULL,
        source_ip varchar(45) NULL,
        input_bytes bigint unsigned NULL,
        output_bytes bigint unsigned NULL,
        duration_ms int unsigned NOT NULL,
        error_code varchar(80) NULL,
        error_message text NULL,
        object_key varchar(500) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_upload_logs_request_id (request_id),
        KEY idx_upload_logs_project_id (project_id),
        KEY idx_upload_logs_created_at (created_at),
        PRIMARY KEY (id),
        CONSTRAINT fk_upload_logs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        CONSTRAINT fk_upload_logs_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id char(36) NOT NULL,
        actor_user_id char(36) NULL,
        action varchar(100) NOT NULL,
        resource_type varchar(80) NOT NULL,
        resource_id varchar(100) NULL,
        ip varchar(45) NULL,
        metadata longtext NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_audit_logs_actor_user_id (actor_user_id),
        KEY idx_audit_logs_action (action),
        KEY idx_audit_logs_created_at (created_at),
        PRIMARY KEY (id),
        CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS upload_logs');
    await queryRunner.query('DROP TABLE IF EXISTS assets');
    await queryRunner.query('DROP TABLE IF EXISTS api_keys');
    await queryRunner.query('DROP TABLE IF EXISTS projects');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
