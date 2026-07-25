create extension if not exists pgcrypto;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  itinerary jsonb not null check (jsonb_typeof(itinerary) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_owner_updated_idx on public.trips (owner_id, updated_at desc);

alter table public.trips enable row level security;

create policy "owners read own trips" on public.trips for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners create own trips" on public.trips for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners update own trips" on public.trips for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners delete own trips" on public.trips for delete to authenticated using ((select auth.uid()) = owner_id);

create type public.product_event_name as enum (
  'planner_started',
  'brief_completed',
  'plan_generated',
  'plan_saved',
  'provider_handoff_opened'
);

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_name public.product_event_name not null,
  properties jsonb not null default '{}'::jsonb check (
    jsonb_typeof(properties) = 'object'
    and not properties ?| array['email', 'name', 'note', 'prompt', 'accessibility', 'dates', 'party', 'itinerary']
  ),
  created_at timestamptz not null default now()
);

alter table public.product_events enable row level security;

create policy "accept allowlisted anonymous events" on public.product_events for insert to anon, authenticated with check (
  jsonb_object_length(properties) <= 5
  and (select bool_and(key = any (
    case event_name
      when 'planner_started' then array['entryPage']
      when 'brief_completed' then array['resortArea', 'tripLengthBand', 'interestCount', 'pace']
      when 'plan_generated' then array['generationMode', 'itemCount']
      when 'plan_saved' then array['saveMode']
      when 'provider_handoff_opened' then array['contentType', 'providerDomain']
    end
  )) from jsonb_object_keys(properties) key)
  and case event_name
    when 'planner_started' then properties ->> 'entryPage' = 'planner'
    when 'brief_completed' then
      properties ->> 'resortArea' in ('montego-bay', 'negril', 'help-me-choose')
      and properties ->> 'tripLengthBand' in ('1-3', '4-7', '8+')
      and properties ->> 'pace' in ('relaxed', 'balanced', 'active')
      and (properties ->> 'interestCount')::int between 1 and 3
    when 'plan_generated' then
      properties ->> 'generationMode' in ('ai', 'fallback')
      and (properties ->> 'itemCount')::int between 0 and 9
    when 'plan_saved' then properties ->> 'saveMode' in ('connected', 'demo-local')
    when 'provider_handoff_opened' then
      properties ->> 'contentType' in ('stay', 'experience')
      and properties ->> 'providerDomain' in ('example.com', 'visitjamaica.com', 'www.visitjamaica.com')
    else false
  end
);

revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;
grant insert on public.product_events to anon, authenticated;
