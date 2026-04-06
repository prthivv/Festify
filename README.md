# CEFMS / Festify

Festify is a College Event & Fest Management System built with Express, PostgreSQL, and a React frontend served statically by the Node app. It supports role-based workflows for admins, coordinators, participants, and volunteers.

## Stack

- Backend: Node.js + Express
- Database: PostgreSQL 13+
- Frontend: HTML, CSS, React
- Auth: JWT + Argon2 password verification
- DB driver: `pg`

## Features

- JWT login with role-aware backend authorization
- Event creation, update, and deletion
- Individual event registration
- Team creation and joining for team events
- Schedule management with venue conflict checks
- Result publishing after scheduled event end
- Sponsor, volunteer, budget, and expense APIs

## Project Structure

```text
Festify/
├── app.js
├── db.js
├── package.json
├── .env.example
├── db/
│   ├── schema.sql
│   ├── triggers.sql
│   ├── indexes.sql
│   └── seed.sql
├── frontend/
│   ├── index.html
│   ├── app.jsx
│   └── styles.css
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
├── scripts/
│   └── rehash-seed-users.js
└── utils/
    ├── asyncHandler.js
    └── eventAccess.js
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL installed and running
- A PostgreSQL superuser account such as `postgres`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

Copy `.env.example` to `.env` and update the values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cefms_db
DB_USER=cefms_app
DB_PASSWORD=your_password
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
```

Generate a JWT secret if needed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the database

If the database does not exist yet:

```bash
sudo -u postgres psql -c "CREATE DATABASE cefms_db;"
```

### 4. Create the app database user

If you have not created `cefms_app` yet:

```bash
sudo -u postgres psql
```

Then run:

```sql
CREATE USER cefms_app WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cefms_db TO cefms_app;
\q
```

### 5. Apply schema, triggers, indexes, and seed data

Because many Linux PostgreSQL installs use peer auth for `postgres`, these commands are usually the safest:

```bash
sudo -u postgres psql -d cefms_db -f db/schema.sql
sudo -u postgres psql -d cefms_db -f db/triggers.sql
sudo -u postgres psql -d cefms_db -f db/indexes.sql
sudo -u postgres psql -d cefms_db -f db/seed.sql
```

### 6. Grant table/sequence permissions to the app user

```bash
sudo -u postgres psql -d cefms_db
```

Then run:

```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cefms_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cefms_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO cefms_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO cefms_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO cefms_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON FUNCTIONS TO cefms_app;
\q
```

### 7. Verify database access as the app user

Use `-h localhost` so PostgreSQL uses password auth instead of peer auth:

```bash
psql -h localhost -U cefms_app -d cefms_db
```

Useful checks once inside `psql`:

```sql
\dt
SELECT * FROM "User";
SELECT * FROM Event;
\q
```

## Run the App

Start the local server:

```bash
npm start
```

Then open:

```text
http://localhost:5000
```

The Express app serves:

- API routes under `/api/...`
- the React frontend from `frontend/`

## Demo Accounts

All seeded accounts use this password:

```text
correct horse battery staple
```

Useful logins:

- Admin: `admin@cefms.edu`
- Coordinators: `coord.music@cefms.edu`, `coord.sports@cefms.edu`
- Participants: `participant1@cefms.edu` through `participant10@cefms.edu`
- Volunteers: `volunteer1@cefms.edu` through `volunteer3@cefms.edu`

If you want to regenerate the stored Argon2 hashes locally:

```bash
node scripts/rehash-seed-users.js
```

## What To Test Locally

### Admin or Coordinator

- Sign in
- Create a new event
- Select an event and schedule it
- Publish a result for a completed event
- Delete an event you are allowed to manage

### Participant

- Register for an individual event
- Create a team for a team event
- Join an existing team

### Volunteer

- Sign in and confirm the dashboard remains read-only

## Common PostgreSQL Issues

### Peer authentication failed

If this fails:

```bash
psql -U cefms_app -d cefms_db
```

Use this instead:

```bash
psql -h localhost -U cefms_app -d cefms_db
```

### Permission denied for table `"User"`

That means the app user exists but does not have table/sequence privileges yet. Run the grant steps from the setup section again as `postgres`.

## API Summary

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `POST /api/events/:id/register`
- `GET /api/teams?event_id=<id>`
- `POST /api/teams`
- `POST /api/teams/:id/join`
- `GET /api/volunteers/me`
- `POST /api/volunteers/assign`
- `GET /api/sponsors`
- `POST /api/sponsors`
- `POST /api/sponsors/:id/link`
- `GET /api/budgets/:event_id`
- `POST /api/budgets/:event_id`
- `POST /api/expenses`
- `GET /api/schedule`
- `POST /api/schedule`
- `GET /api/results`
- `POST /api/results`

## Notes

- All SQL uses parameterized queries.
- Coordinators can manage events they created.
- `Schedule.schedule_id` is managed manually in route code to match the provided schema.
- The frontend is plain HTML/CSS + React delivered directly by Express.
