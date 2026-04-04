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
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const { volunteer_id, event_id, task_description } = req.body;
    const volunteerId = Number.parseInt(volunteer_id, 10);
    const eventId = Number.parseInt(event_id, 10);

    if (!Number.isInteger(volunteerId) || !Number.isInteger(eventId)) {
      return res.status(400).json({
        error: "Valid volunteer_id and event_id are required."
      });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    const manageableEvent = await getManageableEvent(eventId, req.user);

    if (!manageableEvent) {
      return res.status(403).json({
        error: "You do not have permission to assign volunteers for this event."
      });
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

    const assignmentResult = await db.query(
      `INSERT INTO VolunteerAssignment (
         volunteer_id,
         event_id,
         task_description,
         assigned_by
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [volunteerId, eventId, task_description || null, req.user.user_id]
    );

    res.status(201).json({
      message: "Volunteer assigned successfully.",
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
