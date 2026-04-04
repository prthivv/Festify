const db = require("../db");

async function getEventById(eventId) {
  const result = await db.query(
    `SELECT e.*, u.name AS creator_name
     FROM Event e
     JOIN "User" u ON u.user_id = e.created_by
     WHERE e.event_id = $1`,
    [eventId]
  );

  return result.rows[0] || null;
}

async function getManageableEvent(eventId, user) {
  if (user.role === "Admin") {
    return getEventById(eventId);
  }

  if (user.role === "Coordinator") {
    const result = await db.query(
      `SELECT e.*, u.name AS creator_name
       FROM Event e
       JOIN "User" u ON u.user_id = e.created_by
       WHERE e.event_id = $1 AND e.created_by = $2`,
      [eventId, user.user_id]
    );

    return result.rows[0] || null;
  }

  return null;
}

module.exports = {
  getEventById,
  getManageableEvent
};
