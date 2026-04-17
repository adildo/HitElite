-- =============================================
-- HIT ELITE — Full Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'customer' check (role in ('admin','manager','coach','staff','customer')),
  avatar_url text,
  address_json jsonb default '{}',
  date_of_birth date,
  emergency_contact_json jsonb default '{}',
  referral_source text,
  custom_fields_json jsonb default '{}',
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins read all profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','manager','staff'))
);
create policy "Admins manage profiles" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','manager'))
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- LOCATIONS
-- =============================================
create table locations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  surface_type text default 'hard_court' check (surface_type in ('hard_court','clay','grass','sport_tile','indoor','outdoor')),
  is_indoor boolean default false,
  capacity int,
  amenities text[] default '{}',
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table locations enable row level security;
create policy "Anyone can read active locations" on locations for select using (is_active = true);
create policy "Admins manage locations" on locations for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- TAGS
-- =============================================
create table tags (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  color text default '#D4A843',
  type text default 'customer' check (type in ('customer','class','staff','appointment','membership','product')),
  is_badge boolean default false,
  badge_label text,
  badge_color text,
  badge_text_color text,
  created_at timestamptz default now()
);

alter table tags enable row level security;
create policy "Anyone can read tags" on tags for select using (true);
create policy "Admins manage tags" on tags for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- Tag assignments
create table tag_assignments (
  id uuid default uuid_generate_v4() primary key,
  tag_id uuid references tags(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  assigned_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(tag_id, entity_type, entity_id)
);

alter table tag_assignments enable row level security;
create policy "Admins manage tag assignments" on tag_assignments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','staff'))
);
create policy "Anyone can read tag assignments" on tag_assignments for select using (true);

-- =============================================
-- STAFF (extends profiles for coaches/staff)
-- =============================================
create table staff (
  id uuid references profiles(id) on delete cascade primary key,
  bio text,
  specialties text[] default '{}',
  default_pay_rate numeric(10,2) default 0,
  pay_rate_type text default 'per_session' check (pay_rate_type in ('per_session','hourly','percentage')),
  calendar_sync_token text,
  calendar_sync_type text check (calendar_sync_type in ('google','apple',null)),
  availability_json jsonb default '{}',
  show_in_directory boolean default true,
  booking_approval_required boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table staff enable row level security;
create policy "Anyone can read active staff" on staff for select using (is_active = true);
create policy "Staff can update own record" on staff for update using (auth.uid() = id);
create policy "Admins manage staff" on staff for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- SERVICE CATEGORIES
-- =============================================
create table service_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  display_order int default 0,
  created_at timestamptz default now()
);

alter table service_categories enable row level security;
create policy "Anyone can read categories" on service_categories for select using (true);
create policy "Admins manage categories" on service_categories for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- ADD-ONS
-- =============================================
create table addons (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric(10,2) default 0,
  duration_added_mins int default 0,
  max_qty int default 1,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table addons enable row level security;
create policy "Anyone can read active addons" on addons for select using (is_active = true);
create policy "Admins manage addons" on addons for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- APPOINTMENT SERVICES
-- =============================================
create table services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  category_id uuid references service_categories(id),
  color text default '#D4A843',
  duration_mins int not null default 60,
  buffer_before_mins int default 0,
  buffer_after_mins int default 0,
  max_customers int default 1,
  price numeric(10,2) default 0,
  price_per_customer boolean default false,
  payment_mode text default 'full' check (payment_mode in ('full','deposit','card_on_file','free')),
  deposit_amount numeric(10,2),
  coach_id uuid references profiles(id),
  secondary_coach_id uuid references profiles(id),
  visibility text default 'public' check (visibility in ('public','private','staff_only')),
  booking_mode text default 'instant' check (booking_mode in ('instant','request')),
  requires_two_coaches boolean default false,
  assign_all_coaches boolean default false,
  assign_all_locations boolean default true,
  booking_conditions jsonb default '{}',
  addon_ids uuid[] default '{}',
  tag_ids uuid[] default '{}',
  custom_questions jsonb default '[]',
  court_reservation_required boolean default false,
  default_court_cost numeric(10,2),
  zoom_link boolean default false,
  staff_commission boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table services enable row level security;
create policy "Anyone can read active public services" on services for select using (is_active = true and visibility = 'public');
create policy "Admins read all services" on services for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','coach','staff'))
);
create policy "Admins manage services" on services for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- APPOINTMENTS
-- =============================================
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  service_id uuid references services(id),
  customer_id uuid references profiles(id),
  coach_id uuid references profiles(id),
  location_id uuid references locations(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid','partial','refunded')),
  amount_paid numeric(10,2) default 0,
  total_amount numeric(10,2) default 0,
  addons_json jsonb default '[]',
  intake_answers_json jsonb default '{}',
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  court_cost numeric(10,2) default 0,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table appointments enable row level security;
create policy "Customers read own appointments" on appointments for select using (auth.uid() = customer_id);
create policy "Coaches read own appointments" on appointments for select using (auth.uid() = coach_id);
create policy "Admins read all appointments" on appointments for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','staff'))
);
create policy "Customers create appointments" on appointments for insert with check (auth.uid() = customer_id);
create policy "Admins manage appointments" on appointments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','staff'))
);
create policy "Coaches update own appointments" on appointments for update using (auth.uid() = coach_id);

