-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Plans table
create table plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  interest_rate numeric not null, -- Percentage (e.g., 5.0 for 5%)
  duration_months integer not null,
  min_amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User Plans (subscriptions)
create table user_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  plan_id uuid references plans(id) on delete cascade not null,
  current_balance numeric default 0 not null,
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions table
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  plan_id uuid references plans(id), -- Nullable, links transaction to a specific plan
  amount numeric not null,
  charge numeric default 0,
  receipt_url text, -- Payment receipt URL
  type text not null check (type in ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'interest')),
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Loans table
create table loans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null,
  interest_rate numeric not null,
  total_payable numeric not null,
  duration_months integer not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'active', 'paid', 'defaulted')),
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies

-- Profiles: Users can view and edit their own profile
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Plans: Everyone can view plans, only admins can edit (assume admin setup later, for now public read)
alter table plans enable row level security;
create policy "Public can view plans" on plans for select using (true);

-- User Plans: Users can view their own plans
alter table user_plans enable row level security;
create policy "Users can view own plans" on user_plans for select using (auth.uid() = user_id);
create policy "Users can insert own plans" on user_plans for insert with check (auth.uid() = user_id);

-- Transactions: Users can view their own transactions
alter table transactions enable row level security;
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on transactions for insert with check (auth.uid() = user_id);

-- Loans: Users can view their own loans
alter table loans enable row level security;
create policy "Users can view own loans" on loans for select using (auth.uid() = user_id);
create policy "Users can insert own loans" on loans for insert with check (auth.uid() = user_id);

-- Function to handle new user signup (Trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed some initial plans
insert into plans (name, description, interest_rate, duration_months, min_amount) values
('Starter Saver', 'Perfect for beginners. Low commitment.', 5.0, 3, 1000),
('Growth Builder', 'Build your wealth with steady returns.', 8.5, 6, 5000),
('Wealth Accumulator', 'High returns for long-term savers.', 12.0, 12, 20000);
