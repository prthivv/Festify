const express = require("express");
const { pool } = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
           s.schedule_id,
           s.event_id,
           e.name AS event_name,
           s.venue,
           s.start_time,
           s.end_time,
           CASE
             WHEN s.end_time < NOW() THEN 'completed'
             WHEN s.start_time > NOW() THEN 'upcoming'
             ELSE 'ongoing'
           END AS status
         FROM Schedule s
         JOIN Event e ON e.event_id = s.event_id
         ORDER BY s.start_time`
      );

      res.json(result.rows);
    } finally {
      client.release();
    }
  })
);

router.post(
  "/",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.body.event_id, 10);
    const { venue, start_time, end_time } = req.body;
    const parsedStart = new Date(start_time);
    const parsedEnd = new Date(end_time);

    if (!Number.isInteger(eventId) || !venue || Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({
        error: "event_id, venue, start_time, and end_time are required."
      });
    }

    if (parsedEnd <= parsedStart) {
      return res.status(400).json({
        error: "end_time must be later than start_time."
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const eventResult = await client.query(
        `SELECT event_id, name, created_by
         FROM Event
         WHERE event_id = $1
         FOR UPDATE`,
        [eventId]
      );

      const event = eventResult.rows[0];

      if (!event) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Event not found." });
      }

      if (req.user.role === "Coordinator" && event.created_by !== req.user.user_id) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "You do not have permission to schedule this event."
        });
      }

      const conflictResult = await client.query(
        `SELECT schedule_id, event_id
         FROM Schedule
         WHERE venue = $1
           AND event_id <> $2
           AND NOT ($3 <= start_time OR $4 >= end_time)
         LIMIT 1`,
        [venue.trim(), eventId, end_time, start_time]
      );

      if (conflictResult.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Venue conflict detected for the selected time range."
        });
      }

      const existingScheduleResult = await client.query(
        `SELECT schedule_id
         FROM Schedule
         WHERE event_id = $1
         FOR UPDATE`,
        [eventId]
      );

      let schedule;

      if (existingScheduleResult.rowCount > 0) {
        const updateResult = await client.query(
          `UPDATE Schedule
           SET venue = $2,
               start_time = $3,
               end_time = $4
           WHERE event_id = $1
           RETURNING *`,
          [eventId, venue.trim(), start_time, end_time]
        );

        schedule = updateResult.rows[0];
      } else {
        const nextIdResult = await client.query(
          `SELECT COALESCE(MAX(schedule_id), 0) + 1 AS next_id
           FROM Schedule`
        );

        const insertResult = await client.query(
          `INSERT INTO Schedule (schedule_id, event_id, venue, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [nextIdResult.rows[0].next_id, eventId, venue.trim(), start_time, end_time]
        );

        schedule = insertResult.rows[0];
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Schedule saved successfully.",
        schedule
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
