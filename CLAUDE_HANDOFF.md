# Naravich Portal CDN — Implementation Status / Claude Handoff

อัปเดตล่าสุด: 29 กันยายน 2026

เอกสารนี้เป็นรายการสถานะจริงสำหรับ Claude/agent ที่มารับช่วงต่อ ไม่ต้องอ้างอิง mock หรือประวัติแชตเก่า

## เป้าหมายและ Stack

- Dashboard กลางสำหรับหลายเว็บไซต์/โปรเจกต์บน VPS Ubuntu โดยไม่ใช้ Cloudflare
- React 19 + TypeScript + Vite (`dashboard`)
- NestJS + TypeORM + Sharp (`backend`)
- MySQL/MariaDB ฐาน `naravich_cdn`; local ใช้ XAMPP `127.0.0.1:3306`, root, password ว่าง
- ไฟล์อยู่ local filesystem; production ให้ Nginx serve output แบบ read-only

## ฟีเจอร์ที่ทำงานจริงแล้ว

### Authentication / staff

- [x] JWT login, `/auth/me`, sign-out และ RBAC admin/operator/viewer
- [x] Admin สร้าง/แก้ role/disable/delete staff ได้
- [x] บัญชีที่สร้างใหม่ถูกบังคับเปลี่ยน temporary password
- [x] ทุก JWT request ตรวจ user/role/active/must-change จาก DB จึงบังคับ role/disable/password reset ได้ทันที
- [x] ผู้ใช้เปลี่ยนรหัสผ่านตัวเองได้จาก forced screen และ Settings
- [x] TOTP MFA setup/verify/enable/disable และ login ด้วย OTP
- [x] MFA secret เข้ารหัส AES-256-GCM ก่อนเก็บ DB โดย derive key จาก `JWT_SECRET`

### Projects / API keys

- [x] Project list/create/update/pause-resume, domain, quota และ processing limit ต่อโปรเจกต์
- [x] API key create/list/revoke/rotate; เก็บเฉพาะ HMAC-SHA256 digest และแสดง full token ครั้งเดียว
- [x] Rotation grace 0–168 ชั่วโมง โดย secret เก่ายังใช้ได้ถึงเวลาที่กำหนด
- [x] IP allowlist รองรับ exact IPv4/IPv6 และ CIDR
- [x] Per-key expiry, scope และ in-memory rate limit สำหรับ single Nest process

### Image / storage

- [x] `POST /api/v1/images` สำหรับ website server ด้วย API key
- [x] `POST /api/v1/dashboard/images` สำหรับ staff ด้วย JWT
- [x] รับ JPEG/PNG/WebP, decode จริง, จำกัด bytes/pixels/concurrency, apply EXIF orientation
- [x] แปลงเป็น WebP และลด quality/ขนาดจนไม่เกิน project limit (สูงสุด 5,000,000 bytes)
- [x] เก็บ output ที่ `<project>/<YYYY>/<MM>/<uuid>.webp` และตอบ public CDN URL
- [x] เลือก retain original แบบ private ใน `.originals/`; Nginx และ Express ปฏิเสธ dot path
- [x] Reprocess output จาก retained original ด้วยค่าปัจจุบัน
- [x] DB เก็บ original/output dimensions, final quality, attempts และ SHA-256
- [x] Quota/usage/storage summary นับ retained original + output
- [x] Delete ย้ายไฟล์เข้า `.trash`, Undo restore, admin purge และ cleanup ตาม retention ทุกชั่วโมง
- [x] Disk safety guard ตอบ 507 เมื่อ filesystem ถึง stop threshold

### Dashboard / operations

- [x] Overview, usage, health, assets, projects, keys, logs, users และ audit ดึง API จริง
- [x] Dashboard fetch ทุกหน้าจาก API ทีละ 100 records ไม่ตัดข้อมูลเงียบที่ 100
- [x] Upload/delete/restore/reprocess/download output ทำงานกับไฟล์จริง
- [x] Settings แสดง runtime config และบันทึกค่าที่ service ใช้จริงใน `system_settings`
- [x] Editable settings: workspace/support/timezone, retained originals, trash retention, min quality, quality step, metadata, default key expiry/rate
- [x] ตัดคำอ้าง hash-chain verification ฝั่ง client ที่ไม่ได้มาจาก server แล้ว
- [x] ไฟล์ deploy มี Nginx, systemd API, nightly backup timer และ script dump DB + tar storage + SHA-256 + retention

## Migration ล่าสุด

`CompleteFeatures1727616002000` apply สำเร็จแล้ว เพิ่ม asset retained-original/metadata, API-key rotation grace, user forced-password/MFA secret และตาราง `system_settings`

ห้ามเปิด TypeORM schema synchronize; ใช้ `npm run migration:run` เท่านั้น

## Endpoint ที่เพิ่มล่าสุด

| Method | Endpoint | หน้าที่ |
| --- | --- | --- |
| POST | `/auth/change-password` | เปลี่ยนรหัสผ่านตัวเอง |
| POST | `/auth/mfa/setup` | สร้าง TOTP secret/otpauth URI |
| POST | `/auth/mfa/enable` | verify code แล้วเปิด MFA |
| POST | `/auth/mfa/disable` | verify code แล้วปิด MFA |
| POST | `/api-keys/:id/rotate` | รองรับ body `{ "graceHours": 0..168 }` |
| POST | `/assets/:id/reprocess` | สร้าง output ใหม่จาก original |
| PATCH | `/settings/:section` | persist whitelist settings (admin) |

