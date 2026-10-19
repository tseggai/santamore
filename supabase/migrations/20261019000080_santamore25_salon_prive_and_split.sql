-- ============================================================================
-- Santamore — 2025: Salon Privé did not take part; the hand-over as it was
-- Apply AFTER 20261019000079_santamore25_sofi_gift.sql. Re-runnable.
--
-- Two corrections from the owner (2026-10-19):
--   1. Salon Privé was seeded as a 2025 in-kind sponsor from the old site,
--      but did not take part. Its 2025 sponsorship goes, and the supporter
--      record with it when nothing else hangs on it.
--   2. The 2025 money was not split evenly. Dnevni Centar Tivat received
--      €1,314.45 and Dječji dom „Mladost“ Bijela the rest, €5,470.55, which
--      together is the €6,785 raised. These are the owner's figures, typed
--      in on purpose; migrations 0053, 0078 and 0079 computed an even split
--      and must not be re-run after this one, or they would overwrite it.
-- ============================================================================

-- 1 ─ Salon Privé, 2025
delete from public.sponsors s
 where lower(s.name) = 'salon privé'
   and coalesce(
         s.year,
         extract(year from coalesce(
           (select e.starts_at from public.events e where e.id = s.event_id),
           (select c.starts_at from public.campaigns c where c.id = s.campaign_id)))::int
       ) = 2025;

delete from public.supporters su
 where (su.slug = 'salon-prive' or lower(su.name) = 'salon privé')
   and not exists (select 1 from public.sponsors s where s.supporter_id = su.id);

-- 2 ─ the hand-overs as they were made
update public.year_reports
   set beneficiaries_list = (
     select jsonb_agg(
       case
         when b->>'label' = 'Dnevni Centar Tivat' then jsonb_set(b, '{amount_cents}', '131445'::jsonb)
         when b->>'label' = 'Dječji dom „Mladost“ Bijela' then jsonb_set(b, '{amount_cents}', '547055'::jsonb)
         else b
       end)
     from jsonb_array_elements(beneficiaries_list) b)
 where year = 2025
   and beneficiaries_list @> '[{"label":"Dnevni Centar Tivat"},{"label":"Dječji dom „Mladost“ Bijela"}]'::jsonb;
