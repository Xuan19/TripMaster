# TripMaster

Full-stack trip planning app:
- **Backend:** ASP.NET Core Web API (.NET 8) + Entity Framework Core
- **Frontend:** Vue 3 + Vite
- **Database:** local SQL Server for development

## Project structure

- `backend/TripMaster.Api` - REST API with a `Trip` model and endpoints to list/create trips.
- `frontend` - Vue application with a form and trip list.
- `docker-compose.yml` - local SQL Server instance.

## Run SQL Server

```bash
docker compose up -d
```

## Run backend

> This environment may not have the .NET SDK installed. Install .NET 8 SDK locally first.

```bash
cd backend/TripMaster.Api
dotnet run
```

API URL: `http://localhost:5024` (see `launchSettings.json`).

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`.

## Frontend API base URL

The frontend now reads the API base URL from `VITE_API_BASE_URL`.

Local example:

```bash
cd frontend
cp .env.example .env.local
```

Set:

```bash
VITE_API_BASE_URL=http://localhost:5024/api
```

If the variable is missing, the app falls back to `http://localhost:5024/api`.

## Deployed setup

The current production setup uses:

- `Vercel` for the frontend
- `Railway` for the ASP.NET API
- `Neon` for Postgres

In production, Vercel rewrites `/api/*` to the Railway backend, so the browser talks to the frontend and API through the same origin.
