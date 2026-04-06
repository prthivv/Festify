const express = require("express");
const db = require("../db");
const { isLoggedIn, attachOptionalUser } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");
const { getEventById, getManageableEvent } = require("../utils/eventAccess");

const router = express.Router();

router.get(
  "/",
  attachOptionalUser,
  asyncHandler(async (req, res) => {
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
         COALESCE(v.volunteer_count, 0) AS volunteer_count,
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
       LEFT JOIN (
         SELECT event_id, COUNT(*)::INT AS volunteer_count
         FROM VolunteerAssignment
         GROUP BY event_id
       ) v ON v.event_id = e.event_id
       LEFT JOIN Schedule s ON s.event_id = e.event_id
       LEFT JOIN Result r ON r.event_id = e.event_id
       ORDER BY s.start_time NULLS LAST, e.created_at DESC`
    );

    const events = result.rows.map((eventItem) => ({
      ...eventItem,
      volunteers: []
    }));

    const user = req.user;

    if (
      !user ||
      !["Admin", "Coordinator"].includes(user.role) ||
      events.length === 0
    ) {
      return res.json(events);
    }

    const manageableEventIds =
      user.role === "Coordinator"
        ? events
            .filter(
              (eventItem) => Number(eventItem.created_by) === Number(user.user_id)
            )
            .map((eventItem) => eventItem.event_id)
        : events.map((eventItem) => eventItem.event_id);

    if (manageableEventIds.length === 0) {
      return res.json(events);
    }

    const volunteerResult = await db.query(
      `SELECT
         va.assignment_id,
         va.event_id,
         va.task_description,
         va.assigned_at,
         volunteer.user_id AS volunteer_id,
         volunteer.name AS volunteer_name,
         volunteer.email AS volunteer_email,
         assigner.name AS assigned_by_name
       FROM VolunteerAssignment va
       JOIN "User" volunteer ON volunteer.user_id = va.volunteer_id
       JOIN "User" assigner ON assigner.user_id = va.assigned_by
       WHERE va.event_id = ANY($1::INT[])
       ORDER BY va.assigned_at DESC`,
      [manageableEventIds]
    );

    const volunteersByEvent = new Map();

    volunteerResult.rows.forEach((assignment) => {
      if (!volunteersByEvent.has(assignment.event_id)) {
        volunteersByEvent.set(assignment.event_id, []);
      }

      volunteersByEvent.get(assignment.event_id).push(assignment);
    });

    res.json(
      events.map((eventItem) => ({
        ...eventItem,
        volunteers: volunteersByEvent.get(eventItem.event_id) || []
      }))
    );
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
