# Ubuntu deployment

The files in this directory are production templates. Replace the example domain and paths if your VPS layout differs.

1. Install Node.js LTS, Nginx, MySQL/MariaDB, `rsync`, and `gzip`.
2. Create a locked-down `naravich-cdn` system user and the directories `/opt/naravich-cdn`, `/srv/naravich-cdn/storage`, `/srv/backups/naravich-cdn`, and `/etc/naravich-cdn`.
3. Copy the application to `/opt/naravich-cdn`, run `npm ci && npm run build` in both packages, then run `npm run migration:run` in `backend`.
4. Put the production API environment at `/etc/naravich-cdn/api.env`. Use a least-privilege database account and long random values for `JWT_SECRET` and `API_KEY_PEPPER`.
5. Install `naravich-cdn-api.service` and both backup units in `/etc/systemd/system/`. Copy `backup.env.example` to `/etc/naravich-cdn/backup.env`, set mode `0600`, then enable the API and timer.
6. Install `nginx.conf` as the `cdn.naravich.com` site configuration, validate with `nginx -t`, and add TLS after the DNS record points to the VPS.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now naravich-cdn-api.service
sudo systemctl enable --now naravich-cdn-backup.timer
sudo systemctl start naravich-cdn-backup.service
sudo systemctl status naravich-cdn-api.service naravich-cdn-backup.timer
```

Copy backups to another machine or storage device. A backup on the same VPS does not protect against volume or host loss. Test restoration regularly by verifying `SHA256SUMS`, importing `database.sql.gz`, extracting `storage.tar.gz`, and checking several returned asset URLs.
