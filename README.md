# Event Monolith App

Robby Chungo     | 2410051    | BSE      | 2nd Year, 2nd Semester   | 

Chandi Chileshe  | 2410226    | BSE      | 2nd Year, 2nd Semester          
| John Mwando      | 2410053    | BSE
     | 2nd Year, 2nd Semester 

     
- Node 18+
- Docker (for local Postgres)

Run locally
1. Copy `.env.example` to `.env` and update values.
2. Start Postgres with Docker Compose:

```powershell
docker compose up -d
```

3. Deploy migrations and seed DB:

```powershell
npm run prisma:deploy
npm run seed
```

4. Start dev server:

```powershell
npm run dev
```

5. Run smoke test:

```powershell
npm run smoke
```

CI
The repository includes a GitHub Actions workflow that runs migrations, generates the Prisma client, seeds the DB, runs the TypeScript compiler, and executes the integration tests (Vitest).

Further work
- Convert legacy Express bits to Elysia handlers
- Add structured logging, monitoring, and production deployment config
ECHO is on.
