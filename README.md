# Switch Escape Room Iraq

Complete React 19 / TypeScript / Vite frontend and Express 5 / PostgreSQL backend. The application source is on **main**, not only on a preparation branch.

## Project layout

- `client/`: bilingual Arabic RTL / English customer site and staff dashboard.
- `escape-room-backend/src/`: authentication, booking, payment, management and waiver APIs.
- `escape-room-backend/sql/`: tracked PostgreSQL schema migrations.
- `escape-room-backend/tests/`: unit and real-database integration tests.
- `api/server.js` and `vercel.json`: optional Vercel deployment adapter.
- `escape-room-backend/edge-entry.mjs`: alternate Node 24 serverless HTTP adapter.

## Verification

The complete source passed a clean Linux production build and the opt-in PostgreSQL integration suite in [GitHub Actions run 35448385088](https://github.com/HostX0/Escape-room/actions/runs/35448385088). Tests cover test-account authentication, removal of legacy seeded staff accounts, booking conflicts, ownership, pricing, participants, cancellation, duplicate payments and PDF persistence. This is not a claim that every browser/device or security scenario has been tested.

## Run locally

Use Node 22. Install with `npm ci --prefix client && npm ci --prefix escape-room-backend`. Copy backend `.env.example` to `.env` locally, provide a dedicated PostgreSQL database and two distinct random signing secrets. Run `npm run fonts --prefix escape-room-backend`, then `npm run migrate --prefix escape-room-backend`. Start each application's `npm run dev` command in separate terminals.

Staff login: `/staff/login`. Customer login: `/login`.

## Test accounts and secrets

There are no default passwords in the repository. `npm run seed:test` requires explicit confirmation and a strong private password; see `escape-room-backend/STAFF_LOGIN.md`. Never commit `.env`, database URLs, signing keys, signatures or customer uploads. The original ZIP is not published.

New-customer WhatsApp verification requires an independently configured messaging provider. The app must not claim an OTP was delivered when no provider is configured. Provisioned test customers do not require SMS to log in.

## Hosting status

Source upload and test success do not imply a live deployment. The alternative free-tier deployment is being verified; a live URL is only recorded after real HTTP checks succeed. No paid hosting subscription is required by the source code.
