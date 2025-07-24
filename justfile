default:
    @just --list

run-backend:
    @echo "Running all services..."
    @docker compose up -d minio postgres agent