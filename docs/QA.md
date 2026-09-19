# Verification record

Prepared from the user's escape-room - Copy.zip on 2026-09-19. This is a repaired deployment candidate, not a certification that every feature or security scenario has been tested.

## Locally executed

- JavaScript syntax checks on backend src/scripts and api: passed.
- Client TypeScript project compilation: passed.
- Node test suite: 57 passed, 0 failed, 1 skipped (the PostgreSQL integration suite). The local HTTP smoke test stubs the database; it is not proof of a real database connection.

## Not yet verified in a live environment

- A clean Linux Vite production build and fresh npm installation.
- Real PostgreSQL migrations, concurrency, payments, seeds and PDF persistence (an opt-in integration suite is supplied).
- Cloud database provisioning, Vercel environment variables, deployment, URL, and real test-account login.
- Multi-branch staff access boundaries, WhatsApp delivery failures/retries, browser/device end-to-end acceptance, legal approval of waiver wording, old-database migration and security penetration testing.

## Changed behavior

Customer and staff authentication are separated; disabled staff accounts and current roles are checked against the database. Default seeded staff credentials are removed from the delivered source. Test seeding is opt-in and requires a private strong password. IDs, explicit-timezone dates, participants and image uploads receive stricter validation. Booking creation uses one transaction and a room lock, prices are snapshotted per person, and booking/payment totals are synchronized when participants are added. Cancelled/no-show bookings do not block room availability. Paid bookings cannot be changed/cancelled through customer self-service. Payment status transitions and audit recording are transactional.

The Express 5 catch-all is fixed; same-origin API configuration is used; uploaded theme images and generated waiver PDFs use PostgreSQL bytes rather than ephemeral serverless disk. Temporary render files are cleaned up, signatures are bounded and checked, and waiver text is snapshotted. The original Arabic waiver wording was not legally rewritten or approved.

## Evidence

Use `npm test --prefix escape-room-backend` for local unit/mocked checks. For disposable PostgreSQL integration, additionally set RUN_DB_TESTS=1 and DATABASE_URL and install build-time fonts with `npm run fonts --prefix escape-room-backend`. Tests create their own randomized ephemeral credentials. No cloud account credentials are provided as working until the actual seed/login steps have run successfully.
