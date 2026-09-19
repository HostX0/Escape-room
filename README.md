# Switch Escape Room Iraq
React 19 + TypeScript/Vite client, Express 5 API, PostgreSQL database.

## Status
This source is prepared for deployment; a repository upload or passing tests are NOT evidence of a live deployment.
See `docs/DEPLOYMENT.md` and `docs/QA.md` for exact checks and remaining gates.

## Local use (Node 22)
1. `npm ci --prefix client && npm ci --prefix escape-room-backend`
2. Copy backend `.env.example` to `.env`; supply a dedicated database and two random signing secrets.
3. From `escape-room-backend`: `npm run fonts`, `npm run migrate`.
4. For TEST DATA ONLY, set the test-seed variables described in `STAFF_LOGIN.md`; run `npm run seed:test`.
5. Run backend `npm run dev` and client `npm run dev` in separate terminals.
6. Staff: `/staff/login`; customers: `/login`.

Never upload `.env`, runtime uploads, signatures, completed waivers, or node_modules.
The original source ZIP is retained separately and is not imported into the public repository.
