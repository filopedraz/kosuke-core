default:
    @just --list

run-backend:
    @echo "Running all services..."
    @docker compose up --build -d minio postgres agent