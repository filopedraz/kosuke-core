default:
    @just --list

run-backend:
    @echo "Running all services..."
    @docker compose up --build -d

up:
    @echo "Starting up containers..."
    @docker compose up -d --remove-orphans

deploy-prod:
    @docker compose -f docker-compose.production.yml up --build -d
    @docker compose -f docker-compose.production.yml exec nextjs bun run db:push

remove-previews:
    @docker rm -f $(docker ps -aq --filter "name=kosuke-preview")

