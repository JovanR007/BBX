-- Create store_applications table
create table if not exists public.store_applications (
    id uuid not null default gen_random_uuid(),
    user_id text not null references public.profiles(id), -- Changed to text to match profiles.id
    email text not null,
    store_name text not null,
    slug text,
    contact_number text not null,
    address text not null,
    status text not null default 'pending', -- pending, approved, rejected
    created_at timestamp with time zone not null default now(),
    
    constraint store_applications_pkey primary key (id)
);

-- RLS Policies
alter table public.store_applications enable row level security;

-- Users can insert their own applications
create policy "Users can create their own applications"
    on public.store_applications for insert
    to authenticated
    with check (auth.uid()::text = user_id);

-- Users can view their own applications
create policy "Users can view their own applications"
    on public.store_applications for select
    to authenticated
    using (auth.uid()::text = user_id);
