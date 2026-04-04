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
         e.event_id,
         e.name,
         e.description,
         e.type,
         e.max_participants,
         e.created_by,
         e.created_at,
         u.name AS creator_name,
         COALESCE(pr.registration_count, 0) AS individual_registrations,
         COALESCE(t.team_count, 0) AS team_count,
         s.venue,
         s.start_time,
         s.end_time,
         r.winner_details
       FROM Event e
       JOIN "User" u ON u.user_id = e.created_by
       LEFT JOIN (
         SELECT event_id, COUNT(*)::INT AS registration_count
         FROM ParticipantRegistration
         GROUP BY event_id
       ) pr ON pr.event_id = e.event_id
       LEFT JOIN (
         SELECT event_id, COUNT(*)::INT AS team_count
         FROM Team
         GROUP BY event_id
       ) t ON t.event_id = e.event_id
       LEFT JOIN Schedule s ON s.event_id = e.event_id
       LEFT JOIN Result r ON r.event_id = e.event_id
       ORDER BY s.start_time NULLS LAST, e.created_at DESC`
    );

    res.json(result.rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    res.json(event);
  })
);

router.post(
  "/",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const { name, description, type, max_participants } = req.body;
    const normalizedType = String(type || "").trim().toLowerCase();
    const maxParticipants = Number.parseInt(max_participants, 10);

    if (!name || !["individual", "team"].includes(normalizedType)) {
      return res.status(400).json({
        error: "Name and a valid event type are required."
      });
    }

    if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
      return res.status(400).json({
        error: "max_participants must be a positive integer."
      });
    }

    const result = await db.query(
      `INSERT INTO Event (name, description, type, max_participants, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), description || null, normalizedType, maxParticipants, req.user.user_id]
    );

    res.status(201).json({
      message: "Event created successfully.",
      event: result.rows[0]
    });
  })
);

router.put(
  "/:id",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.params.id, 10);
    const { name, description, type, max_participants } = req.body;
    const normalizedType =
      type === undefined ? undefined : String(type).trim().toLowerCase();
    const maxParticipants =
      max_participants === undefined
        ? undefined
        : Number.parseInt(max_participants, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const existingEvent = await getEventById(eventId);

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found." });
    }

    const manageableEvent = await getManageableEvent(eventId, req.user);

    if (!manageableEvent) {
      return res.status(403).json({
        error: "You do not have permission to update this event."
      });
    }

    if (
      normalizedType !== undefined &&
      !["individual", "team"].includes(normalizedType)
    ) {
      return res.status(400).json({
        error: "type must be either individual or team."
      });
    }

    if (
      maxParticipants !== undefined &&
      (!Number.isInteger(maxParticipants) || maxParticipants <= 0)
    ) {
      return res.status(400).json({
        error: "max_participants must be a positive integer."
      });
    }

    const result = await db.query(
      `UPDATE Event
       SET name = $2,
           description = $3,
           type = $4,
           max_participants = $5
       WHERE event_id = $1
       RETURNING *`,
      [
        eventId,
        name ? name.trim() : existingEvent.name,
        description !== undefined ? description : existingEvent.description,
        normalizedType || existingEvent.type,
        maxParticipants || existingEvent.max_participants
      ]
    );

    res.json({
      message: "Event updated successfully.",
      event: result.rows[0]
    });
  })
);

router.delete(
  "/:id",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const existingEvent = await getEventById(eventId);

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found." });
    }

    const manageableEvent = await getManageableEvent(eventId, req.user);

    if (!manageableEvent) {
      return res.status(403).json({
        error: "You do not have permission to delete this event."
      });
    }

    await db.query("DELETE FROM Event WHERE event_id = $1", [eventId]);

    res.json({
      message: "Event deleted successfully."
    });
  })
);

module.exports = router;
