# Krevia DMS — Native Ubuntu 24.04 LTS VPS Deployment (1 GB RAM Optimized, No Docker)

- **VPS Public IP:** `202.155.13.251`
- **Production Domain:** `dms.kreviadigitalid.my.id`
- **Repository:** `https://github.com/Albertchristiann14/krevia-digital-management-system.git`
- **Stack:** Nginx + PHP 8.3-FPM + MySQL 8.4 + Redis + Supervisor (No Docker — hemat RAM untuk VPS 1 GB)

---

## Step 1 — Pre-Flight Inspection & 2 GB Swap (Wajib untuk VPS 1 GB RAM)
SSH ke `202.155.13.251` dan jalankan audit awal + buat **2 GB swap** agar `npm run build` / `composer install` tidak kehabisan RAM:
```bash
lsb_release -a && free -h && df -h /
ss -tulpn | grep -E ':80\b|:443\b|:3306\b' || true

# Buat 2 GB Swapfile (jika belum ada)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

## Step 2 — Security Hardening (UFW & Fail2ban)
```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban software-properties-common curl git unzip rclone

# Firewall: HANYA buka 22, 80, 443 (MySQL 3306 & Redis 6379 tetap tertutup di 127.0.0.1)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban
```

## Step 3 — Install Nginx, PHP 8.3, Composer, Node 22, MySQL 8.4, Redis & Supervisor
```bash
add-apt-repository -y ppa:ondrej/php
apt update
apt install -y nginx mysql-server redis-server supervisor certbot python3-certbot-nginx \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl \
  php8.3-zip php8.3-gd php8.3-intl php8.3-bcmath php8.3-redis

# Composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Node.js 22 (untuk npm run build)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

## Step 4 — Setup MySQL Database (Localhost Only)
Pastikan MySQL hanya listen di `127.0.0.1` (`bind-address = 127.0.0.1` di `/etc/mysql/mysql.conf.d/mysqld.cnf`), lalu buat database & user:
```bash
mysql -e "CREATE DATABASE IF NOT EXISTS kdms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'kdms_user'@'127.0.0.1' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';"
mysql -e "GRANT ALL PRIVILEGES ON kdms.* TO 'kdms_user'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

## Step 5 — Struktur Direktori `/opt/krevia/` & Deploy Aplikasi
```bash
mkdir -p /opt/krevia/applications/dms \
         /opt/krevia/infrastructure/nginx \
         /opt/krevia/infrastructure/scripts \
         /opt/krevia/data/files \
         /opt/krevia/backups \
         /opt/krevia/logs

git clone https://github.com/Albertchristiann14/krevia-digital-management-system.git /opt/krevia/applications/dms
cd /opt/krevia/applications/dms

# Hubungkan storage/app ke /opt/krevia/data/files agar persisten
rm -rf storage/app
ln -s /opt/krevia/data/files storage/app
mkdir -p /opt/krevia/data/files/private /opt/krevia/data/files/public

# Install dependencies & build frontend
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# Konfigurasi .env
cp .env.example .env
nano .env   # Isi DB_PASSWORD yang dibuat di Step 4 & MAIL_*

php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --force
php artisan optimize

chown -R www-data:www-data /opt/krevia/applications/dms/storage /opt/krevia/applications/dms/bootstrap/cache /opt/krevia/data/files /opt/krevia/logs
```

## Step 6 — Nginx & Let's Encrypt HTTPS (`dms.kreviadigitalid.my.id`)
Pastikan DNS A Record `dms.kreviadigitalid.my.id` → `202.155.13.251` sudah aktif (`dig +short dms.kreviadigitalid.my.id A`), lalu:
```bash
cp /opt/krevia/applications/dms/deploy/nginx/dms.kreviadigitalid.my.id.conf /etc/nginx/sites-available/dms.kreviadigitalid.my.id
ln -sf /etc/nginx/sites-available/dms.kreviadigitalid.my.id /etc/nginx/sites-enabled/dms.kreviadigitalid.my.id
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
certbot --nginx -d dms.kreviadigitalid.my.id --redirect --non-interactive --agree-tos -m admin@kreviadigitalid.my.id
```

## Step 7 — Supervisor (Queue Worker) & Cron (Scheduler + Backup)
Buat `/etc/supervisor/conf.d/kdms-worker.conf`:
```ini
[program:kdms-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /opt/krevia/applications/dms/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/opt/krevia/logs/worker.log
```
Aktifkan Supervisor & Cron (`crontab -e`):
```bash
supervisorctl reread && supervisorctl update && supervisorctl start kdms-worker:*
cp /opt/krevia/applications/dms/scripts/*.sh /opt/krevia/infrastructure/scripts/
chmod +x /opt/krevia/infrastructure/scripts/*.sh
```
Tambahkan di `crontab -e`:
```cron
* * * * * cd /opt/krevia/applications/dms && php artisan schedule:run >> /dev/null 2>&1
0 2 * * * DB_DATABASE=kdms DB_USERNAME=kdms_user DB_PASSWORD="PASSWORD_ANDA" /opt/krevia/infrastructure/scripts/backup.sh >> /opt/krevia/logs/backup.log 2>&1
```

## Step 8 — Cara Update Aplikasi Nantinya
```bash
cd /opt/krevia/applications/dms
git pull origin main
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize
systemctl reload php8.3-fpm
supervisorctl restart kdms-worker:*
```
