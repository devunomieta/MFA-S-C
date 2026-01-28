create table if not exists bank_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table bank_accounts enable row level security;

-- Policies
create policy "Users can view their own bank accounts"
  on bank_accounts for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own bank accounts"
  on bank_accounts for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own bank accounts"
  on bank_accounts for delete
  using ( auth.uid() = user_id );
