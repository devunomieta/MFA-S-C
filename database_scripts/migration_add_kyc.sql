-- Add KYC fields to profiles
alter table profiles 
add column if not exists gov_id_url text,
add column if not exists gov_id_status text default 'not_uploaded' check (gov_id_status in ('not_uploaded', 'pending', 'verified', 'rejected'));
