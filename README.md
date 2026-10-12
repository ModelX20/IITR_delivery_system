# IITR Delivery

A campus delivery web app for IIT Roorkee. Students log in with their `@iitr.ac.in` email, browse snacks, beverages, stationery, essentials and food, add them to a cart, and place orders delivered to their bhawan room.

| Part     | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, React Router, Tailwind CSS v4   |
| Backend  | Node.js, Express 5, TypeScript                              |
| Database | PostgreSQL 16 with Prisma ORM and migrations                |
| Auth     | Email + password (bcrypt), JWT in an httpOnly cookie        |
| Validation | Zod schemas shared by client and server (`shared/`)       |
| Tests    | Vitest + Supertest                                          |

## Project structure

```
delivery_system/
├── client/                 React app (Vite dev server on :5173, proxies /api to :4000)
│   └── src/
│       ├── api/            fetch wrapper (sends the auth cookie, normalises errors)
│       ├── context/        AuthContext, CartContext
│       ├── components/     Navbar, ItemCard, QuantityStepper, StatusBadge, route guards…
│       └── pages/          Login, Register, Catalog, Cart, Orders, OrderDetail, OrderConfirmation
├── server/                 Express API (:4000)
│   ├── prisma/             schema.prisma, migrations/, seed.ts
│   ├── scripts/db.ts       embedded Postgres 16 for local dev (no Docker needed)
│   ├── src/
│   │   ├── config/env.ts   validates .env at startup
│   │   ├── middleware/     auth, error handler, rate limit
│   │   ├── routes/         auth, items, cart, orders
│   │   └── services/       cart + order logic (order placement transaction)
│   └── tests/              API tests
├── shared/                 bhawan/category lists, Zod schemas, API types (used by both sides)
└── docker-compose.yml      Postgres 16 container (alternative to the embedded one)
```

To change the bhawan dropdown or item categories, edit [`shared/src/config.ts`](shared/src/config.ts).

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

### Test login

| Email             | Password    |
| ----------------- | ----------- |
| `test@iitr.ac.in` | `Test@1234` |

The password comes from `SEED_TEST_PASSWORD` in `server/.env`. Change it there and re-run `npx prisma db seed` to update it.

Running the seed again also resets every item's price and stock to the seed values.

## Run the tests

With Postgres running:

```bash
npm test
```

Tests use a separate database (`TEST_DATABASE_URL`, `iitr_delivery_test`). It is migrated automatically and wiped between tests, so your dev data is never touched.

They cover:
- registering, including rejecting non-IITR and lookalike emails, short passwords and duplicate emails
- logging in and out, and rejecting requests without a valid token
- adding to the cart, including server-side pricing, stock limits and the free-delivery threshold
- placing an order, including price snapshots, rolling back when an item is out of stock, and never overselling when two orders race for the last unit
- order history, including that one user can't read another user's order

## Environment variables (`server/.env`)

| Variable             | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `PORT`               | API port (default 4000)                                       |
| `DATABASE_URL`       | Postgres connection string for the app                        |
| `TEST_DATABASE_URL`  | Separate database used by `npm test`                          |
| `JWT_SECRET`         | Secret for signing session tokens. Use a long random string. |
| `CLIENT_URL`         | Frontend origin allowed by CORS                               |
| `SEED_TEST_PASSWORD` | Password for the seeded `test@iitr.ac.in` user                |

## API

All responses are JSON. Errors are always `{ "error": "message" }` with a matching HTTP status. Every route except register and login requires the auth cookie. Money is returned as strings with 2 decimals (e.g. `"120.00"`).

| Method | Endpoint                | Body                              |
| ------ | ----------------------- | --------------------------------- |
| POST   | `/api/auth/register`    | name, email, enrollmentNo, bhawan, phone, password |
| POST   | `/api/auth/login`       | email, password                   |
| POST   | `/api/auth/logout`      |                                   |
| GET    | `/api/auth/me`          |                                   |
| GET    | `/api/items`            | query: `search`, `category`       |
| GET    | `/api/cart`             |                                   |
| POST   | `/api/cart`             | `{ itemId, quantity }`, adds to the existing quantity |
| PATCH  | `/api/cart/:itemId`     | `{ quantity }`                    |
| DELETE | `/api/cart/:itemId`     |                                   |
| POST   | `/api/orders`           | `{ bhawan, roomNo, note? }`       |
| GET    | `/api/orders`           |                                   |
| GET    | `/api/orders/:id`       | returns 404 for another user's order |

Business rules:
- Prices are always computed on the server, stored as `Decimal(10,2)`, never floats.
- Delivery is a flat ₹20, free when the subtotal is above ₹300.
- Placing an order is one database transaction: lower the stock, create the order with a snapshot of each item's price, then clear the cart. If any item is short of stock, the whole thing rolls back.

## Useful commands

```bash
npm run typecheck                       # type-check client, server and shared
npm run build                           # production build of the client
cd server && npx prisma studio          # browse the database in a GUI
cd server && npx prisma migrate dev     # create a migration after editing schema.prisma
```

## Known limitations

- **No admin or delivery-staff interface yet.** Order status can only be changed in the database (e.g. with Prisma Studio). New orders stay `PLACED`.
- **Placeholder product images** from placehold.co, so they need an internet connection.
- **No password reset or email verification.** Anyone who knows an `@iitr.ac.in` address can register with it.
- **Login error messages say whether an email is registered** ("No account found" vs "Incorrect password"), as the spec asked. Use one generic message if you'd rather not reveal which emails have accounts.
- **Only emails ending exactly in `@iitr.ac.in` are accepted.** Department subdomains such as `@cs.iitr.ac.in` are rejected. Change `IITR_EMAIL_DOMAIN` / the email schema in `shared/` if those need to work.
- **The rate limiter is in memory** (20 login/register attempts per 15 minutes per IP). It resets on restart and isn't shared across server instances.
- **`npm audit` reports 3 high-severity issues**, all in `deepmerge-ts`, used only by the Prisma CLI's config loader (a dev tool, not part of the running API). Fixing them would mean downgrading Prisma.
- **`.npmrc` sets `legacy-peer-deps=true`** to work around an npm 10 crash (`Cannot read properties of null (reading 'edgesOut')`) when resolving vitest's optional peer dependencies.
