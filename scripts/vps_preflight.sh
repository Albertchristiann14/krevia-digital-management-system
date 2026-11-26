#!/usr/bin/env bash
set -euo pipefail

echo "=== KDMS VPS PRE-FLIGHT AUDIT (READ-ONLY) ==="
echo "--- 1. OS Version ---"
lsb_release -a 2>/dev/null || cat /etc/os-release

echo "--- 2. CPU, RAM & Disk ---"
nproc
free -h
df -h /

echo "--- 3. Docker & Compose ---"
docker --version 2>/dev/null || echo "Docker: NOT INSTALLED"
docker compose version 2>/dev/null || echo "Docker Compose: NOT INSTALLED"

echo "--- 4. Existing Services & Ports (80, 443, 3306) ---"
ss -tulpn | grep -E ':80\b|:443\b|:3306\b|:8080\b' || echo "Ports 80/443/3306/8080 are free"

echo "--- 5. Firewall (UFW) ---"
ufw status 2>/dev/null || echo "UFW not active"

echo "--- 6. Nginx Status ---"
systemctl is-active nginx 2>/dev/null || echo "Nginx not running"

echo "--- 7. Target Directory /opt/krevia ---"
ls -la /opt/krevia 2>/dev/null || echo "/opt/krevia does not exist yet"

echo "--- 8. DNS Resolution Check ---"
dig +short dms.kreviadigitalid.my.id A || nslookup dms.kreviadigitalid.my.id || true
