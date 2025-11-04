default:
    @just --list

run:
    @echo "Running all services with build..."
    @docker compose -f docker-compose.local.yml up --build -d

up:
    @echo "Starting up all containers..."
    @docker compose -f docker-compose.local.yml up -d --remove-orphans

install:
    @echo "Installing dependencies locally..."
    @bun install --frozen-lockfile

just migrate:
    @echo "Migrating database..."
    @docker exec kosuke_nextjs npm run db:push

remove-previews:
    @docker rm -f $(docker ps -aq --filter "name=kosuke-preview")

