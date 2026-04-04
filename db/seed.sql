BEGIN;

INSERT INTO Role (role_id, role_name)
VALUES
  (1, 'Admin'),
  (2, 'Coordinator'),
  (3, 'Participant'),
  (4, 'Volunteer')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO "User" (user_id, name, email, password_hash, role_id)
VALUES
  (
    1,
    'Aarav Sharma',
    'admin@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    1
  ),
  (
    2,
    'Rhea Menon',
    'coord.music@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    2
  ),
  (
    3,
    'Kabir Iyer',
    'coord.sports@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    2
  ),
  (
    4,
    'Ananya Gupta',
    'participant1@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    5,
    'Rahul Singh',
    'participant2@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    6,
    'Ishita Roy',
    'participant3@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    7,
    'Dev Patel',
    'participant4@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    8,
    'Nisha Verma',
    'participant5@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    9,
    'Arjun Das',
    'participant6@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    10,
    'Priya Kulkarni',
    'participant7@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    11,
    'Sanjay Nair',
    'participant8@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    12,
    'Meera Joshi',
    'participant9@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    13,
    'Kunal Bhat',
    'participant10@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    3
  ),
  (
    14,
    'Aisha Khan',
    'volunteer1@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    4
  ),
  (
    15,
    'Rohan Paul',
    'volunteer2@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    4
  ),
  (
    16,
    'Sneha Thomas',
    'volunteer3@cefms.edu',
    '$argon2id$v=19$m=65536,t=3,p=4$MIIRqgvgQbgj220jfp0MPA$YfwJSVjtjSU0zzV/P3S9nnQ/USre2wvJMjfCIjrTQbg',
    4
  )
ON CONFLICT (email) DO NOTHING;

INSERT INTO Event (
  event_id,
  name,
  description,
  type,
  max_participants,
  created_by
)
VALUES
  (
    1,
    'Solo Singing Contest',
    'A campus showcase for solo vocal performers.',
    'individual',
    50,
    2
  ),
  (
    2,
    'Photography Walk',
    'A themed outdoor photography challenge across campus.',
    'individual',
    30,
    2
  ),
  (
    3,
    'Hackathon',
    'A twelve-hour coding sprint for student teams.',
    'team',
    4,
    3
  ),
  (
    4,
    'Street Football',
    'Five-a-side street football tournament.',
    'team',
    8,
    3
  )
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO Team (team_id, team_name, event_id, captain_id)
VALUES
  (1, 'CodeCrafters', 3, 4),
  (2, 'Debug Dynasty', 3, 5),
  (3, 'ThunderKicks', 4, 6),
  (4, 'Campus Strikers', 4, 7)
ON CONFLICT (event_id, team_name) DO NOTHING;

INSERT INTO TeamMember (team_id, user_id)
VALUES
  (1, 4),
  (1, 8),
  (1, 9),
  (2, 5),
  (2, 10),
  (3, 6),
  (3, 11),
  (3, 12),
  (3, 13),
  (4, 7),
  (4, 8),
  (4, 9)
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO ParticipantRegistration (registration_id, user_id, event_id)
VALUES
  (1, 4, 1),
  (2, 5, 1),
  (3, 6, 1),
  (4, 7, 1),
  (5, 8, 2),
  (6, 9, 2),
  (7, 10, 2)
ON CONFLICT (user_id, event_id) DO NOTHING;

INSERT INTO VolunteerAssignment (
  assignment_id,
  volunteer_id,
  event_id,
  task_description,
  assigned_by
)
VALUES
  (1, 14, 1, 'Manage backstage artist check-ins.', 2),
  (2, 15, 3, 'Coordinate participant help desk and laptop tags.', 3),
  (3, 16, 4, 'Handle equipment distribution at the ground.', 3)
ON CONFLICT (assignment_id) DO NOTHING;

INSERT INTO Sponsor (sponsor_id, name, contact_info, contribution_amount)
VALUES
  (1, 'TechNova', 'technova@example.com | +91-9876543210', 50000.00),
  (2, 'BrewBarn', 'brewbarn@example.com | +91-9988776655', 30000.00)
ON CONFLICT (sponsor_id) DO NOTHING;

INSERT INTO EventSponsor (event_id, sponsor_id)
VALUES
  (1, 2),
  (3, 1),
  (4, 1)
ON CONFLICT (event_id, sponsor_id) DO NOTHING;

INSERT INTO Budget (budget_id, event_id, allocated_amount, remaining_amount)
VALUES
  (1, 1, 15000.00, 15000.00),
  (2, 2, 12000.00, 12000.00),
  (3, 3, 60000.00, 60000.00),
  (4, 4, 40000.00, 40000.00)
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO Expense (expense_id, budget_id, amount, description, expense_date)
VALUES
  (1, 1, 4000.00, 'Stage and sound rehearsal setup', '2026-03-10'),
  (2, 2, 1000.00, 'Photo walk marker printing', '2026-03-12'),
  (3, 3, 12000.00, 'Hackathon meal coupons and Wi-Fi backup', '2026-04-01'),
  (4, 4, 5000.00, 'Football bibs and medical kit', '2026-04-02')
ON CONFLICT (expense_id) DO NOTHING;

INSERT INTO Schedule (schedule_id, event_id, venue, start_time, end_time)
VALUES
  (1, 1, 'Main Auditorium', '2026-03-15 10:00:00', '2026-03-15 12:00:00'),
  (2, 2, 'North Lawn', '2026-03-16 09:00:00', '2026-03-16 11:00:00'),
  (3, 3, 'Innovation Lab', '2026-04-12 09:00:00', '2026-04-12 18:00:00'),
  (4, 4, 'Sports Ground', '2026-04-18 16:00:00', '2026-04-18 19:00:00')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO Result (result_id, event_id, winner_details, published_by)
VALUES
  (1, 1, 'Winner: Ananya Gupta', 2),
  (2, 2, 'Winner: Nisha Verma', 2)
ON CONFLICT (event_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('role', 'role_id'), COALESCE((SELECT MAX(role_id) FROM Role), 1), true);
SELECT setval(pg_get_serial_sequence('"User"', 'user_id'), COALESCE((SELECT MAX(user_id) FROM "User"), 1), true);
SELECT setval(pg_get_serial_sequence('event', 'event_id'), COALESCE((SELECT MAX(event_id) FROM Event), 1), true);
SELECT setval(pg_get_serial_sequence('team', 'team_id'), COALESCE((SELECT MAX(team_id) FROM Team), 1), true);
SELECT setval(pg_get_serial_sequence('participantregistration', 'registration_id'), COALESCE((SELECT MAX(registration_id) FROM ParticipantRegistration), 1), true);
SELECT setval(pg_get_serial_sequence('volunteerassignment', 'assignment_id'), COALESCE((SELECT MAX(assignment_id) FROM VolunteerAssignment), 1), true);
SELECT setval(pg_get_serial_sequence('sponsor', 'sponsor_id'), COALESCE((SELECT MAX(sponsor_id) FROM Sponsor), 1), true);
SELECT setval(pg_get_serial_sequence('budget', 'budget_id'), COALESCE((SELECT MAX(budget_id) FROM Budget), 1), true);
SELECT setval(pg_get_serial_sequence('expense', 'expense_id'), COALESCE((SELECT MAX(expense_id) FROM Expense), 1), true);
SELECT setval(pg_get_serial_sequence('result', 'result_id'), COALESCE((SELECT MAX(result_id) FROM Result), 1), true);

COMMIT;
