default:
    @just --list

run-backend:
    @echo "Running all services..."
    @docker compose up --build -d postgres agent

remove-previews:
    @docker rm -f $(docker ps -aq --filter "name=kosuke-preview")