-- =============================================
-- CLASSES
-- =============================================
create table classes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  type text default 'single' check (type in ('single','cohort')),
  color text default '#D4A843',
  capacity int default 10,
  waitlist_size int default 0,
  duration_mins int default 60,
  primary_coach_id uuid references profiles(id),
  additional_coach_ids uuid[] default '{}',
  location_id uuid references locations(id),
  tags uuid[] default '{}',
  visibility text default 'public' check (visibility in ('public','private','internal')),
  payment_mode text default 'full' check (payment_mode in ('full','deposit','free')),
  price numeric(10,2) default 0,
  price_per_session boolean default false,
  custom_questions jsonb default '[]',
  court_reservation_required boolean default false,
  default_court_cost numeric(10,2),
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table classes enable row level security;
create policy "Anyone can read public classes" on classes for select using (visibility = 'public' and is_active = true);
create policy "Admins read all classes" on classes for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','coach','staff'))
);
create policy "Admins manage classes" on classes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- CLASS SESSIONS
-- =============================================
create table class_sessions (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  enrolled_count int default 0,
  coach_id uuid references profiles(id),
  location_id uuid references locations(id),
  notes text,
  court_cost numeric(10,2) default 0,
  created_at timestamptz default now()
);

alter table class_sessions enable row level security;
create policy "Anyone can read class sessions" on class_sessions for select using (true);
create policy "Admins manage class sessions" on class_sessions for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','coach','staff'))
);

-- =============================================
-- ENROLLMENTS (class bookings)
-- =============================================
create table enrollments (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id),
  session_id uuid references class_sessions(id),
  customer_id uuid references profiles(id),
  status text default 'enrolled' check (status in ('enrolled','waitlist','cancelled','completed','no_show')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid','partial','refunded','free')),
  amount_paid numeric(10,2) default 0,
  intake_answers_json jsonb default '{}',
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

alter table enrollments enable row level security;
create policy "Customers read own enrollments" on enrollments for select using (auth.uid() = customer_id);
create policy "Admins read all enrollments" on enrollments for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','coach','staff'))
);
create policy "Customers create enrollments" on enrollments for insert with check (auth.uid() = customer_id);
create policy "Admins manage enrollments" on enrollments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','staff'))
);

