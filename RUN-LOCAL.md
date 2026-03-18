# Run Locally

This is the default local development setup for TripMaster.

## Stack

- Frontend: Vite on `http://localhost:5173`
- Backend: ASP.NET API on `https://localhost:7024`
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
VITE_API_BASE_URL=https://localhost:7024/api
```

## Notes

- If the backend certificate triggers browser warnings locally, trust the ASP.NET development certificate on your machine.
- The frontend will call the backend over HTTPS on port `7024`.
- For cloud deployment, do not reuse `frontend/.env.local`; use environment variables in Vercel/Render instead.
