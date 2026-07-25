-- Run in a disposable Supabase project after applying the migration.
-- Replace the UUIDs with two auth.users IDs created for the test.
begin;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.trips (owner_id, name, brief, itinerary)
values ('11111111-1111-4111-8111-111111111111', 'RLS owner test', '{}', '{}');

-- Should return one row.
select * from public.trips where owner_id = '11111111-1111-4111-8111-111111111111';

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
-- Should return zero rows; update and delete should affect zero rows.
select * from public.trips where owner_id = '11111111-1111-4111-8111-111111111111';
update public.trips set name = 'must not change' where owner_id = '11111111-1111-4111-8111-111111111111';
delete from public.trips where owner_id = '11111111-1111-4111-8111-111111111111';

rollback;
