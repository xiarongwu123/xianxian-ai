# Production deployment

## Server prerequisites

- Ubuntu 22.04 or 24.04
- Docker Engine with the Compose plugin
- Ports 80 and 443 open
- A domain A record pointing to the server IP

## First deployment

```bash
git clone YOUR_PRIVATE_REPOSITORY_URL xianxian-ai
cd xianxian-ai
cp .env.production.example .env.production
openssl rand -hex 32
# Edit SITE_ADDRESS, CORS_ORIGIN, JWT_SECRET and provider credentials.
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

## Upgrade

```bash
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

## Backup

```bash
chmod +x deploy/backup.sh
./deploy/backup.sh
```

Schedule it daily after verifying the destination has enough free space:

```cron
15 3 * * * cd /opt/xianxian-ai && ./deploy/backup.sh >> /var/log/xianxian-backup.log 2>&1
```

## Diagnostics

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 caddy
curl https://YOUR_DOMAIN/health
```

The Caddy proxy disables response buffering so streamed AI analysis reaches the browser immediately.
