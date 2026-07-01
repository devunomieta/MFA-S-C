# Agent Rules for Mary's Thrift Finance

## Database & Migrations
- **Immutable Migrations**: Never edit or delete old Supabase migration SQL files (`supabase/migrations/*.sql`) once they have been executed against the database. Treat them as strictly locked and read-only.
- **Append-Only Schema Changes**: If an existing Supabase function, table, or logic needs to be fixed or updated, ALWAYS generate a brand new migration file (using `npx supabase migration new <name>`) and add the `CREATE OR REPLACE` or `ALTER` script there.


## UI Stability
- **Do not modify Landing Page & User Dashboard**: Unless expressly asked to do so, leave the landing page and user dashboard intact. If there is a need to fix a logic or UI issue there, expressly explain it and ask for consent before making any changes.
