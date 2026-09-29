# Naravich Sure CDN Manager — Backend

NestJS API for the self-hosted Naravich Sure image storage service. It authenticates staff, issues per-project API keys, validates and compresses uploaded images to WebP, stores them on the local filesystem, and records metadata, usage, audit events, and upload logs in MySQL/MariaDB.

## Local environment

The checked-in local configuration expects the existing XAMPP database:

```text
Host:     127.0.0.1
Port:     3306
Username: root
Password: (empty)
Database: naravich_cdn
```

XAMPP phpMyAdmin is currently available at `http://localhost:8888/phpmyadmin/`. The API itself runs at `http://localhost:3000`.

## Start

```bash
cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

Local admin account (from `.env`):

```text
Email:    admin@naravich.local
Password: ChangeMe123!
```

Change the password and all secrets before using this outside local development.

Useful URLs:

```text
Health:  http://localhost:3000/api/v1/health
Swagger: http://localhost:3000/docs
Files:   http://localhost:3000/files/<object-key>
```

## Main API routes

Staff routes use a JWT from `POST /api/v1/auth/login`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Staff login |
| `GET` | `/api/v1/auth/me` | Current staff identity |
| `POST` | `/api/v1/auth/change-password` | Change the signed-in user's password |
| `POST` | `/api/v1/auth/mfa/setup` | Create a TOTP setup secret |
| `POST` | `/api/v1/auth/mfa/enable` | Verify and enable TOTP MFA |
| `POST` | `/api/v1/auth/mfa/disable` | Verify and disable TOTP MFA |
| `GET/POST/PATCH` | `/api/v1/projects` | Project management |
| `GET/POST` | `/api/v1/api-keys` | List/create API keys |
| `POST` | `/api/v1/api-keys/:id/rotate` | Rotate a key secret |
| `POST` | `/api/v1/api-keys/:id/revoke` | Revoke a key |
| `POST` | `/api/v1/images` | Developer image upload using an API key |
| `POST` | `/api/v1/dashboard/images` | Staff image upload using a JWT |
| `GET/DELETE` | `/api/v1/assets` | Asset administration |
| `GET` | `/api/v1/assets/trash/summary` | Trash object/byte totals |
| `POST` | `/api/v1/assets/:id/restore` | Restore a soft-deleted asset |
| `POST` | `/api/v1/assets/:id/reprocess` | Rebuild output from a retained original |
| `POST` | `/api/v1/assets/trash/purge` | Permanently empty trash (admin) |
| `GET/POST/PATCH/DELETE` | `/api/v1/users` | Staff account management (admin) |
| `GET` | `/api/v1/upload-logs` | Upload request logs |
| `GET` | `/api/v1/audit-logs` | Staff audit trail |
| `GET` | `/api/v1/dashboard/summary` | Dashboard KPIs and health |
| `GET` | `/api/v1/usage?days=30` | Daily/project usage |
| `GET` | `/api/v1/settings` | Non-secret runtime settings |
| `PATCH` | `/api/v1/settings/:section` | Persist supported defaults (admin) |

## Upload example

Create an API key from the staff API or Swagger. The full token is returned once.

```bash
curl -X POST http://localhost:3000/api/v1/images \
  -H "X-API-Key: ncdn_live_<public-id>.<secret>" \
  -F "file=@hero.png"
```

Successful response:

```json
{
  "id": "7c704359-2836-4f4b-844f-79a3263db026",
  "requestId": "...",
  "status": "ready",
  "url": "http://localhost:3000/files/my-project/2026/09/<asset-id>.webp",
  "mimeType": "image/webp",
  "width": 2400,
  "height": 1600,
  "originalBytes": 53974,
  "outputBytes": 6910,
  "savedPercent": 87.2
}
```

## Storage behavior

- Input: JPEG, PNG, or WebP only.
- Default maximum input: 25,000,000 bytes.
- Final output: WebP, no more than 5,000,000 bytes by default.
- EXIF orientation is applied; source metadata is removed by re-encoding.
- Quality is reduced first, followed by image dimensions when necessary.
- Processing concurrency is capped by `PROCESSING_CONCURRENCY`.
- Project quota, allowed formats, dimensions, quality, input size, and output size are configurable per project.
- Object path: `<project-slug>/<YYYY>/<MM>/<uuid>.webp`.
- Deleted assets are moved under `storage/.trash/` and soft-deleted in the database.
- Deleted assets can be restored to the same object key until trash is purged.
- Original files can be retained privately under `.originals/` for reprocessing; they are never served publicly and count toward project storage usage.
- Expired trash is cleaned hourly using the persisted retention setting.

The development server exposes `storage/` at `/files`. On Ubuntu production, Nginx should serve the storage directory directly and `PUBLIC_ASSET_BASE_URL` should point at the dedicated asset hostname.

## Security behavior

- Staff passwords are hashed with bcrypt.
- Staff endpoints use signed JWT bearer tokens.
- API keys use a public lookup ID and a 256-bit random secret.
- Only an HMAC-SHA256 digest of each API secret is persisted.
- Full API secrets are returned only during creation or rotation.
- API keys support scopes, expiry, IPv4/IPv6/CIDR allowlists, revocation, optional rotation grace, and per-minute limits.
- Staff accounts support forced temporary-password changes and encrypted-at-rest TOTP secrets.
- Images are decoded and re-encoded rather than trusted by extension or request MIME.
- Input pixel count and processing concurrency are capped.
- Uploads are automatically paused with HTTP `507` when disk usage reaches `DISK_STOP_UPLOAD_PERCENT`.
- Database credentials, JWT secrets, API-key pepper, and filesystem paths are environment variables.

## Database and migrations

Schema synchronization is intentionally disabled. Apply versioned migrations:

```bash
npm run migration:run
```

Revert the latest migration only when you understand its data impact:

```bash
npm run migration:revert
```

The current schema creates:

- `users`
- `projects`
- `api_keys`
- `assets`
- `upload_logs`
- `audit_logs`
- `migrations`
- `system_settings`

## Checks

```bash
npm run lint
npm run build
npm test
```

With the API running, an end-to-end local check is also available:

```bash
npm run test:smoke
```

The smoke test signs in, creates/reuses a test project, creates a one-time API key, uploads a generated PNG, verifies the returned WebP URL, checks the dashboard summary, and revokes the key.

## Ubuntu production notes

Before deploying:

1. Use a dedicated, least-privilege database user instead of `root`.
2. Replace `JWT_SECRET`, `API_KEY_PEPPER`, and the seeded admin password.
3. Set `STORAGE_ROOT` to an absolute path such as `/srv/naravich-cdn/storage`.
4. Put temporary uploads on the same filesystem when atomic moves are required.
5. Let Nginx serve the public storage path read-only and proxy only `/api/` to NestJS.
6. Bind MySQL to localhost/private networking only.
7. Configure filesystem and database backups to another machine or NAS.
8. Monitor disk capacity/inodes and stop uploads before the operating-system volume fills.

Production templates for Nginx, systemd, and verified database/storage backups are in `../deploy`.
