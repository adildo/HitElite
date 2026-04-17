-- =============================================
-- HIT ELITE — Sample Data (Fixed UUIDs)
-- Run AFTER 001_schema.sql
-- =============================================

-- Locations
insert into locations (name, address, city, state, surface_type, is_indoor, capacity, amenities, is_active) values
  ('Court 1 — Main Facility', '123 Elite Drive', 'Richmond', 'CA', 'hard_court', false, 20, ARRAY['parking','restrooms','lights'], true),
  ('Court 2 — Main Facility', '123 Elite Drive', 'Richmond', 'CA', 'hard_court', false, 20, ARRAY['parking','restrooms','lights'], true),
  ('Court 3 — East Wing', '123 Elite Drive', 'Richmond', 'CA', 'hard_court', false, 20, ARRAY['parking','restrooms'], true),
  ('Indoor Court — Pro Center', '456 Pro Blvd', 'Oakland', 'CA', 'indoor', true, 15, ARRAY['parking','restrooms','lights'], true),
  ('Pickleball Court A', '789 Sport Ave', 'Berkeley', 'CA', 'sport_tile', false, 16, ARRAY['parking','restrooms'], true);

-- Tags
insert into tags (name, color, type, is_badge, badge_label, badge_color, badge_text_color) values
  ('VIP', '#D4A843', 'customer', true, 'VIP Member', '#D4A843', '#fff'),
  ('Tennis', '#1D9E75', 'customer', false, null, null, null),
  ('Pickleball', '#534AB7', 'customer', false, null, null, null),
  ('Advanced', '#D85A30', 'customer', true, 'Advanced', '#D85A30', '#fff'),
  ('Beginner', '#185FA5', 'customer', true, 'Beginner', '#E6F1FB', '#185FA5'),
  ('Junior Family', '#185FA5', 'customer', true, 'Junior', '#185FA5', '#fff'),
  ('Trial', '#BA7517', 'customer', true, 'Trial', '#FAEEDA', '#854F0B'),
  ('Monthly Plan', '#1D9E75', 'membership', false, null, null, null),
  ('Head Coach', '#534AB7', 'staff', true, 'Head Coach', '#534AB7', '#fff'),
  ('Tennis Certified', '#1D9E75', 'staff', false, null, null, null);

-- Service Categories
insert into service_categories (name, description, display_order) values
  ('Private Tennis Lessons', 'One-on-one and small group tennis coaching sessions', 1),
  ('Pickleball Sessions', 'Private and group pickleball instruction', 2),
  ('Junior Programs', 'Youth tennis and pickleball development', 3),
  ('Fitness & Conditioning', 'Sport-specific fitness training', 4);

-- Add-ons
insert into addons (name, description, price, duration_added_mins, max_qty, is_active) values
  ('Extra Player', 'Add an additional player to your session', 10.00, 0, 3, true),
  ('Video Analysis', 'Record and analyze your session with pro tools', 20.00, 0, 1, true),
  ('Ball Machine', 'Add ball machine usage to your practice', 15.00, 0, 1, true),
  ('Racket Rental', 'Rent a quality racket for your session', 8.00, 0, 2, true);

-- Services
insert into services (name, description, category_id, color, duration_mins, price, payment_mode, visibility, booking_mode, is_active)
select '60-Min Private Tennis Lesson', 'Focused one-on-one coaching session tailored to your skill level.', id, '#D4A843', 60, 80.00, 'full', 'public', 'instant', true
from service_categories where name = 'Private Tennis Lessons' limit 1;

insert into services (name, description, category_id, color, duration_mins, price, payment_mode, visibility, booking_mode, is_active)
select '90-Min Private Tennis Lesson', 'Extended private session for deeper skill development and match play.', id, '#D4A843', 90, 110.00, 'full', 'public', 'instant', true
from service_categories where name = 'Private Tennis Lessons' limit 1;

insert into services (name, description, category_id, color, duration_mins, price, payment_mode, visibility, booking_mode, is_active)
select '60-Min Pickleball Lesson', 'Private instruction covering fundamentals through advanced strategy.', id, '#534AB7', 60, 70.00, 'full', 'public', 'instant', true
from service_categories where name = 'Pickleball Sessions' limit 1;

insert into services (name, description, category_id, color, duration_mins, price, payment_mode, visibility, booking_mode, is_active)
select 'Junior Development Session (60 min)', 'Age-appropriate coaching for players under 18.', id, '#1D9E75', 60, 65.00, 'full', 'public', 'instant', true
from service_categories where name = 'Junior Programs' limit 1;

