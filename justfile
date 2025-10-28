default:
    @just --list

run:
    @echo "Running all services with build..."
    @docker compose -f docker-compose.local.yml up --build -d

up:
    @echo "Starting up all containers..."
    @docker compose -f docker-compose.local.yml up -d --remove-orphans

remove-previews:
    @docker rm -f $(docker ps -aq --filter "name=kosuke-preview")

