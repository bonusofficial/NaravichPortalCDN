export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export enum ApiKeyStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum AssetStatus {
  READY = 'ready',
  DELETED = 'deleted',
}

export enum UploadOutcome {
  SUCCESS = 'success',
  FAILED = 'failed',
}
