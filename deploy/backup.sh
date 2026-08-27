#!/bin/sh
set -eu

backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

docker compose exec -T app node --input-type=module -e '
  import Database from "better-sqlite3";
  const db = new Database("/app/data/xianxian.sqlite");
  await db.backup("/app/data/xianxian-backup.sqlite");
  db.close();
'
docker compose cp app:/app/data/xianxian-backup.sqlite "$backup_dir/xianxian-$timestamp.sqlite"
docker compose exec -T app rm -f /app/data/xianxian-backup.sqlite
find "$backup_dir" -type f -name "xianxian-*.sqlite" -mtime +14 -delete

echo "Backup created: $backup_dir/xianxian-$timestamp.sqlite"
