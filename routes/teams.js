const express = require("express");
const db = require("../db");
const { pool } = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const eventId =
      req.query.event_id === undefined
        ? null
        : Number.parseInt(req.query.event_id, 10);

    if (req.query.event_id !== undefined && !Number.isInteger(eventId)) {
      return res.status(400).json({
        error: "event_id must be a valid integer."
      });
    }

    const result = await db.query(
      `SELECT
         t.team_id,
         t.team_name,
         t.event_id,
         t.captain_id,
         captain.name AS captain_name,
         e.max_participants,
         COUNT(tm.user_id)::INT AS member_count
       FROM Team t
       JOIN "User" captain ON captain.user_id = t.captain_id
       JOIN Event e ON e.event_id = t.event_id
       LEFT JOIN TeamMember tm ON tm.team_id = t.team_id
       WHERE ($1::INT IS NULL OR t.event_id = $1)
       GROUP BY
         t.team_id,
         t.team_name,
         t.event_id,
         t.captain_id,
         captain.name,
         e.max_participants
       ORDER BY t.created_at DESC, t.team_name`,
      [eventId]
    );

    res.json(result.rows);
  })
);

router.post(
  "/",
  isLoggedIn,
  requireRole("Participant"),
  asyncHandler(async (req, res) => {
    const { team_name, event_id } = req.body;
    const eventId = Number.parseInt(event_id, 10);

    if (!team_name || !Number.isInteger(eventId)) {
      return res.status(400).json({
        error: "team_name and a valid event_id are required."
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const eventResult = await client.query(
        `SELECT event_id, name, type
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

      if (event.type !== "team") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Teams can only be created for team events."
        });
      }

      const existingMembership = await client.query(
        `SELECT 1
         FROM TeamMember tm
         JOIN Team t ON t.team_id = tm.team_id
         WHERE tm.user_id = $1 AND t.event_id = $2`,
        [req.user.user_id, eventId]
      );

      if (existingMembership.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "You are already part of a team for this event."
        });
      }

      const teamResult = await client.query(
        `INSERT INTO Team (team_name, event_id, captain_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [team_name.trim(), eventId, req.user.user_id]
      );

      await client.query(
        `INSERT INTO TeamMember (team_id, user_id)
         VALUES ($1, $2)`,
        [teamResult.rows[0].team_id, req.user.user_id]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Team created successfully.",
        team: teamResult.rows[0]
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          error: "A team with that name already exists for this event."
        });
      }

      throw error;
    } finally {
      client.release();
    }
  })
);

router.post(
  "/:id/join",
  isLoggedIn,
  requireRole("Participant"),
  asyncHandler(async (req, res) => {
    const teamId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(teamId)) {
      return res.status(400).json({ error: "Invalid team id." });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const teamResult = await client.query(
        `SELECT
           t.team_id,
           t.team_name,
           t.event_id,
           e.name AS event_name,
           e.max_participants
         FROM Team t
         JOIN Event e ON e.event_id = t.event_id
         WHERE t.team_id = $1
         FOR UPDATE OF t`,
        [teamId]
      );

      const team = teamResult.rows[0];

      if (!team) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Team not found." });
      }

      const existingMembership = await client.query(
        `SELECT 1
         FROM TeamMember tm
         JOIN Team t ON t.team_id = tm.team_id
         WHERE tm.user_id = $1 AND t.event_id = $2`,
        [req.user.user_id, team.event_id]
      );

      if (existingMembership.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "You are already part of a team for this event."
        });
      }

      const memberCountResult = await client.query(
        `SELECT COUNT(*)::INT AS member_count
         FROM TeamMember
         WHERE team_id = $1`,
        [teamId]
      );

      if (memberCountResult.rows[0].member_count >= team.max_participants) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "This team is already full."
        });
      }

      await client.query(
        `INSERT INTO TeamMember (team_id, user_id)
         VALUES ($1, $2)`,
        [teamId, req.user.user_id]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Joined team successfully."
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          error: "You are already part of this team."
        });
      }

      throw error;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
