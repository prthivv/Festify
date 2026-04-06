const express = require("express");
const db = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");
const { getEventById, getManageableEvent } = require("../utils/eventAccess");

const router = express.Router();

router.post(
  "/assign",
  isLoggedIn,
  requireRole("Admin", "Coordinator", "Volunteer"),
  asyncHandler(async (req, res) => {
    const { volunteer_id, event_id, task_description } = req.body;
    const eventId = Number.parseInt(event_id, 10);
    const volunteerId =
      req.user.role === "Volunteer"
        ? req.user.user_id
        : Number.parseInt(volunteer_id, 10);

    if (!Number.isInteger(volunteerId) || !Number.isInteger(eventId)) {
      return res.status(400).json({
        error: "Valid volunteer_id and event_id are required."
      });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    if (req.user.role !== "Volunteer") {
      const manageableEvent = await getManageableEvent(eventId, req.user);

      if (!manageableEvent) {
        return res.status(403).json({
          error: "You do not have permission to assign volunteers for this event."
        });
      }
    }

    const volunteerResult = await db.query(
      `SELECT u.user_id, u.name
       FROM "User" u
       JOIN Role r ON r.role_id = u.role_id
       WHERE u.user_id = $1 AND r.role_name = 'Volunteer'`,
      [volunteerId]
    );

    if (volunteerResult.rowCount === 0) {
      return res.status(400).json({
        error: "The selected user is not a volunteer."
      });
    }

    const existingAssignmentResult = await db.query(
      `SELECT assignment_id
       FROM VolunteerAssignment
       WHERE volunteer_id = $1 AND event_id = $2
       LIMIT 1`,
      [volunteerId, eventId]
    );

    if (existingAssignmentResult.rowCount > 0) {
      return res.status(409).json({
        error:
          req.user.role === "Volunteer"
            ? "You have already registered as a volunteer for this event."
            : "This volunteer is already assigned to the selected event."
      });
    }

    const volunteerCountResult = await db.query(
      `SELECT COUNT(*)::INT AS volunteer_count
       FROM VolunteerAssignment
       WHERE event_id = $1`,
      [eventId]
    );

    if (volunteerCountResult.rows[0].volunteer_count >= 5) {
      return res.status(400).json({
        error:
          req.user.role === "Volunteer"
            ? "You can't register as a volunteer for this event because it already has 5 volunteers."
            : "This event already has 5 volunteers."
      });
    }

    const assignmentResult = await db.query(
      `INSERT INTO VolunteerAssignment (
         volunteer_id,
         event_id,
         task_description,
         assigned_by
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        volunteerId,
        eventId,
        req.user.role === "Volunteer"
          ? "Self-selected volunteer"
          : task_description || null,
        req.user.user_id
      ]
    );

    res.status(201).json({
      message:
        req.user.role === "Volunteer"
          ? "Volunteer registration completed successfully."
          : "Volunteer assigned successfully.",
      assignment: assignmentResult.rows[0]
    });
  })
);

router.get(
  "/me",
  isLoggedIn,
  requireRole("Volunteer"),
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT
         va.assignment_id,
         va.task_description,
         va.assigned_at,
         e.event_id,
         e.name AS event_name,
         s.venue,
         s.start_time,
         s.end_time,
         u.name AS assigned_by_name
       FROM VolunteerAssignment va
       JOIN Event e ON e.event_id = va.event_id
       LEFT JOIN Schedule s ON s.event_id = e.event_id
       JOIN "User" u ON u.user_id = va.assigned_by
       WHERE va.volunteer_id = $1
       ORDER BY s.start_time NULLS LAST, va.assigned_at DESC`,
      [req.user.user_id]
    );

    res.json(result.rows);
  })
);

module.exports = router;
