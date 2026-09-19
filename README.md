# Switch Escape Room Iraq

Complete React 19 / TypeScript / Vite frontend and Express 5 / PostgreSQL backend. The application source is on **main**.

## Live demo

- [Open the application](https://br-rough-hat-av3ranyb-escaperoom.compute.c-11.us-east-1.aws.neon.tech/)
- [Staff dashboard login](https://br-rough-hat-av3ranyb-escaperoom.compute.c-11.us-east-1.aws.neon.tech/staff/login)
- [Customer login](https://br-rough-hat-av3ranyb-escaperoom.compute.c-11.us-east-1.aws.neon.tech/login)

Deployed on the owner's existing **Neon Free** account using Neon Functions and a dedicated `escape_room` database on the `escape-room-live` branch. No paid subscription was activated. Free-tier usage/storage limits still apply; this is a demo deployment, not an unlimited-capacity or availability guarantee. Vercel configuration is retained as an optional alternative, but the live URL above is hosted by Neon, not Vercel.

## Verified on 19 September 2026

1. The production frontend build and real PostgreSQL integration tests passed in [runtime build 35449773830](https://github.com/HostX0/Escape-room/actions/runs/35449773830).
2. Public HTTPS checks passed for the homepage, JavaScript/CSS assets, both login pages and the themes API in [live smoke run 35449394251, attempt 2](https://github.com/HostX0/Escape-room/actions/runs/35449394251).
3. Desktop and mobile Chromium rendering, login forms, browser JavaScript errors and horizontal overflow checks passed in [browser run 35449804794, attempt 2](https://github.com/HostX0/Escape-room/actions/runs/35449804794). The first attempt identified a compressed-response forwarding issue; it was corrected before the successful retry.
4. **27 server-side HTTP checks against the actual deployed application's persistent database passed.** These include all four demo logins, role/ownership restrictions, legacy staff removal, management API reads, booking creation/history, conflict rejection, participant-price/payment consistency, confirmation, payment permissions/idempotency, paid-cancellation protection, unpaid cancellation and slot reuse, private PDF generation/download, and durable theme-image upload.

The one-shot deployment checks are disabled after verification. Their temporary bookings, images and theme were removed; real demo accounts and usable schedules remain. Browser checks cover public pages and forms, while authenticated business flows were exercised through HTTP on the deployed server. This does not claim exhaustive testing of every device or every business/security scenario.

## Demo data and access

Two branches (Mansour/Jadriya), six rooms, one active demo theme, and seven initial days of schedules were provisioned. The demo price is IQD 35,000 per participant and session duration is 60 minutes.

Staff usernames: `test-manager`, `test-agent`, `test-accountant`. Customer phone: `07700000001` (international `+9647700000001`). Their randomly generated passwords were delivered privately to the owner and are intentionally absent from this public repository. Legacy staff usernames `manager`, `agent`, and `accountant` are absent from the dedicated demo database.

**Registration limitation:** new-customer WhatsApp phone verification requires a configured messaging provider. No paid messaging integration is enabled. Registration correctly reports verification unavailability rather than pretending an OTP was delivered. Use the verified demo customer for booking tests. Contact details/content remain demo placeholders and need owner review before public business use.

## Project layout

- `client/`: bilingual Arabic RTL / English customer site and staff dashboard.
- `escape-room-backend/src/`: authentication, booking, payment, management and waiver APIs.
- `escape-room-backend/sql/`: tracked PostgreSQL migrations.
- `escape-room-backend/tests/`: unit and real-database integration tests.
- `escape-room-backend/edge-entry.mjs`: Node 24 request adapter, safe response forwarding and optional deployment verification.
- `scripts/neon-loader.mjs`: auditable deployment bootstrap; no embedded credentials.
- `scripts/package-runtime.mjs`: checksum-verified code-only deployment packaging.
- `api/server.js` and `vercel.json`: optional Vercel adapter.

## Local development

Use Node 22. Install with `npm ci --prefix client && npm ci --prefix escape-room-backend`. Copy backend `.env.example` to `.env` locally, configure a dedicated PostgreSQL database and two distinct random signing secrets. Run `npm run fonts --prefix escape-room-backend` and `npm run migrate --prefix escape-room-backend`. Start the client and backend with their respective `npm run dev` commands.

Never commit `.env`, database passwords, signing keys, signatures, completed waivers or customer uploads. The original ZIP is not published.

## Deployment maintenance

The live runtime is pinned to source commit `d7a069c1db2d78e36547966020e9474dd447db7e` and release `runtime-d7a069c1db2d78e36547966020e9474dd447db7e`, with SHA-256 `52d144654addd2ac9b2879a937748d6a6ffd363e8f4683ddf3633a939308da13`. Later documentation/CI-only commits do not change the live application.

To deploy application changes, run the **Publish verified runtime** workflow on the intended commit, verify its build/tests and release manifest, then update the function's `RUNTIME_URL` and `RUNTIME_SHA256` to the new release. Publishing GitHub source alone does not deploy it. Keep `RUN_DEPLOYMENT_CHECKS=0` for normal use. Never point the loader or migrations at an unrelated database. Credentials are generated on the server and kept out of GitHub and the browser bundle.
