# IITR Delivery

A campus delivery web app for IIT Roorkee. Students sign in with their `@iitr.ac.in` email (password or Google), browse snacks, beverages, stationery, essentials and food, and place orders delivered to their bhawan room. Admins manage items, orders and users from an admin panel. All orders are **Cash on Delivery**.

| Part       | Tech                                                      |
| ---------- | --------------------------------------------------------- |
| Frontend   | React 18, Vite, TypeScript, React Router, Tailwind CSS v4 |
| Backend    | Node.js, Express 5, TypeScript                            |
| Database   | PostgreSQL 16 with Prisma ORM and migrations              |
| Auth       | Email + password (bcrypt), JWT in an httpOnly cookie      |
| Validation | Zod schemas shared by client and server (`shared/`)       |
| Tests      | Vitest + Supertest                                        |

## Features

**Accounts**
- **Sign-up and login:** register with an `@iitr.ac.in` email and password, choosing **"I want to order"** (student) or **"I want to deliver"** (delivery partner, needs admin approval). Admin can never be chosen at sign-up. There's also **sign in with Google** (`@iitr.ac.in` or `@gmail.com`), switched off until Google keys are added.
- **First Google sign-in:** the student completes their profile (enrollment number, bhawan, phone) before they can order. If the email already has an account, Google is linked to it.
- **Forgot password:** sends a single-use reset link that expires in 30 minutes. Resetting logs out every other session.
- **Emails:** welcome, order placed, every status change, cancellation, and password reset. They're sent in the background, so a mail failure never fails a request.

**Students**
- Browse the catalog with search and category filters
- Use a cart saved to their account
- Check out with delivery to their bhawan and room
- View order history with a status timeline
- Cancel an order while it is still *Placed*
- Reorder a past order at today's prices; anything that can't be added is listed with the reason

**Admins** (`/admin`)
- **Dashboard:** sales (orders and revenue for today, the last 7 days and this month, in IST, excluding cancelled orders), an alert for delivery partner requests waiting for approval, orders by status, recent orders, and a low-stock list. The low-stock threshold can be edited.
- **Items:** search and filter; add, edit, remove from sale, restore. Items are never hard-deleted, so past orders keep their history.
- **Orders:** filter by status, IST date range, bhawan or customer. The detail page shows customer contact info and the full status history, with buttons only for the allowed next statuses.
- **Users:** search, change role, block or unblock, and **approve or reject delivery partner requests**. Blocked users are logged out on their next request.

**Delivery partners** (`/delivery`)
- **New partners:** sign up, then wait for an admin to approve them. They see a "waiting for approval" screen until then.
- **Available orders:** orders an admin has **confirmed** that nobody has taken yet, oldest first. The list refreshes every 20 seconds.
- **Accepting:** the order is assigned to that partner. It **disappears for every other partner** immediately, and the student's name and phone are revealed. If two partners accept at the same moment, exactly one gets it.
- **Delivering:** **Picked up** (status becomes *Out for delivery*), then **Mark delivered** (status becomes *Delivered*). The student sees who is delivering, with their phone number.
- **History:** completed deliveries, the delivered count and the cash collected (all orders are Cash on Delivery).

### Roles

| Role               | Lands on    | Can use                               |
| ------------------ | ----------- | ------------------------------------- |
| `STUDENT`          | `/`         | Catalog, cart, checkout, own orders   |
| `ADMIN`            | `/admin`    | Admin panel (no shopping)             |
| `DELIVERY_PARTNER` | `/delivery` | Delivery dashboard once approved (no shopping) |

The server enforces every one of these rules on every request. The UI hiding buttons is only a convenience.

The user's role and blocked status are read from the database on each request, so changes take effect immediately, even for someone who is already logged in.

### Google sign-in setup

The "Sign in with Google" button only appears once these are set in `server/.env`.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, enter an app name (e.g. *IITR Delivery*) and your email, and add the scopes `openid`, `email` and `profile`. While the app is in **Testing**, add your own Google accounts under **Test users**: only they can sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - **Authorized redirect URIs:** `http://localhost:5173/api/auth/google/callback`. It must match `GOOGLE_CALLBACK_URL` exactly.
   - Authorized JavaScript origins aren't needed (the sign-in runs on the server).
