// Схема на базата. Чист PostgreSQL: локално върви върху PGlite (вграден Postgres),
// в продукция върху истински Postgres (Supabase или Neon) без промяна.
export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create table if not exists users (
  id serial primary key,
  role text not null check (role in ('boss','broker','client')),
  first_name text not null,
  last_name text not null,
  phone text not null unique,
  email text,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists broker_profiles (
  user_id integer primary key references users(id) on delete cascade,
  slug text not null unique,
  title text not null default 'Брокер',
  photo text,
  quote text,
  pitch text,
  bio text,
  since_year integer,
  deals integer,
  areas jsonb not null default '[]',
  languages jsonb not null default '[]',
  facts jsonb not null default '[]',
  notify_channel text not null default 'viber',
  notify_phone text,
  viber_user_id text,
  telegram_chat_id text,
  link_code text,
  visible boolean not null default true,
  sort integer not null default 100
);

-- Личен Viber канал на брокера: сайтът публикува в него всяко ново запитване.
alter table broker_profiles add column if not exists viber_channel_token text;
alter table broker_profiles add column if not exists viber_channel_from text;
alter table broker_profiles add column if not exists viber_channel_name text;

create table if not exists invites (
  code text primary key,
  created_by integer references users(id),
  note text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by integer references users(id),
  used_at timestamptz,
  revoked boolean not null default false
);

create table if not exists sessions (
  token text primary key,
  user_id integer not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists properties (
  id serial primary key,
  slug text not null unique,
  ref text not null unique,
  title text not null,
  deal text not null check (deal in ('sale','rent')),
  kind text not null,
  rooms integer,
  area integer not null,
  yard integer,
  floor integer,
  floors integer,
  district text not null,
  address text,
  price integer not null,
  year_built integer,
  construction text,
  heating text,
  furnishing text,
  features jsonb not null default '[]',
  teaser text,
  description text,
  photos jsonb not null default '[]',
  broker_id integer references users(id),
  status text not null default 'active' check (status in ('draft','active','reserved','sold')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visitors (
  id text primary key,
  user_id integer,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  source text,
  ref_broker_id integer,
  device text,
  demo boolean not null default false
);

create table if not exists page_views (
  id serial primary key,
  visitor_id text,
  user_id integer,
  path text,
  kind text,
  property_id integer,
  broker_id integer,
  source text,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created on page_views(created_at);
create index if not exists page_views_property on page_views(property_id);

create table if not exists chat_sessions (
  id text primary key,
  visitor_id text,
  user_id integer,
  broker_id integer,
  property_id integer,
  source text,
  page text,
  device text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  intent text,
  last_step text,
  answered integer not null default 0,
  answers jsonb not null default '{}',
  reached_summary boolean not null default false,
  reached_form boolean not null default false,
  submitted boolean not null default false,
  exit_reason text,
  lead_id integer,
  demo boolean not null default false
);
create index if not exists chat_sessions_started on chat_sessions(started_at);

create table if not exists chat_events (
  id serial primary key,
  session_id text not null,
  type text not null,
  step text,
  value text,
  created_at timestamptz not null default now()
);
create index if not exists chat_events_session on chat_events(session_id);

create table if not exists leads (
  id serial primary key,
  broker_id integer,
  client_id integer,
  visitor_id text,
  first_name text not null,
  last_name text not null,
  phone text not null,
  intent text,
  summary text,
  answers jsonb not null default '{}',
  note text,
  property_id integer,
  source text,
  page text,
  status text not null default 'new' check (status in ('new','contacted','viewing','deal','lost')),
  chat_session_id text,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_broker on leads(broker_id);

create table if not exists lead_notes (
  id serial primary key,
  lead_id integer not null,
  user_id integer,
  kind text not null default 'note',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  user_id integer not null,
  property_id integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists media (
  name text primary key,
  mime text not null,
  data bytea not null,
  created_by integer,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id serial primary key,
  lead_id integer,
  broker_id integer,
  channel text not null,
  recipient text,
  body text not null,
  status text not null,
  error text,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);
`;
