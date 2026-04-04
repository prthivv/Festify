CREATE TABLE IF NOT EXISTS Role (
  role_id   SERIAL PRIMARY KEY,
  role_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "User" (
  user_id       SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INT NOT NULL REFERENCES Role(role_id),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Event (
  event_id         SERIAL PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  description      TEXT,
  type             VARCHAR(10) NOT NULL CHECK (type IN ('individual', 'team')),
  max_participants INT NOT NULL CHECK (max_participants > 0),
  created_by       INT NOT NULL REFERENCES "User"(user_id),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Team (
  team_id    SERIAL PRIMARY KEY,
  team_name  VARCHAR(100) NOT NULL,
  event_id   INT NOT NULL REFERENCES Event(event_id) ON DELETE CASCADE,
  captain_id INT NOT NULL REFERENCES "User"(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, team_name)
);

CREATE TABLE IF NOT EXISTS TeamMember (
  team_id   INT REFERENCES Team(team_id) ON DELETE CASCADE,
  user_id   INT REFERENCES "User"(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS ParticipantRegistration (
  registration_id SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES "User"(user_id),
  event_id        INT NOT NULL REFERENCES Event(event_id) ON DELETE CASCADE,
  registered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS VolunteerAssignment (
  assignment_id    SERIAL PRIMARY KEY,
  volunteer_id     INT NOT NULL REFERENCES "User"(user_id),
  event_id         INT NOT NULL REFERENCES Event(event_id) ON DELETE CASCADE,
  task_description VARCHAR(255),
  assigned_by      INT NOT NULL REFERENCES "User"(user_id),
  assigned_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Sponsor (
  sponsor_id          SERIAL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  contact_info        VARCHAR(200),
  contribution_amount DECIMAL(10, 2) DEFAULT 0.00 CHECK (contribution_amount >= 0)
);

CREATE TABLE IF NOT EXISTS EventSponsor (
  event_id   INT REFERENCES Event(event_id) ON DELETE CASCADE,
  sponsor_id INT REFERENCES Sponsor(sponsor_id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, sponsor_id)
);

CREATE TABLE IF NOT EXISTS Budget (
  budget_id        SERIAL PRIMARY KEY,
  event_id         INT NOT NULL UNIQUE REFERENCES Event(event_id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10, 2) NOT NULL CHECK (allocated_amount >= 0),
  remaining_amount DECIMAL(10, 2) NOT NULL CHECK (remaining_amount >= 0),
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Expense (
  expense_id   SERIAL PRIMARY KEY,
  budget_id    INT NOT NULL REFERENCES Budget(budget_id) ON DELETE CASCADE,
  amount       DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description  TEXT,
  expense_date DATE NOT NULL,
  recorded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Schedule (
  schedule_id INT PRIMARY KEY,
  event_id    INT NOT NULL UNIQUE REFERENCES Event(event_id) ON DELETE CASCADE,
  venue       VARCHAR(100) NOT NULL,
  start_time  TIMESTAMP NOT NULL,
  end_time    TIMESTAMP NOT NULL CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS Result (
  result_id      SERIAL PRIMARY KEY,
  event_id       INT NOT NULL UNIQUE REFERENCES Event(event_id) ON DELETE CASCADE,
  winner_details TEXT NOT NULL,
  published_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_by   INT NOT NULL REFERENCES "User"(user_id)
);
