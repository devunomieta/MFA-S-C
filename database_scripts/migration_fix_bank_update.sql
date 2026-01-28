-- Allow users to update their own bank accounts
create policy "Users can update their own bank accounts"
  on bank_accounts for update
  using ( auth.uid() = user_id );
