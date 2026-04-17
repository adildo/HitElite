# Hit Elite — Tennis & Pickleball Management Platform

A full-stack SaaS platform for tennis and pickleball businesses. Built with Next.js, Supabase, and deployed on Vercel.

---

## Tech Stack

- **Frontend**: Next.js 14 (plain JavaScript, no TypeScript)
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **Hosting**: Vercel
- **Payments**: Stripe (ready to integrate)

---

## Quick Start (30 minutes to live)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** → **New query**
3. Paste the contents of `supabase/migrations/001_schema.sql` and click **Run**
4. Then paste `supabase/seed/001_sample_data.sql` and click **Run**

### 2. Create your admin account

1. In Supabase → **Authentication** → **Users** → **Add user**
2. Enter your email and a strong password
3. Go to **Table Editor** → **profiles** → find your row
4. Set `role` to `admin`

### 3. Create coach accounts (optional)

1. Repeat step 2 for each coach, setting role to `coach`
2. After creating, go to **Table Editor** → **staff**
3. Insert a row with the coach's profile `id`, their `bio`, and `default_pay_rate`

### 4. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase → Settings → API
4. Click **Deploy**

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Copy `.env.example` to `.env.local` for local development.

---

## Project Structure

```
pages/
  index.js              — Public homepage
  login.js              — Sign in
  signup.js             — Create account
  classes.js            — Public class schedule
  coaches.js            — Public coach directory
  portal.js             — Redirect to /portal
  unauthorized.js       — Access denied page

  admin/
    index.js            — Admin dashboard
    customers.js        — Customer management
    appointments.js     — Appointment management (4 tabs)
    classes.js          — Class management
    staff.js            — Staff & coaches
    services.js         — Appointment services
    analytics.js        — Business analytics
    payments.js         — Payments & payouts
    tags.js             — Tag management
    leads.js            — Lead CRM
    locations.js        — Court & venue management
    tasks.js            — Staff task management
    settings.js         — Business settings
    marketing.js        — Marketing (stub)
    reviews.js          — Reviews (stub)
    schedule.js         — Schedule calendar (stub)
    waitlist.js         — Waitlist management (stub)

  coach/
    index.js            — Coach dashboard
    feedback.js         — Session feedback submission
    schedule.js         — Coach schedule (stub)
    appointments.js     — Coach appointments (stub)
    classes.js          — Coach classes (stub)
    students.js         — Coach students (stub)
    payouts.js          — Coach payouts (stub)
    profile.js          — Coach profile (stub)

  portal/
    index.js            — Customer portal home
    book.js             — Booking flow (classes + appointments)
    bookings.js         — My bookings (stub)
    feedback.js         — Coach feedback view (stub)
    profile.js          — Customer profile (stub)

components/
  admin/
    AdminLayout.js      — Admin sidebar + auth guard
  coach/
    CoachLayout.js      — Coach sidebar + auth guard

lib/
  supabase.js           — Supabase client + auth helpers
  theme.js              — Design tokens

styles/
  globals.css           — Base styles

supabase/
  migrations/
    001_schema.sql      — Full database schema (run first)
  seed/
    001_sample_data.sql — Sample data (run after schema)
```

---

## User Roles

| Role | Default landing page | Access |
|------|---------------------|--------|
| `admin` | `/admin` | Full platform |
| `manager` | `/admin` | All except billing settings |
| `coach` | `/coach` | Own schedule, students, feedback, payouts |
| `staff` | `/admin` | Booking management, customers |
| `customer` | `/portal` | Own bookings, feedback, profile |

---

## Key Features Built (Phase 1)

- ✅ Auth with all 5 roles (admin, manager, coach, staff, customer)
- ✅ Admin dashboard with live stats from Supabase
- ✅ Customer management (list, search, add, profile, CSV export)
- ✅ Appointment management (reservations, requests approve/decline, waitlist)
- ✅ Class management (list + sessions view, create form)
- ✅ Staff & coaches (cards, profile, add new)
- ✅ Appointment services (services, categories, add-ons, price levels)
- ✅ Analytics dashboard (live metrics)
- ✅ Payments overview
- ✅ Tags management (full CRUD, badge builder)
- ✅ Leads CRM (kanban + list view)
- ✅ Locations management
- ✅ Task management (assign to staff, status tracking)
- ✅ Coach portal (dashboard, session feedback with chip picker)
- ✅ Customer portal (dashboard, booking flow for classes + appointments)
- ✅ Public pages (homepage, classes, coaches)
- ✅ 20+ database tables with Row Level Security
- ✅ Sample data (5 locations, 10 tags, 4 categories, 5 services, 6 classes, sessions for 2 weeks)

## Stubs Ready to Build (Phase 2+)

- Marketing automation sequences
- Full calendar schedule view
- Stripe payment integration
- Coach availability + Google Calendar sync
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- Reviews system
- Payout report generation
- Terms & waiver e-signature
- QR code check-in

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

Visit [localhost:3000](http://localhost:3000)

---

## Deployment

Every push to the `main` branch on GitHub triggers an automatic Vercel deployment (~45 seconds).

---

## Support

Built by Claude for Hit Elite. To extend any feature, describe what you want in the chat and new files will be generated.
