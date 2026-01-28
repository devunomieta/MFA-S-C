-- Add loan_number column for human-readable IDs
alter table loans
add column loan_number text;

-- Optional: Backfill existing loans (if any)
-- We can do this with a simple update or leave null for legacy
update loans set loan_number = 'LN-' || floor(random() * 89999 + 10000)::text where loan_number is null;
