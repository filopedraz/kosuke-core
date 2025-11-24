# Bun Preview image
This is the preview image of Javascript/Typescript service whose package manager is Bun.

## Repository requirements
The directory mounted as volume to this image should have the following prerequisites:
- `package.json` at root level with the following scripts:
  - `dev`: to start the dev server (e.g. `next dev`)
  - `db:push`: to initialize the database (e.g. `drizzle-kit push`)