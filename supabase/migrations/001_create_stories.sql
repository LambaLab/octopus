create extension if not exists "pgcrypto";

create table if not exists stories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  source_url  text unique not null,
  status      text not null default 'pending'
                check (status in ('pending', 'ready', 'failed')),
  data        jsonb,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists stories_slug_idx on stories (slug);
create index if not exists stories_source_url_idx on stories (source_url);
