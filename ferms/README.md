# FERMS — Fire & Emergency Response Management System

FERMS is a full-stack PERN application (PostgreSQL · Express · React · Node) that lets citizens report fire and emergency incidents, enables dispatchers to assign and monitor response units in real-time on an interactive map, and gives firefighters and station managers a live dashboard to track resources, assignments, and incident status transitions — all with role-based access control and WebSocket-driven live updates.

## How to Run

**Server**
```bash
cd server
cp .env.example .env   # fill in your values
npm install
npm run migrate
npm run seed
npm run dev            # starts Express on PORT (default 4000)
```

**Client**
```bash
cd client
cp .env.example .env   # fill in your values
npm install
npm run dev            # starts Vite dev server on http://localhost:5173
```
