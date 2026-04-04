const express = require("express");
const db = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");
const { getEventById, getManageableEvent } = require("../utils/eventAccess");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await db.query(
      `SELECT
         r.result_id,
         r.event_id,
         e.name AS event_name,
         r.winner_details,
         r.published_at,
         u.name AS published_by_name
       FROM Result r
       JOIN Event e ON e.event_id = r.event_id
       JOIN "User" u ON u.user_id = r.published_by
       ORDER BY r.published_at DESC`
    );

    res.json(result.rows);
  })
);

router.post(
  "/",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.body.event_id, 10);
    const winnerDetails = req.body.winner_details;

    if (!Number.isInteger(eventId) || !winnerDetails) {
      return res.status(400).json({
        error: "event_id and winner_details are required."
      });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    const manageableEvent = await getManageableEvent(eventId, req.user);

    if (!manageableEvent) {
      return res.status(403).json({
        error: "You do not have permission to publish results for this event."
      });
    }

    const scheduleResult = await db.query(
      `SELECT end_time
       FROM Schedule
       WHERE event_id = $1`,
      [eventId]
    );

    if (scheduleResult.rowCount === 0) {
      return res.status(400).json({
        error: "Results can only be published after the event schedule is created."
      });
    }

    if (new Date(scheduleResult.rows[0].end_time) > new Date()) {
      return res.status(400).json({
        error: "Results can only be published after the scheduled end time."
      });
    }

    const result = await db.query(
      `INSERT INTO Result (event_id, winner_details, published_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id)
       DO UPDATE SET
         winner_details = EXCLUDED.winner_details,
         published_by = EXCLUDED.published_by,
         published_at = NOW()
       RETURNING *`,
      [eventId, winnerDetails, req.user.user_id]
    );

    res.status(201).json({
      message: "Result published successfully.",
      result: result.rows[0]
    });
  })
);

module.exports = router;
