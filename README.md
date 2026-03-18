# TripMaster

Full-stack trip planning app:
- **Backend:** ASP.NET Core Web API (.NET 8) + Entity Framework Core
- **Frontend:** Vue 3 + Vite
- **Database:** local SQL Server for development, Postgres-ready for low-cost cloud deploys

## Project structure

- `backend/TripMaster.Api` - REST API with a `Trip` model and endpoints to list/create trips.
- `frontend` - Vue application with a form and trip list.
- `docker-compose.yml` - local SQL Server instance.
- `render.yaml` - Render web-service configuration for the backend.
- `frontend/vercel.json` - Vercel SPA rewrite config for the frontend.

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
VITE_API_BASE_URL=https://localhost:7024/api
```

If the variable is missing, the app falls back to `https://localhost:7024/api`.

## No-cost deployment path

Recommended setup:
- **Frontend:** Vercel Hobby
- **Backend:** Render free web service
- **Database:** Neon Postgres free tier

### Backend on Render

The backend supports either:
- local SQL Server via `ConnectionStrings__TripMasterDb`
- hosted Postgres via `DATABASE_URL`

For a free cloud deployment, prefer Postgres and set these environment variables in Render:

```text
ASPNETCORE_ENVIRONMENT=Production
DATABASE_URL=<your Neon Postgres connection string or postgres:// URL>
Frontend__AllowedOrigins__0=https://<your-vercel-app>.vercel.app
Jwt__Key=<a long random secret>
Jwt__Issuer=TripMaster.Api
Jwt__Audience=TripMaster.Web
```

`render.yaml` already points Render at `backend/TripMaster.Api/Dockerfile`.

### Frontend on Vercel

In Vercel, set:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api
```

`frontend/vercel.json` is included so Vue router deep links resolve to `index.html`.
