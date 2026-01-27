-- Rename interest_rate to service_charge in plans table
alter table plans rename column interest_rate to service_charge;

-- Optional: Update description or data if needed, but for now we essentially treat the existing percentage values as charge percentages.
