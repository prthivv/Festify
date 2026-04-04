# CEFMS / Festify

College Event & Fest Management System (CEFMS) is a full-stack, database-driven web application for managing college festivals end-to-end. This scaffold uses Node.js, Express, PostgreSQL, session-based authentication, and server-side role checks.

## Stack

- Backend: Node.js + Express
- Database: PostgreSQL 13+
- Frontend: EJS views, Bootstrap, vanilla JavaScript
- Auth: `express-session` + Argon2 password verification
- DB driver: `pg`

## Project Structure

```text
Festify/
├── app.js
├── db.js
├── package.json
├── .env
├── .env.example
├── db/
│   ├── schema.sql
│   ├── triggers.sql
│   ├── indexes.sql
│   └── seed.sql
├── middleware/
│   ├── auth.js
│   └── rbac.js
├── routes/
│   ├── auth.js
│   ├── events.js
│   ├── registrations.js
│   ├── teams.js
│   ├── volunteers.js
│   ├── sponsors.js
│   ├── budget.js
│   ├── schedule.js
│   └── results.js
├── public/
│   ├── app.js
│   └── styles.css
├── scripts/
│   └── rehash-seed-users.js
├── utils/
│   ├── asyncHandler.js
│   └── eventAccess.js
└── views/
    └── index.ejs
```

## Environment

Create a local `.env` file from `.env.example`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cefms_db
DB_USER=cefms_app
DB_PASSWORD=your_password
SECRET_KEY=replace_with_a_64_char_hex_secret
PORT=5000
```

To generate a fresh session secret once Node is installed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the database and apply SQL files:

```bash
psql -U postgres -c "CREATE DATABASE cefms_db;"
psql -U postgres -d cefms_db -f db/schema.sql
psql -U postgres -d cefms_db -f db/triggers.sql
psql -U postgres -d cefms_db -f db/indexes.sql
psql -U postgres -d cefms_db -f db/seed.sql
```

3. Start the server:

```bash
npm start
```

## Demo Accounts

The seeded accounts use the same demo password:

```text
correct horse battery staple
```

Primary logins:

- Admin: `admin@cefms.edu`
- Coordinators: `coord.music@cefms.edu`, `coord.sports@cefms.edu`
- Participants: `participant1@cefms.edu` through `participant10@cefms.edu`
- Volunteers: `volunteer1@cefms.edu` through `volunteer3@cefms.edu`

The seed file uses a known Argon2 demo hash so login works immediately. If you want unique hashes generated locally, run:

```bash
node scripts/rehash-seed-users.js
```

## API Overview

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET/POST /api/events`
- `PUT/DELETE /api/events/:id`
- `POST /api/events/:id/register`
- `POST /api/teams`
- `POST /api/teams/:id/join`
- `POST /api/volunteers/assign`
- `GET /api/volunteers/me`
- `GET/POST /api/sponsors`
- `POST /api/sponsors/:id/link`
- `GET/POST /api/budgets/:event_id`
- `POST /api/expenses`
- `GET/POST /api/schedule`
- `GET/POST /api/results`

## Notes

- All database access uses parameterized PostgreSQL queries.
- Coordinators are treated as managers of events they created, since the schema does not include a separate event-assignment table.
- `Schedule.schedule_id` follows the provided schema and is managed manually in route code.
