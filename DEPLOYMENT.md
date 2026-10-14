# Deploying IITR Delivery to Vercel

The whole app runs as **one Vercel project**:

| Part | Where it runs |
| --- | --- |
| Website (React) | Vercel static hosting |
| API (Express) | One Vercel Function serving every `/api/*` request, on the same domain |
| Database (PostgreSQL) | [Neon](https://neon.tech), created from inside Vercel (free tier) |

Website and API share one domain, so the login cookie works exactly as it does locally, with no CORS setup.

`npm run vercel-build` (run by Vercel via [`vercel.json`](vercel.json)) does the following:
1. Generates the Prisma client, including the Linux engine Vercel needs.
2. Runs `prisma migrate deploy` against the database.
3. Builds the website.
4. Bundles the API into a function.

The script is [`scripts/vercel-build.mjs`](scripts/vercel-build.mjs).

## What you need

- A **GitHub** account with this repository (already done: `ModelX20/IITR_delivery_system`).
- A free **Vercel** account (Hobby plan, fine for a college project). Sign up at <https://vercel.com/signup> with **Continue with GitHub**.

You don't need to install anything locally to deploy. Steps 5 (seeding) and 6 use your local copy of the project.

## Step 1: Import the project

1. In Vercel, click **Add New… → Project**.
2. Under *Import Git Repository*, pick **IITR_delivery_system**. If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to that repository.
3. On the configure screen:
   - **Framework Preset:** `Other` (also set by `vercel.json`)
   - **Root Directory:** leave as `./`
   - **Build / Install commands:** leave them alone; `vercel.json` sets them.
4. **Don't click Deploy yet.** Open the **Environment Variables** section first (step 3). If you already deployed, that's fine: finish the steps and then **Redeploy**.

## Step 2: Create the database

1. In the project, open the **Storage** tab, then **Create Database → Neon (Serverless Postgres)**, then **Continue**.
2. Plan: **Free**.
3. Region: pick the one closest to your users, e.g. **Asia Pacific (Singapore)** or **Mumbai** if offered.
4. Connect it to the project for **all environments** (Production, Preview, Development).

Vercel then adds `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED` (direct, used for migrations) to the project automatically.

**Function region:** in **Settings → Functions → Function Region**, choose the region nearest your database, e.g. *Mumbai (bom1)* or *Singapore (sin1)*. A distant region makes every page slower.

## Step 3: Environment variables

**Settings → Environment Variables**, for all environments:

| Name | Value | Required |
| --- | --- | --- |
| `JWT_SECRET` | A long random string. Generate one locally: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | **Yes** |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Added by step 2. Don't type these yourself. | Yes (automatic) |
| `CLIENT_URL` | Your site URL, e.g. `https://iitr-delivery.vercel.app`. Set it if you add a custom domain; otherwise it defaults to the project's production domain. | Optional |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Real email delivery, e.g. a Gmail address with an [app password](https://support.google.com/accounts/answer/185833) (`smtp.gmail.com`, `465`, `true`), or a free [Brevo](https://www.brevo.com) SMTP account. **Without these, the site works but sends no emails, including password-reset emails.** | Optional |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google sign-in (postponed). The callback is `https://<your-domain>/api/auth/google/callback`. | Later |

`NODE_ENV` is set to `production` automatically. Don't set `DATABASE_URL` to the local `localhost` value.

## Step 4: Deploy

Click **Deploy** (or **Deployments → … → Redeploy**). The build log should show:

```
> npx prisma migrate deploy
All migrations have been successfully applied.
...
Vercel build output ready in .vercel/output
```

Every later `git push` to `main` deploys automatically. Migrations run on each deploy and do nothing if there's nothing new.

## Step 5: Add the starting data (once)

A new database has tables but no items or admin. Seed it **from your computer**, against the Neon database.

1. In Vercel, open **Storage → your Neon database → Quickstart / .env.local**. Copy the value of **`DATABASE_URL_UNPOOLED`**.
2. Choose **new, strong passwords**. The demo passwords in the README (`Admin@1234`, …) are public on GitHub, so anyone could log in as admin with them.
3. In PowerShell, in the project folder:

```powershell
cd server
$env:DATABASE_URL = "<paste DATABASE_URL_UNPOOLED here>"
$env:SEED_ADMIN_PASSWORD = "<strong admin password>"
$env:SEED_DELIVERY_PASSWORD = "<strong partner password>"
$env:SEED_TEST_PASSWORD = "<strong student password>"
npx prisma db seed
Remove-Item Env:DATABASE_URL, Env:SEED_ADMIN_PASSWORD, Env:SEED_DELIVERY_PASSWORD, Env:SEED_TEST_PASSWORD
```

This creates:
- the 27 items
- the demo accounts (`admin@iitr.ac.in`, `delivery@iitr.ac.in`, `kabir@iitr.ac.in`, `test@iitr.ac.in`, `riya@iitr.ac.in`) with the passwords you just chose
- a few demo orders

If you don't want demo students or orders on the real site, block or ignore them from the admin **Users** page.

## Step 6: Check it works

Open your site URL and check:
1. **Log in** as `admin@iitr.ac.in`; the dashboard loads.
2. **Register** a new student, add items to the cart and place an order.
3. As admin, **confirm** the order.
4. Log in as `delivery@iitr.ac.in`: **accept**, then **pick up**, then **deliver**.

Useful places in Vercel:
- **Deployments → (latest) → Build Logs:** build or migration errors.
- **Logs:** runtime errors from the API (`[mail] …` lines show emails sent or skipped).

## Notes and limits

- **Cold starts:** the first request after a quiet period can take 1–3 seconds while the function and database wake up (Neon's free tier sleeps when idle).
- **Login rate limit:** it is per function instance, so it's weaker on Vercel than on a single server.
- **Emails:** sent with `waitUntil` so they finish after the response. Without SMTP settings they are skipped and logged.
- **Node version:** the function runs on Node 22 (`NODE_RUNTIME` in `scripts/vercel-build.mjs`). If Vercel retires it, change that line.
- **Local development is unchanged:** `npm run db` + `npm run dev`. The Vercel build only runs on Vercel, or locally with `npm run vercel-build`, which writes to the git-ignored `.vercel/`.
