const express = require("express");
const db = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  isLoggedIn,
  asyncHandler(async (_req, res) => {
    const result = await db.query(
      `SELECT
         s.sponsor_id,
         s.name,
         s.contact_info,
         s.contribution_amount,
         COALESCE(
           json_agg(
             json_build_object(
               'event_id', e.event_id,
               'event_name', e.name
             )
           ) FILTER (WHERE e.event_id IS NOT NULL),
           '[]'::json
         ) AS linked_events
       FROM Sponsor s
       LEFT JOIN EventSponsor es ON es.sponsor_id = s.sponsor_id
       LEFT JOIN Event e ON e.event_id = es.event_id
       GROUP BY s.sponsor_id
       ORDER BY s.name`
    );

    res.json(result.rows);
  })
);

router.post(
  "/",
  isLoggedIn,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const { name, contact_info, contribution_amount } = req.body;
    const contributionAmount =
      contribution_amount === undefined
        ? 0
        : Number.parseFloat(contribution_amount);

    if (!name) {
      return res.status(400).json({
        error: "Sponsor name is required."
      });
    }

    if (Number.isNaN(contributionAmount) || contributionAmount < 0) {
      return res.status(400).json({
        error: "contribution_amount must be a non-negative number."
      });
    }

    const result = await db.query(
      `INSERT INTO Sponsor (name, contact_info, contribution_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), contact_info || null, contributionAmount]
    );

    res.status(201).json({
      message: "Sponsor created successfully.",
      sponsor: result.rows[0]
    });
  })
);

router.post(
  "/:id/link",
  isLoggedIn,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const sponsorId = Number.parseInt(req.params.id, 10);
    const eventId = Number.parseInt(req.body.event_id, 10);

    if (!Number.isInteger(sponsorId) || !Number.isInteger(eventId)) {
      return res.status(400).json({
        error: "Valid sponsor and event ids are required."
      });
    }

    const sponsorResult = await db.query(
      `SELECT sponsor_id FROM Sponsor WHERE sponsor_id = $1`,
      [sponsorId]
    );
    const eventResult = await db.query(
      `SELECT event_id FROM Event WHERE event_id = $1`,
      [eventId]
    );

    if (sponsorResult.rowCount === 0) {
      return res.status(404).json({ error: "Sponsor not found." });
    }

    if (eventResult.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    try {
      await db.query(
        `INSERT INTO EventSponsor (event_id, sponsor_id)
         VALUES ($1, $2)`,
        [eventId, sponsorId]
      );
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "This sponsor is already linked to the selected event."
        });
      }

      throw error;
    }

    res.status(201).json({
      message: "Sponsor linked to event successfully."
    });
  })
);

module.exports = router;
