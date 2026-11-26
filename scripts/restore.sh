#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <db_backup.sql.gz> <files_backup.tar.gz>"
  exit 1
fi

DB_BACKUP="$1"
FILES_BACKUP="$2"
DB_NAME="${DB_DATABASE:-kdms}"

echo "Verifying archive integrity before restore..."
gzip -t "${DB_BACKUP}"
gzip -t "${FILES_BACKUP}"

read -r -p "WARNING: This will overwrite MySQL database '${DB_NAME}' and /opt/krevia/data/files. Type RESTORE to continue: " CONFIRM
if [[ "${CONFIRM}" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring MySQL database..."
gunzip -c "${DB_BACKUP}" | mysql "${DB_NAME}"

echo "Restoring /opt/krevia/data/files..."
rm -rf /opt/krevia/data/files/*
tar -xzf "${FILES_BACKUP}" -C /opt/krevia/data/files
chown -R www-data:www-data /opt/krevia/data/files

echo "Restarting PHP-FPM and queue workers..."
systemctl reload php8.3-fpm
supervisorctl restart kdms-worker:* || true
