-- Allow users to update their own loans (needed for repayment logic)
create policy "Users can update own loans" on loans 
for update using (auth.uid() = user_id);
