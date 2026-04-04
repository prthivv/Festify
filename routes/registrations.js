const express = require("express");
const { pool } = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/:id/register",
  isLoggedIn,
  requireRole("Participant"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const eventResult = await client.query(
        `SELECT event_id, name, type, max_participants
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

      if (event.type !== "individual") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Only individual events support direct participant registration."
        });
      }

      const countResult = await client.query(
        `SELECT COUNT(*)::INT AS registration_count
         FROM ParticipantRegistration
         WHERE event_id = $1`,
        [eventId]
      );

      if (countResult.rows[0].registration_count >= event.max_participants) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Registration is closed because the event is already full."
        });
      }

      const insertResult = await client.query(
        `INSERT INTO ParticipantRegistration (user_id, event_id)
         VALUES ($1, $2)
         RETURNING *`,
        [req.user.user_id, eventId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Registration completed successfully.",
        registration: insertResult.rows[0]
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          error: "You are already registered for this event."
        });
      }

      throw error;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