Endpoint เดิมทั้งหมดดูใน `backend/README.md` และ Swagger `http://localhost:3000/docs`

## ผลตรวจล่าสุด

- [x] Backend lint/build/tests: Sharp compression, IPv4/IPv6/CIDR, RFC 6238 TOTP
- [x] Dashboard lint/build
- [x] Migration apply กับ XAMPP สำเร็จ
- [x] E2E: admin login + me + settings PATCH
- [x] E2E: create temporary user → forced password → change password → MFA setup/enable → บังคับ OTP → login OTP → disable MFA → cleanup user
- [x] E2E: temporary JWT ถูกบล็อก 403 จนเปลี่ยน password และ JWT ของบัญชี disabled ถูกบล็อก 401 ทันที
- [x] E2E: create key with CIDR → rotate grace → old key ผ่าน auth ระหว่าง grace → revoke
- [x] Browser smoke: login, Overview โหลด live data, Settings แสดง runtime/persisted/account-security controls
- [x] `deploy/backup.sh` ผ่าน `bash -n`

## Blocker ภายนอกระบบ

เครื่องพัฒนาใช้ดิสก์ประมาณ 98.5% ซึ่งสูงกว่า `DISK_STOP_UPLOAD_PERCENT=88` จึงตั้งใจตอบ `507 DISK_CAPACITY_CRITICAL` และ health เป็น degraded ขณะนี้ยังทดสอบ successful upload ใหม่ไม่ได้จนกว่าผู้ใช้จะเพิ่ม/เคลียร์พื้นที่อย่างปลอดภัย ห้ามลบไฟล์ของผู้ใช้เองโดยเดา

## งานที่ยังต้องทำก่อน production จริง

- [ ] หลัง disk ต่ำกว่า 88% ทดสอบ browser flow upload → CDN URL → reprocess → delete/restore อีกรอบ
- [ ] เปลี่ยน dev admin password, `JWT_SECRET`, `API_KEY_PEPPER` และใช้ MySQL least-privilege user
- [ ] เปลี่ยน domain/path ใน `deploy/nginx.conf` และ env production แล้วเปิด HTTPS
- [ ] ติดตั้ง/enable systemd units และรัน restore drill; backup ควรถูก replicate ออกนอก VPS
- [ ] ถ้าต้องการ bandwidth delivery จริง ให้ aggregate Nginx access logs/metrics ลง DB; Dashboard ไม่เดาตัวเลขนี้
- [ ] ถ้าจะรัน Nest หลาย process/หลายเครื่อง ให้ย้าย rate-limit bucket จาก memory ไป Redis/shared store
- [ ] Email invitation/forgot-password ยังไม่มี SMTP integration; ปัจจุบัน admin ส่ง temporary passwordผ่านช่องทางที่ปลอดภัย

## วิธีรัน local

```bash
cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

อีก terminal:

```bash
cd dashboard
npm install
npm run dev
```

เปิด `http://localhost:5173`; local admin คือ `admin@naravich.local` / `ChangeMe123!` และห้ามใช้ credential นี้ใน production

## ไฟล์สำคัญ

- `backend/src/modules/assets/assets.service.ts` — quota, storage, trash, reprocess
- `backend/src/modules/assets/image-processor.service.ts` — Sharp compression
- `backend/src/modules/api-keys/api-key.guard.ts` — secret/grace/CIDR/rate-limit
- `backend/src/modules/auth/auth.service.ts` — password + encrypted TOTP
- `backend/src/modules/settings/settings.service.ts` — validation/persistence
- `dashboard/src/state/StoreProvider.tsx` — API mapping/actions/pagination
- `dashboard/src/state/AuthProvider.tsx` — login/password/MFA state
- `dashboard/src/views/settings/` — runtime, persisted preferences, account security
- `deploy/` — Ubuntu/Nginx/systemd/backup templates

## Prompt สำหรับ Claude ทำต่อ

```text
อ่าน CLAUDE_HANDOFF.md, backend/README.md, dashboard/README.md และ deploy/README.md ก่อน รักษาการแก้ไขเดิมทั้งหมด ระบบใช้ local VPS filesystem ห้ามเปลี่ยนไป Cloudflare งานหลักที่เหลือคือให้ผู้ใช้แก้ disk usage ต่ำกว่า 88% แล้วทดสอบ browser flow upload → เปิด CDN URL → reprocess → delete/restore และปรับ production env/domain/secret โดยห้ามลบไฟล์ผู้ใช้เอง จากนั้นรัน backend lint/test, dashboard lint/build และบันทึกผลจริงในเอกสารนี้ อย่าเปิด UI prototype หรือ claim metric/security/backup ใดที่ backend/OS ยังไม่ได้ทำจริง
```

## ข้อควรระวัง

- Workspace นี้ยังไม่ใช่ Git repository
- อย่า log JWT, password, API key เต็ม, MFA secret, `JWT_SECRET` หรือ `API_KEY_PEPPER`
- Full API key แสดงครั้งเดียวเท่านั้น
- Nginx serve storage แบบ read-only และต้อง deny `/files/.originals` กับ dot paths ทั้งหมด
- Backup อยู่ที่ OS layer ไม่ใช่ปุ่ม shell executionในเว็บ เพื่อไม่เปิดช่อง remote command execution
