-- Name History Table
create table if not exists name_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  old_name text not null,
  new_name text not null,
  changed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bank Account Requests Table (for restricted users)
create table if not exists bank_account_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table name_history enable row level security;
alter table bank_account_requests enable row level security;

-- Policies
create policy "Users can view their own name history"
  on name_history for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own name history"
  on name_history for insert
  with check ( auth.uid() = user_id );

create policy "Users can view their own requests"
  on bank_account_requests for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own requests"
  on bank_account_requests for insert
  with check ( auth.uid() = user_id );
