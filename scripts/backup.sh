#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/krevia/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${DB_DATABASE:-kdms}"
DB_USER="${DB_USERNAME:-kdms_user}"
DB_PASS="${DB_PASSWORD:-}"
DB_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"
FILES_FILE="${BACKUP_DIR}/files_${TIMESTAMP}.tar.gz"
CFG_FILE="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"
EXTERNAL_REMOTE="${EXTERNAL_REMOTE:-}" # e.g. "b2:krevia-dms-backups" via rclone

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Backing up MySQL 8.4 database (${DB_NAME})..."
if [[ -n "${DB_PASS}" ]]; then
  MYSQL_PWD="${DB_PASS}" mysqldump --single-transaction --routines --triggers -h 127.0.0.1 -u "${DB_USER}" "${DB_NAME}" | gzip -9 > "${DB_FILE}"
else
  mysqldump --single-transaction --routines --triggers "${DB_NAME}" | gzip -9 > "${DB_FILE}"
fi
gzip -t "${DB_FILE}"

echo "[$(date)] Backing up /opt/krevia/data/files..."
tar -czf "${FILES_FILE}" -C /opt/krevia/data/files .
gzip -t "${FILES_FILE}"

echo "[$(date)] Backing up essential configuration..."
tar -czf "${CFG_FILE}" \
  /opt/krevia/applications/dms/.env \
  /etc/nginx/sites-available/dms.kreviadigitalid.my.id \
  /opt/krevia/infrastructure/scripts
gzip -t "${CFG_FILE}"

if [[ -n "${EXTERNAL_REMOTE}" ]] && command -v rclone >/dev/null 2>&1; then
  echo "[$(date)] Syncing backups to external destination: ${EXTERNAL_REMOTE}..."
  rclone copy "${DB_FILE}" "${EXTERNAL_REMOTE}/db/"
  rclone copy "${FILES_FILE}" "${EXTERNAL_REMOTE}/files/"
  rclone copy "${CFG_FILE}" "${EXTERNAL_REMOTE}/config/"
fi

echo "[$(date)] Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "*.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date)] Backup completed successfully."
