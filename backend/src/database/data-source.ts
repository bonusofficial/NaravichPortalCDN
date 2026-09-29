import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDatabaseOptions } from './database.options';
import { ApiKey } from '../modules/api-keys/entities/api-key.entity';
import { Asset } from '../modules/assets/entities/asset.entity';
import { AuditLog } from '../modules/audit-logs/entities/audit-log.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { UploadLog } from '../modules/upload-logs/entities/upload-log.entity';
import { User } from '../modules/users/entities/user.entity';
import { SystemSetting } from '../modules/settings/entities/system-setting.entity';
import { InitialSchema1727616000000 } from './migrations/1727616000000-initial-schema';
import { AddProjectDomain1727616001000 } from './migrations/1727616001000-add-project-domain';
import { CompleteFeatures1727616002000 } from './migrations/1727616002000-complete-features';

export default new DataSource({
  ...getDatabaseOptions(),
  entities: [User, Project, ApiKey, Asset, UploadLog, AuditLog, SystemSetting],
  migrations: [
    InitialSchema1727616000000,
    AddProjectDomain1727616001000,
    CompleteFeatures1727616002000,
  ],
});
