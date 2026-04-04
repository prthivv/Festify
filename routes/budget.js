const express = require("express");
const db = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");
const { getEventById, getManageableEvent } = require("../utils/eventAccess");

const router = express.Router();

router.get(
  "/budgets/:event_id",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.params.event_id, 10);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    const manageableEvent = await getManageableEvent(eventId, req.user);

    if (!manageableEvent) {
      return res.status(403).json({
        error: "You do not have permission to view this budget."
      });
    }

    const budgetResult = await db.query(
      `SELECT b.*, e.name AS event_name
       FROM Budget b
       JOIN Event e ON e.event_id = b.event_id
       WHERE b.event_id = $1`,
      [eventId]
    );

    if (budgetResult.rowCount === 0) {
      return res.status(404).json({ error: "Budget not found for this event." });
    }

    const budget = budgetResult.rows[0];
    const expensesResult = await db.query(
      `SELECT *
       FROM Expense
       WHERE budget_id = $1
       ORDER BY expense_date DESC, expense_id DESC`,
      [budget.budget_id]
    );

    res.json({
      budget,
      expenses: expensesResult.rows
    });
  })
);

router.post(
  "/budgets/:event_id",
  isLoggedIn,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const eventId = Number.parseInt(req.params.event_id, 10);
    const allocatedAmount = Number.parseFloat(req.body.allocated_amount);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    if (Number.isNaN(allocatedAmount) || allocatedAmount < 0) {
      return res.status(400).json({
        error: "allocated_amount must be a non-negative number."
      });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    const existingResult = await db.query(
      `SELECT * FROM Budget WHERE event_id = $1`,
      [eventId]
    );

    let budget;

    if (existingResult.rowCount === 0) {
      const insertResult = await db.query(
        `INSERT INTO Budget (event_id, allocated_amount, remaining_amount)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [eventId, allocatedAmount, allocatedAmount]
      );

      budget = insertResult.rows[0];
    } else {
      const existingBudget = existingResult.rows[0];
      const spentAmount =
        Number.parseFloat(existingBudget.allocated_amount) -
        Number.parseFloat(existingBudget.remaining_amount);

      if (allocatedAmount < spentAmount) {
        return res.status(400).json({
          error: `Allocated amount cannot be less than already spent amount (${spentAmount.toFixed(
            2
          )}).`
        });
      }

      const newRemainingAmount = allocatedAmount - spentAmount;
      const updateResult = await db.query(
        `UPDATE Budget
         SET allocated_amount = $2,
             remaining_amount = $3,
             updated_at = NOW()
         WHERE event_id = $1
         RETURNING *`,
        [eventId, allocatedAmount, newRemainingAmount]
      );

      budget = updateResult.rows[0];
    }

    res.status(201).json({
      message: "Budget saved successfully.",
      budget
    });
  })
);

router.post(
  "/expenses",
  isLoggedIn,
  requireRole("Admin", "Coordinator"),
  asyncHandler(async (req, res) => {
    const inputBudgetId =
      req.body.budget_id === undefined
        ? null
        : Number.parseInt(req.body.budget_id, 10);
    const inputEventId =
      req.body.event_id === undefined
        ? null
        : Number.parseInt(req.body.event_id, 10);
    const amount = Number.parseFloat(req.body.amount);
    const { description, expense_date } = req.body;

    if (Number.isNaN(amount) || amount <= 0 || !expense_date) {
      return res.status(400).json({
        error: "A positive amount and expense_date are required."
      });
    }

    if (inputBudgetId === null && inputEventId === null) {
      return res.status(400).json({
        error: "Provide either budget_id or event_id."
      });
    }

    if (
      (inputBudgetId !== null && !Number.isInteger(inputBudgetId)) ||
      (inputEventId !== null && !Number.isInteger(inputEventId))
    ) {
      return res.status(400).json({
        error: "budget_id and event_id must be valid integers."
      });
    }

    let budgetResult;

    if (inputBudgetId !== null) {
      budgetResult = await db.query(
        `SELECT b.*, e.name AS event_name
         FROM Budget b
         JOIN Event e ON e.event_id = b.event_id
         WHERE b.budget_id = $1`,
        [inputBudgetId]
      );
    } else {
      budgetResult = await db.query(
        `SELECT b.*, e.name AS event_name
         FROM Budget b
         JOIN Event e ON e.event_id = b.event_id
         WHERE b.event_id = $1`,
        [inputEventId]
      );
    }

    const budget = budgetResult.rows[0];

    if (!budget) {
      return res.status(404).json({
        error: "Budget not found."
      });
    }

    const manageableEvent = await getManageableEvent(budget.event_id, req.user);

    if (!manageableEvent) {
      return res.status(403).json({
        error: "You do not have permission to record expenses for this event."
      });
    }

    try {
      const expenseResult = await db.query(
        `INSERT INTO Expense (budget_id, amount, description, expense_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [budget.budget_id, amount, description || null, expense_date]
      );

      const refreshedBudgetResult = await db.query(
        `SELECT * FROM Budget WHERE budget_id = $1`,
        [budget.budget_id]
      );

      res.status(201).json({
        message: "Expense recorded successfully.",
        expense: expenseResult.rows[0],
        budget: refreshedBudgetResult.rows[0]
      });
    } catch (error) {
      if (error.code === "P0001") {
        return res.status(400).json({
          error: error.message
        });
      }

      throw error;
    }
  })
);

module.exports = router;
