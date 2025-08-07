default:
    @just --list

run-backend:
    @echo "Running all services..."
    @docker compose up --build -d postgres agent

deploy-prod:
    @docker compose -f docker-compose.production.yml up --build -d

remove-previews:
    @docker rm -f $(docker ps -aq --filter "name=kosuke-preview")

