CREATE OR REPLACE FUNCTION fn_update_remaining_budget()
RETURNS TRIGGER AS $$
DECLARE
  curr_remaining DECIMAL(10, 2);
BEGIN
  SELECT remaining_amount
    INTO curr_remaining
    FROM Budget
   WHERE budget_id = NEW.budget_id;

  IF NEW.amount > curr_remaining THEN
    RAISE EXCEPTION 'Expense of % exceeds remaining budget of %', NEW.amount, curr_remaining;
  END IF;

  UPDATE Budget
     SET remaining_amount = remaining_amount - NEW.amount,
         updated_at = NOW()
   WHERE budget_id = NEW.budget_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_remaining_budget ON Expense;

CREATE TRIGGER trg_update_remaining_budget
  AFTER INSERT ON Expense
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_remaining_budget();