4. Copy the **Client ID** and **Client secret** into `server/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart `npm run dev`.

**How it works:**
- The server runs the OAuth code flow with `google-auth-library`. A random `state` in a short-lived httpOnly cookie protects against cross-site forgery.
- The server verifies the ID token, then checks that `email_verified` is true and the domain is allowed.
- It then logs the user in, links an existing account with the same email, or creates a new student.

### Email setup

- **Development:** with `SMTP_HOST` empty, the server creates a free [Ethereal](https://ethereal.email) test inbox. Nothing is actually delivered; the server console prints a preview link for every email:
  `[mail] "Order #AB12CD34 placed" → riya@iitr.ac.in | preview: https://ethereal.email/message/...`
- **Mailtrap:** set `SMTP_HOST=sandbox.smtp.mailtrap.io`, `SMTP_PORT=2525`, and `SMTP_USER`/`SMTP_PASS` from your Mailtrap inbox.
- **Real SMTP:** fill in the `SMTP_*` values (and `SMTP_SECURE=true` for port 465) plus `MAIL_FROM`.
- **Tests:** never send anything; emails are captured in memory.

### Order status rules

```
PLACED ──► CONFIRMED ──► OUT_FOR_DELIVERY ──► DELIVERED
  │            │
  └────────────┴──► CANCELLED
```

- **Invalid changes:** any other change is rejected with `400`.
- **Students:** can cancel only their own orders, and only while *Placed*.
- **Cancelling:** works the same for a student or an admin. In one transaction it restores stock, writes the status-history entry, and changes the status.
- **Concurrent changes:** a status change only succeeds if the order is still in the status it was read in. If a student cancels while an admin confirms, exactly one of them wins.

## Project structure

```
delivery_system/
├── client/                    React app (Vite dev server on :5173, proxies /api to :4000)
│   └── src/
│       ├── api/               fetch wrapper (sends the auth cookie, normalises errors)
│       ├── context/           AuthContext, CartContext
│       ├── components/        Navbar, route guards, Modal/ConfirmDialog, StatusTimeline, Pagination…
│       ├── hooks/             useApi, useOrder, useReorder, useDebounced
│       └── pages/             student pages, admin/ (dashboard, items, orders, users), delivery/
├── server/                    Express API (:4000)
│   ├── prisma/                schema.prisma, migrations/, seed.ts
│   ├── scripts/db.ts          embedded Postgres 16 for local dev (no Docker needed)
│   ├── src/
│   │   ├── config/env.ts      validates .env at startup
│   │   ├── middleware/        requireAuth, requireRole, error handler, rate limit
│   │   ├── routes/            auth, items, cart, orders, admin/
│   │   └── services/          cart, order placement, orderStatus (transitions), reorder, settings
│   └── tests/                 API tests
├── shared/                    bhawans, categories, roles, status transitions, Zod schemas, API types
└── docker-compose.yml         Postgres 16 container (alternative to the embedded one)
```

To change the bhawan list, item categories or the allowed status changes, edit [`shared/src/config.ts`](shared/src/config.ts).

## Prerequisites

- **Node.js 20 or newer** (developed on Node 23) and npm
- **PostgreSQL 16**, via one of:
  - nothing extra: `npm run db` downloads and runs an embedded Postgres 16 inside the project, or
  - **Docker**: `docker compose up -d`

## Setup

```bash
# 1. Install all workspaces (client, server, shared)
npm install

# 2. Create the server config and set your own JWT_SECRET in it
cp server/.env.example server/.env

# 3. Start Postgres. Pick ONE and leave it running in its own terminal:
npm run db                 # embedded Postgres 16 (creates both databases on first run)
# docker compose up -d     # or Docker

# 4. Create the tables and load sample data
cd server
npx prisma migrate deploy
npx prisma db seed
cd ..
```

## Run the app

With Postgres running:

```bash
npm run dev
```

This starts the API on http://localhost:4000 and the web app on **http://localhost:5173**. Open the web app.

### Test logins

