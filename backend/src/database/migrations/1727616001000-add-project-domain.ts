import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectDomain1727616001000 implements MigrationInterface {
  name = 'AddProjectDomain1727616001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE projects ADD COLUMN domain varchar(253) NULL AFTER description',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE projects DROP COLUMN domain');
  }
}
