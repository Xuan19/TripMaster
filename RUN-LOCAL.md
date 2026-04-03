# Run Locally

This is the default local development setup for TripMaster.

## Stack

- Frontend: Vite on `http://localhost:5173`
- Backend: ASP.NET API on `http://localhost:5024`
- Database: SQL Server in Docker on `localhost:1433`

## 1. Start SQL Server

From the repo root:

```bash
docker compose up -d sqlserver
```

## 2. Start the backend

```bash
cd backend/TripMaster.Api
dotnet run
```

The backend uses the local SQL Server connection string from `appsettings.json` by default.

## 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local` is already set to:

```bash
VITE_API_BASE_URL=http://localhost:5024/api
```

## Notes

- The frontend will call the backend over HTTP on port `5024`.
- If you later want HTTPS again for local development, generate and trust an ASP.NET development certificate with `dotnet dev-certs https --trust` and restore the HTTPS URLs.
- For cloud deployment, do not reuse `frontend/.env.local`; use environment variables in Vercel/Render instead.
