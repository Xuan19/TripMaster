# TripMaster

Starter full-stack project for trip planning:
- **Backend:** ASP.NET Core Web API (.NET 8) + Entity Framework Core
- **Frontend:** Vue 3 + Vite
- **Database:** SQL Server (Docker compose included)

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
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
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