insert into services (name, description, category_id, color, duration_mins, price, payment_mode, visibility, booking_mode, is_active)
select 'Semi-Private Lesson (2 players)', 'Shared private session for two players.', id, '#D4A843', 60, 50.00, 'full', 'public', 'instant', true
from service_categories where name = 'Private Tennis Lessons' limit 1;

-- Classes
insert into classes (name, description, type, color, capacity, waitlist_size, duration_mins, location_id, visibility, payment_mode, price, is_active)
select 'Beginner Tennis — Adult Group', 'Perfect for new players. Learn the fundamentals in a fun, supportive group environment.', 'single', '#D4A843', 8, 3, 60, id, 'public', 'full', 25.00, true
from locations where name = 'Court 1 — Main Facility' limit 1;

insert into classes (name, description, type, color, capacity, waitlist_size, duration_mins, location_id, visibility, payment_mode, price, is_active)
select 'Intermediate Tennis — Adult Group', 'Build consistency and add variety to your game. Drills, strategy, and match play.', 'single', '#B8922E', 8, 2, 60, id, 'public', 'full', 28.00, true
from locations where name = 'Court 2 — Main Facility' limit 1;

insert into classes (name, description, type, color, capacity, waitlist_size, duration_mins, location_id, visibility, payment_mode, price, is_active)
select 'Advanced Tennis Clinic', 'High-intensity training for competitive players.', 'single', '#8B6914', 6, 2, 90, id, 'public', 'full', 35.00, true
from locations where name = 'Court 3 — East Wing' limit 1;

insert into classes (name, description, type, color, capacity, waitlist_size, duration_mins, location_id, visibility, payment_mode, price, is_active)
select 'Junior Tennis — Ages 8-12', 'A structured youth program building proper technique, footwork, and love of the game.', 'single', '#1D9E75', 10, 4, 60, id, 'public', 'full', 22.00, true
from locations where name = 'Court 1 — Main Facility' limit 1;

insert into classes (name, description, type, color, capacity, waitlist_size, duration_mins, location_id, visibility, payment_mode, price, is_active)
select 'Pickleball Intro Group', 'Learn the fastest-growing sport from scratch. Equipment provided.', 'single', '#534AB7', 8, 3, 60, id, 'public', 'full', 20.00, true
from locations where name = 'Pickleball Court A' limit 1;

insert into classes (name, description, type, color, capacity, waitlist_size, duration_mins, location_id, visibility, payment_mode, price, is_active)
select '8-Week Tennis Improvement Course', 'A cohort series taking you from intermediate to advanced. 8 weekly sessions.', 'cohort', '#D4A843', 6, 2, 90, id, 'public', 'full', 200.00, true
from locations where name = 'Court 2 — Main Facility' limit 1;

-- Class Sessions
insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '1 day' + time '09:00', now() + interval '1 day' + time '10:00', 4
from classes where name = 'Beginner Tennis — Adult Group' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '3 days' + time '09:00', now() + interval '3 days' + time '10:00', 5
from classes where name = 'Beginner Tennis — Adult Group' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '5 days' + time '09:00', now() + interval '5 days' + time '10:00', 3
from classes where name = 'Beginner Tennis — Adult Group' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '2 days' + time '11:00', now() + interval '2 days' + time '12:00', 6
from classes where name = 'Intermediate Tennis — Adult Group' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '4 days' + time '11:00', now() + interval '4 days' + time '12:00', 7
from classes where name = 'Intermediate Tennis — Adult Group' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '6 days' + time '10:00', now() + interval '6 days' + time '11:30', 4
from classes where name = 'Advanced Tennis Clinic' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '6 days' + time '09:00', now() + interval '6 days' + time '10:00', 8
from classes where name = 'Junior Tennis — Ages 8-12' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '7 days' + time '09:00', now() + interval '7 days' + time '10:00', 7
from classes where name = 'Junior Tennis — Ages 8-12' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '3 days' + time '16:00', now() + interval '3 days' + time '17:00', 5
from classes where name = 'Pickleball Intro Group' limit 1;

insert into class_sessions (class_id, starts_at, ends_at, enrolled_count)
select id, now() + interval '5 days' + time '16:00', now() + interval '5 days' + time '17:00', 6
from classes where name = 'Pickleball Intro Group' limit 1;
