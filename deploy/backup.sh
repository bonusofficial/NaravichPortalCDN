#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${BACKUP_ROOT:?BACKUP_ROOT is required}"
: "${STORAGE_ROOT:?STORAGE_ROOT is required}"
: "${DB_HOST:?DB_HOST is required}"
: "${DB_PORT:?DB_PORT is required}"
: "${DB_USERNAME:?DB_USERNAME is required}"
: "${DB_DATABASE:?DB_DATABASE is required}"
: "${RETENTION_DAYS:=14}"

if [[ "${BACKUP_ROOT}" != /* || "${BACKUP_ROOT}" == "/" || ${#BACKUP_ROOT} -lt 10 ]]; then
  echo "Refusing unsafe BACKUP_ROOT: ${BACKUP_ROOT}" >&2
  exit 2
fi
if [[ "${STORAGE_ROOT}" != /* || ! -d "${STORAGE_ROOT}" ]]; then
  echo "STORAGE_ROOT must be an existing absolute directory" >&2
  exit 2
fi
if ! [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] || (( RETENTION_DAYS < 1 )); then
  echo "RETENTION_DAYS must be a positive integer" >&2
  exit 2
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_ROOT}"
work_dir="$(mktemp -d "${BACKUP_ROOT}/.pending-${timestamp}-XXXXXX")"
final_dir="${BACKUP_ROOT}/${timestamp}"
cleanup() { rm -rf -- "${work_dir}"; }
trap cleanup EXIT

export MYSQL_PWD="${DB_PASSWORD:-}"
mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USERNAME}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --databases "${DB_DATABASE}" \
  | gzip -9 > "${work_dir}/database.sql.gz"
unset MYSQL_PWD

tar --exclude='./.tmp' -C "${STORAGE_ROOT}" -czf "${work_dir}/storage.tar.gz" .
(cd "${work_dir}" && sha256sum database.sql.gz storage.tar.gz > SHA256SUMS)
mv -- "${work_dir}" "${final_dir}"
trap - EXIT

find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -mtime "+${RETENTION_DAYS}" -exec rm -rf -- {} +
echo "Backup completed: ${final_dir}"
