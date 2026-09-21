-- ============================================================================
-- Santamore — a proposal may carry a link and a photo
-- Apply AFTER 20260920000063_cause_completed.sql. Re-runnable.
--
-- The proposer adds where people can read more and one picture. Photos go
-- to the proposal-photos bucket under the proposer's own folder; only they
-- (and staff) can put or remove one there. The list shows both only once a
-- proposal is opened.
-- ============================================================================

alter table public.cause_proposals add column if not exists link_url   text check (link_url is null or length(link_url) <= 300);
alter table public.cause_proposals add column if not exists photo_path text check (photo_path is null or length(photo_path) <= 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proposal-photos', 'proposal-photos', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists proposal_photos_own_insert on storage.objects;
create policy proposal_photos_own_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proposal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists proposal_photos_own_update on storage.objects;
create policy proposal_photos_own_update on storage.objects
  for update to authenticated
  using (bucket_id = 'proposal-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()))
  with check (bucket_id = 'proposal-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));
drop policy if exists proposal_photos_own_delete on storage.objects;
create policy proposal_photos_own_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'proposal-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

-- the edit takes the two new fields; one signature, so PostgREST never has to choose
drop function if exists public.update_my_proposal(uuid, text, text, text, text, bigint);
create or replace function public.update_my_proposal(
  p_id uuid,
  p_title text,
  p_summary text,
  p_location text,
  p_beneficiary text,
  p_amount_cents bigint,
  p_link_url text,
  p_photo_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposer uuid;
  v_status   text;
  v_votes    bigint;
begin
  select proposer_id, status into v_proposer, v_status from public.cause_proposals where id = p_id;
  if v_proposer is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;
  if v_proposer <> (select auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_status <> 'open' then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  select count(*) into v_votes from public.cause_votes where proposal_id = p_id;
  if v_votes > 0 then
    return jsonb_build_object('ok', false, 'reason', 'voted', 'count', v_votes);
  end if;
  -- a photo lives in the proposer's own folder, nowhere else
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> (select auth.uid())::text then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.cause_proposals
     set title        = p_title,
         summary      = p_summary,
         location     = nullif(trim(coalesce(p_location, '')), ''),
         beneficiary  = nullif(trim(coalesce(p_beneficiary, '')), ''),
         amount_cents = p_amount_cents,
         link_url     = nullif(trim(coalesce(p_link_url, '')), ''),
         photo_path   = nullif(trim(coalesce(p_photo_path, '')), '')
   where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.update_my_proposal(uuid, text, text, text, text, bigint, text, text) from public;
grant execute on function public.update_my_proposal(uuid, text, text, text, text, bigint, text, text) to authenticated;

drop view if exists public.v_public_cause_proposals;
create view public.v_public_cause_proposals
  with (security_invoker = off, security_barrier = on) as
with counted as (
  select p.id, p.title, p.summary, p.location, p.beneficiary, p.amount_cents, p.status, p.created_at,
         split_part(coalesce(pr.full_name, ''), ' ', 1) as proposer_first_name,
         c.slug as campaign_slug,
         (select count(*) from public.cause_votes v where v.proposal_id = p.id) as vote_count,
         (p.proposer_id = (select auth.uid())) as is_mine,
         p.link_url,
         p.photo_path
    from public.cause_proposals p
    join public.profiles pr on pr.id = p.proposer_id
    left join public.campaigns c on c.id = p.campaign_id and c.is_public
   where p.status in ('open', 'shortlisted', 'chosen') and (not p.is_test or public.test_mode())
)
select *,
       rank() over (partition by (status in ('open', 'shortlisted')) order by vote_count desc, created_at asc) as vote_rank
from counted;
grant select on public.v_public_cause_proposals to anon, authenticated;

notify pgrst, 'reload schema';