| Role             | Email                 | Password        | Set by                   |
| ---------------- | --------------------- | --------------- | ------------------------ |
| Student          | `test@iitr.ac.in`     | `Test@1234`     | `SEED_TEST_PASSWORD`     |
| Student          | `riya@iitr.ac.in`     | `Test@1234`     | `SEED_TEST_PASSWORD`     |
| Admin            | `admin@iitr.ac.in`    | `Admin@1234`    | `SEED_ADMIN_PASSWORD`    |
| Delivery partner | `delivery@iitr.ac.in` | `Delivery@1234` | `SEED_DELIVERY_PASSWORD` |
| Partner awaiting approval | `kabir@iitr.ac.in` | `Delivery@1234` | `SEED_DELIVERY_PASSWORD` |

**What the seed adds:**
- these 5 accounts (Kabir's partner request is pending, so you can try approving it)
- 27 items, a few of them low on stock
- 7 demo orders in every status, with history (shown as `#SEED0001` to `#SEED0007`). Arjun has delivered two of them and is delivering a third, and two confirmed orders are waiting for a partner.

**Running the seed again** resets item prices and stock, plus the demo accounts' passwords, roles and blocked flags. It never duplicates or changes the demo orders.

## Run the tests

With Postgres running:

```bash
npm test
```

Tests use a separate database (`TEST_DATABASE_URL`, `iitr_delivery_test`). It is migrated automatically and wiped between tests, so your dev data is never touched.

They cover 123 cases:
- **Auth:** registration rules, login and logout, blocked users (can't log in, and an existing session is cut off on its next request).
- **Google sign-in (Google itself is stubbed):**
  - New accounts must complete their profile before ordering.
  - Linking to an existing account, and a Gmail account being accepted.
  - Rejections: other or lookalike domains, unverified email, blocked users, a mismatched `state` (CSRF), a user cancelling, and Google errors.
  - The button is hidden when Google isn't configured.
- **Password reset:**
  - The same response whether or not the email exists.
  - Only a hash of the token is stored.
  - The link works once, expires after 30 minutes, and is replaced by a newer request.
  - All sessions are revoked after a reset.
  - A Google-only account can set a password.
- **Emails:** the right email for each event, escaping of user-entered text, and API requests still succeeding when SMTP fails.
- **Delivery partners:**
  - Visibility: only confirmed, unassigned orders are listed. An accepted order disappears for everyone else, and a late accept returns 409. Two partners accepting at once: exactly one wins.
  - Delivering: pickup before delivery; a partner can't touch another partner's order; history records the partner.
  - Access: pending and rejected partners, students and admins are all refused.
- **Sign-up roles and sales:** sign-up defaults to student; a partner starts as pending; admin is never allowed. Admin approve/reject. Dashboard sales windows exclude cancelled orders.
- **Permissions:** every admin route returns 401 when logged out and 403 for students and delivery partners. Shopping routes return 403 for admins and delivery partners. A role change applies without logging in again.
- **Cart and orders:** server-side pricing, stock limits, the free-delivery threshold, price snapshots, rollback when an item is out of stock, and no overselling when two orders race.
- **Status changes:** every allowed change works and records history; every other one returns 400. Admin cancellation restores stock.
- **Student actions:**
  - Cancel: only while *Placed*, only their own order, never twice, and it's safe when racing an admin confirm.
  - Reorder: current prices, with reasons for skipped items, capped by stock.
  - Order isolation: a student can't read, cancel or reorder another student's order.
- **Admin:**
  - Item create/edit/soft-delete with validation.
  - Order filters, including IST date ranges and pagination.
  - User role/block, including an admin not being able to demote or block themselves.
  - The low-stock threshold.

## Environment variables (`server/.env`)

| Variable                 | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `PORT`                   | API port (default 4000)                                      |
| `DATABASE_URL`           | Postgres connection string for the app                       |
| `TEST_DATABASE_URL`      | Separate database used by `npm test`                         |
| `JWT_SECRET`             | Secret for signing session tokens. Use a long random string. |
| `CLIENT_URL`             | Frontend origin allowed by CORS                              |
| `SEED_TEST_PASSWORD`     | Password for the seeded students                             |
| `SEED_ADMIN_PASSWORD`    | Password for the seeded admin                                |
| `SEED_DELIVERY_PASSWORD` | Password for the seeded delivery partner                     |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID (optional: Google sign-in is off when empty) |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret                                   |
| `GOOGLE_CALLBACK_URL`    | Must match the redirect URI in Google Cloud. Default `CLIENT_URL` + `/api/auth/google/callback` |
| `SMTP_HOST`              | SMTP server. Empty in development = Ethereal test inbox      |
| `SMTP_PORT`, `SMTP_SECURE` | e.g. `587` + `false` (STARTTLS) or `465` + `true`          |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials                                             |
| `MAIL_FROM`              | Sender, e.g. `IITR Delivery <no-reply@example.com>`          |

## API

All responses are JSON. Errors are always `{ "error": "message" }` with a matching HTTP status: `400` invalid input or status change, `401` not logged in, `403` wrong role or blocked, `404` not found or not yours, `409` conflict. Money is returned as strings with 2 decimals (e.g. `"120.00"`).

**Auth**

| Method | Endpoint                     | Notes                                                   |
| ------ | ---------------------------- | ------------------------------------------------------- |
| GET    | `/api/auth/config`           | `{ googleEnabled }` (public)                            |
| POST   | `/api/auth/register`         | name, email, enrollmentNo, bhawan, phone, password (public) |
| POST   | `/api/auth/login`            | email, password (public)                                |
| GET    | `/api/auth/google`           | redirects to Google (public)                            |
| GET    | `/api/auth/google/callback`  | Google redirects here; then redirects to the app (public) |
| POST   | `/api/auth/forgot-password`  | `{ email }`; always the same response (public)          |
| POST   | `/api/auth/reset-password`   | `{ token, password }` (public)                          |
| POST   | `/api/auth/logout`           |                                                         |
| GET    | `/api/auth/me`               | includes `profileComplete`                              |
| PATCH  | `/api/auth/profile`          | `{ enrollmentNo, bhawan, phone }`                       |

Cart and order routes also return `403` until a Google sign-up has completed their profile. `POST /api/auth/register` also takes `role`: `STUDENT` (default) or `DELIVERY_PARTNER`. Partners start as `PENDING`.

**Delivery** (role `DELIVERY_PARTNER`, approved by an admin)

| Method | Endpoint                             | Notes                                                        |
| ------ | ------------------------------------ | ------------------------------------------------------------ |
| GET    | `/api/delivery/dashboard`            | `{ available, active, history, stats }`                      |
| POST   | `/api/delivery/orders/:id/accept`    | only `CONFIRMED` + unassigned; `409` if someone else got it  |
| POST   | `/api/delivery/orders/:id/pickup`    | your order: `CONFIRMED` → `OUT_FOR_DELIVERY`                 |
| POST   | `/api/delivery/orders/:id/deliver`   | your order: `OUT_FOR_DELIVERY` → `DELIVERED`                 |

**Shopping** (role `STUDENT`)

| Method | Endpoint                  | Notes                                             |
| ------ | ------------------------- | ------------------------------------------------- |
| GET    | `/api/items`              | query: `search`, `category`                       |
| GET    | `/api/cart`               |                                                   |
| POST   | `/api/cart`               | `{ itemId, quantity }`, adds to existing quantity |
| PATCH  | `/api/cart/:itemId`       | `{ quantity }`                                    |
| DELETE | `/api/cart/:itemId`       |                                                   |
| POST   | `/api/orders`             | `{ bhawan, roomNo, note? }`                       |
| GET    | `/api/orders`             | own orders, newest first                          |
| GET    | `/api/orders/:id`         | includes `statusHistory`; 404 if not yours        |
| POST   | `/api/orders/:id/cancel`  | only while `PLACED`                               |
| POST   | `/api/orders/:id/reorder` | returns `{ cart, added, skipped }`                |

**Admin** (role `ADMIN`)

| Method | Endpoint                       | Notes                                                        |
| ------ | ------------------------------ | ------------------------------------------------------------ |
| GET    | `/api/admin/dashboard`         | today's stats (IST), orders by status, low stock, recent     |
| GET    | `/api/admin/settings`          |                                                              |
| PATCH  | `/api/admin/settings`          | `{ lowStockThreshold }`                                      |
| GET    | `/api/admin/items`             | query: `search`, `category`, `status=all\|active\|inactive`, `lowStock=true` |
| POST   | `/api/admin/items`             | name, description, category, price (string), imageUrl, stock, isActive |
| PATCH  | `/api/admin/items/:id`         | any of the above; only the fields sent are changed           |
| DELETE | `/api/admin/items/:id`         | soft delete (`isActive = false`)                             |
| GET    | `/api/admin/orders`            | query: `status`, `from`, `to` (YYYY-MM-DD, IST), `bhawan`, `user`, `page` (20 per page) |
| GET    | `/api/admin/orders/:id`        | includes customer contact and status history                 |
| PATCH  | `/api/admin/orders/:id/status` | `{ status }`, validated against the rules above              |
| GET    | `/api/admin/users`             | query: `search`, `role`, `blocked`, `partnerStatus`, `page`  |
| PATCH  | `/api/admin/users/:id/role`    | `{ role }`; not on yourself                                  |
| PATCH  | `/api/admin/users/:id/block`   | `{ isBlocked }`; not on yourself                             |
| PATCH  | `/api/admin/users/:id/partner-status` | `{ status: APPROVED \| REJECTED }`; delivery partners only |

**Business rules**
- **Prices:** always computed on the server and stored as `Decimal(10,2)`, never floats.
- **Delivery fee:** a flat ₹20, free when the subtotal is above ₹300.
- **Placing an order:** one database transaction that lowers stock, creates the order with each item's price at that moment plus its first history entry, then clears the cart. If any item is short of stock, the whole thing rolls back.
- **Low stock:** an item counts as low stock when it is on sale and `stock ≤ lowStockThreshold` (default 5, editable by admins).

## Deploying

The whole app (website, API and database) deploys to **Vercel** as one project, with a free Neon Postgres database. Step-by-step instructions, the environment variables and how to seed production safely are in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Useful commands

```bash
npm run typecheck                       # type-check client and server
npm run build                           # production build of the client
npm run vercel-build                    # full Vercel build into .vercel/output (see DEPLOYMENT.md)
cd server && npx prisma studio          # browse the database in a GUI
cd server && npx prisma migrate dev     # create a migration after editing schema.prisma
```

## Known limitations

- **No delivery OTP, time slots or partner earnings yet** (planned for a later phase). Partners mark orders delivered themselves.
- **No live updates.** The partner dashboard refreshes every 20 seconds; real-time updates come in a later phase.
- **No way to reassign an order.** Once a partner accepts, only that partner (or an admin, via status changes or cancelling) can move it. If a partner is blocked mid-delivery, an admin has to finish or cancel their orders.
- **Google sign-in is switched off** until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; that's postponed to the end.
- **Payments are Cash on Delivery only.** There is no payment gateway, and none is planned until a later phase.
- **Item pictures are illustrated tiles** (an icon chosen from the item's name, on a colour for its category) unless an admin adds a photo URL. If a photo fails to load, the tile is shown instead. Icons use the device's emoji font, so they look slightly different on Windows, Android and iOS.
- **Password sign-up doesn't verify the email address.** Anyone who knows an `@iitr.ac.in` address can register with it. Google sign-in does verify (`email_verified`).
- **Emails are sent from memory, without a queue or retries.** A failed email is logged and dropped; anything still pending is lost if the server crashes (a normal shutdown waits for it).
- **Login error messages say whether an email is registered** ("No account found" vs "Incorrect password"), as the original spec asked. The forgot-password form does not reveal this.
- **Only emails ending exactly in `@iitr.ac.in` are accepted.** Department subdomains such as `@cs.iitr.ac.in` are rejected. Change `IITR_EMAIL_DOMAIN` in `shared/` if those need to work.
- **Every API request does one small database lookup** for the user's role and blocked status. That's how changes apply instantly, at the cost of one indexed query per request.
- **The rate limiter is in memory** (20 login/register attempts per 15 minutes per IP). It resets on restart and isn't shared across server instances.
- **History for orders placed before the roles migration** was backfilled: a *Placed* entry plus the current status if different. Both are timestamped at order creation and attributed to the order's owner, because the real actor wasn't recorded.
- **`npm audit` reports 3 high-severity issues**, all in `deepmerge-ts`, used only by the Prisma CLI's config loader (a dev tool, not part of the running API). Fixing them would mean downgrading Prisma.
- **`.npmrc` sets `legacy-peer-deps=true`** to work around an npm 10 crash (`Cannot read properties of null (reading 'edgesOut')`) when resolving vitest's optional peer dependencies.
