import type { Request } from 'express';
import type { ApiKey } from '../../modules/api-keys/entities/api-key.entity';
import type { Project } from '../../modules/projects/entities/project.entity';
import type { UserRole } from '../enums';

export interface JwtUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AdminAuthenticatedRequest extends Request {
  user: JwtUser;
}

export interface ApiKeyAuthenticatedRequest extends Request {
  apiKey: ApiKey;
  project: Project;
}