-- =============================================
-- PAYMENTS
-- =============================================
create table payments (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references profiles(id),
  ref_type text check (ref_type in ('appointment','enrollment','package','gift_card','credit')),
  ref_id uuid,
  amount numeric(10,2) not null,
  currency text default 'usd',
  status text default 'pending' check (status in ('pending','succeeded','failed','refunded','partially_refunded')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  payment_method text,
  description text,
  metadata_json jsonb default '{}',
  created_at timestamptz default now()
);

alter table payments enable row level security;
create policy "Customers read own payments" on payments for select using (auth.uid() = customer_id);
create policy "Admins read all payments" on payments for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);
create policy "Admins manage payments" on payments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- DISCOUNT CODES
-- =============================================
create table discount_codes (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  type text default 'percentage' check (type in ('percentage','fixed')),
  value numeric(10,2) not null,
  max_uses int,
  per_customer_limit int default 1,
  uses_count int default 0,
  expires_at timestamptz,
  min_booking_value numeric(10,2) default 0,
  applicable_to text default 'all' check (applicable_to in ('all','classes','appointments','first_booking')),
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table discount_codes enable row level security;
create policy "Admins manage discount codes" on discount_codes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- SESSION FEEDBACK (coach → student)
-- =============================================
create table session_feedback (
  id uuid default uuid_generate_v4() primary key,
  appointment_id uuid references appointments(id),
  session_id uuid references class_sessions(id),
  coach_id uuid references profiles(id),
  customer_id uuid references profiles(id),
  strengths text[] default '{}',
  focus_areas text[] default '{}',
  coach_notes text,
  notes_visibility text default 'shared' check (notes_visibility in ('shared','private')),
  next_goal text,
  rating int check (rating >= 1 and rating <= 5),
  created_at timestamptz default now()
);

alter table session_feedback enable row level security;
create policy "Coaches read own feedback" on session_feedback for select using (auth.uid() = coach_id);
create policy "Customers read own shared feedback" on session_feedback for select using (
  auth.uid() = customer_id and notes_visibility = 'shared'
);
create policy "Coaches create feedback" on session_feedback for insert with check (auth.uid() = coach_id);
create policy "Admins read all feedback" on session_feedback for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- COACH NOTES (admin notes about customers)
-- =============================================
create table coach_notes (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references profiles(id),
  coach_id uuid references profiles(id),
  content text not null,
  is_private boolean default false,
  created_at timestamptz default now()
);

alter table coach_notes enable row level security;
create policy "Admins manage coach notes" on coach_notes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','coach'))
);
create policy "Coaches read own notes" on coach_notes for select using (auth.uid() = coach_id);

-- =============================================
-- WAITLIST
-- =============================================
create table waitlist (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('class','appointment')),
  ref_id uuid not null,
  customer_id uuid references profiles(id),
  position int,
  status text default 'waiting' check (status in ('waiting','notified','converted','expired','removed')),
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;
create policy "Customers read own waitlist" on waitlist for select using (auth.uid() = customer_id);
create policy "Admins manage waitlist" on waitlist for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','staff'))
);

-- =============================================
-- TASKS
-- =============================================
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  title text not null,
  description text,
  due_date date,
  priority text default 'medium' check (priority in ('low','medium','high')),
  status text default 'open' check (status in ('open','in_progress','complete')),
  ref_type text,
  ref_id uuid,
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Staff read assigned tasks" on tasks for select using (auth.uid() = assigned_to or auth.uid() = created_by);
create policy "Admins manage tasks" on tasks for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- LEADS
-- =============================================
create table leads (
  id uuid default uuid_generate_v4() primary key,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  stage text default 'new' check (stage in ('new','contacted','demo_booked','converted','lost')),
  notes text,
  converted_customer_id uuid references profiles(id),
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table leads enable row level security;
create policy "Admins manage leads" on leads for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager','staff'))
);

-- =============================================
-- PAYOUT RECORDS
-- =============================================
create table payout_records (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references profiles(id),
  period_start date not null,
  period_end date not null,
  sessions_count int default 0,
  total_revenue numeric(10,2) default 0,
  total_payout numeric(10,2) default 0,
  court_costs numeric(10,2) default 0,
  net_profit numeric(10,2) default 0,
  status text default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz,
  paid_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);

alter table payout_records enable row level security;
create policy "Staff read own payouts" on payout_records for select using (auth.uid() = staff_id);
create policy "Admins manage payouts" on payout_records for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','manager'))
);

-- =============================================
-- ANALYTICS helper view
-- =============================================
create or replace view dashboard_stats as
select
  (select count(*) from profiles where role = 'customer' and is_active = true) as total_customers,
  (select count(*) from appointments where starts_at::date = current_date) as todays_sessions,
  (select count(*) from appointments where status = 'pending') as pending_requests,
  (select count(*) from waitlist where status = 'waiting') as waitlist_count,
  (select coalesce(sum(amount_paid),0) from appointments where date_trunc('month', starts_at) = date_trunc('month', now())) as monthly_revenue,
  (select count(*) from enrollments where created_at::date = current_date) as todays_enrollments;

-- =============================================
-- Updated_at trigger
-- =============================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles for each row execute procedure update_updated_at();
create trigger appointments_updated_at before update on appointments for each row execute procedure update_updated_at();
