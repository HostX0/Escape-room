# Deployment and test accounts

## Required infrastructure

Use a new, dedicated PostgreSQL database. Never use another application's database or customer records. This project needs the btree_gist extension. Neon with a pooled connection string or a suitably configured Supabase PostgreSQL connection can be used. Vercel-managed Neon organizations may require project creation from Vercel rather than the Neon API. Confirm the provider's organization and costs before provisioning.

## Vercel configuration

Import HostX0/Escape-room after the complete source is present, using the repository root, framework Other, Node.js 22. The root vercel.json defines the client build, Express function, routing and font installation. Do not set the root directory to client. Both the frontend and API use the same deployment origin.

Set DATABASE_URL to the dedicated database connection string, NODE_ENV=production, PG_POOL_MAX=2, JWT_SECRET and ADMIN_JWT_SECRET to two DIFFERENT cryptographically random strings of at least 48 characters. Set CORS_ORIGIN to the actual deployed origin. Never place these in the repository or frontend VITE_ variables. Generate signing secrets with node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" twice.

No API tokens, database passwords or application passwords are bundled. Database schema migrations are a deliberate separate action, not an automatic public request side effect.

## Initialize database

With the dedicated DATABASE_URL supplied locally, run:

```sh
npm ci --prefix escape-room-backend
npm run migrate --prefix escape-room-backend
```

Migration filenames and checksums are tracked; reruns skip applied migrations. Existing signed waiver PDFs require a separately reviewed private migration. Uploaded source storage and old .env files are deliberately excluded.

## New test accounts

Choose a fresh strong temporary password, at least 16 characters and no more than 72 UTF-8 bytes. Supply it privately as TEST_SEED_PASSWORD, and set TEST_DATABASE_CONFIRM=escape-room-test for the explicit seed operation:

```sh
npm run seed:test --prefix escape-room-backend
```

This creates test-manager (manager), test-agent (booking_agent), test-accountant (accountant), and the verified test customer +9647700000001. The three staff usernames manager, agent and accountant are removed by this operation. Other customer accounts are not deleted. The seed uses a password hash; no default reusable plaintext password is included. It creates a clearly named Demo Escape Room and seven days of sample schedules. Renew the schedules explicitly for later testing.

Remove TEST_SEED_PASSWORD and TEST_DATABASE_CONFIRM from the environment after seeding. Rotate test passwords and remove sample schedules before use with real customers.

## Registration and SMS/WhatsApp

Existing verified test customers can log in without a message provider. Public registration requires a working configured UltraMsg/WhatsApp provider, ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN. Without a provider the app returns a configuration error, not a fake successful verification. No real external verification messages were sent in this preparation.

## Release checks

Run frontend production build and tests with a real disposable PostgreSQL database. Verify health, customer and staff login, role restrictions, room schedules, booking/confirmation, overlapping requests, cancellation policy, price totals, payments and waiver generation/signing. Check both desktop and phone screens on the actual Vercel deployment. There is no claim of a successful production deployment until these steps and the deployment status are verified.

## Existing-database phone formats

The application now canonicalizes Iraqi mobile numbers (including Arabic digits and local 07 format) to +964 format. This package targets a fresh dedicated test database. Before importing an old customer database, audit duplicate phone aliases and normalize existing records in a separate reviewed migration; do not blindly merge accounts. Existing pending plaintext verification codes are invalidated by migration 007 and must be reissued. Verified customer status is preserved.
