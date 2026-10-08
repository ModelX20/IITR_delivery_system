# Campus Delivery System

A delivery system for our college campus: students place orders (canteen food, printouts, stationery, etc.) to be picked up from one place on campus and delivered to another (hostel room, library, department).

## Tech stack

| Part     | Tech                         | Folder      |
| -------- | ---------------------------- | ----------- |
| Frontend | React + Vite                 | `frontend/` |
| Backend  | Node.js + Express (REST API) | `backend/`  |
| Database | In-memory for now (see `backend/src/data/store.js`) | — |

## Project structure

```
delivery_system/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry point
│   │   ├── routes/orders.js   # /api/orders endpoints
│   │   └── data/store.js      # temporary in-memory data
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx            # main page: order form + orders table
    │   └── main.jsx
    ├── vite.config.js         # proxies /api to the backend
    └── package.json
```

## Getting started

Requires Node.js 20+.

Open two terminals.

**Terminal 1 — backend**

```bash
cd backend
npm install
cp .env.example .env   # first time only
npm run dev            # http://localhost:5000
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Open http://localhost:5173 in your browser.

## API

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| GET    | `/api/health`             | Health check         |
| GET    | `/api/orders`             | List all orders      |
| GET    | `/api/orders/:id`         | Get one order        |
| POST   | `/api/orders`             | Create an order      |
| PATCH  | `/api/orders/:id/status`  | Update order status  |

Order statuses: `pending`, `picked_up`, `delivered`, `cancelled`.

## Next steps

- [ ] Connect a real database (MongoDB or MySQL)
- [ ] User login with roles: student, delivery agent, admin
- [ ] Delivery agent dashboard to accept and update orders
- [ ] Order tracking page for students
- [ ] Notifications when an order's status changes
