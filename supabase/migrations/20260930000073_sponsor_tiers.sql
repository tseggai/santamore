-- ============================================================================
-- Santamore — sponsor tiers as the partners page names them
-- Apply AFTER 20260925000072_share_photo.sql. Re-runnable.
--
-- The 2025 sponsorships were seeded with the old tier words (founding,
-- silver, bronze). The partners page now sells Core Cost, Title, Gold,
-- Silver and Local Business, and the owner places the 2025 sponsors thus:
-- Lotta as Title partner, Stari Mlini as Gold, every other business as
-- Local. Lotta also sponsors the current year (2026) at the same tier; the
-- amount is not published and is left for staff to record.
-- ============================================================================

update public.sponsors set tier = 'title partner'
 where year = 2025 and lower(name) = 'lotta' and tier is distinct from 'title partner';
update public.sponsors set tier = 'gold'
 where year = 2025 and lower(name) = 'stari mlini' and tier is distinct from 'gold';
update public.sponsors set tier = 'local'
 where year = 2025 and lower(name) not in ('lotta', 'stari mlini') and coalesce(tier, '') in ('bronze', 'silver', '');

do $$
declare
  v_supporter uuid;
  v_chapter uuid;
begin
  select id into v_supporter from public.supporters where slug = 'lotta' or lower(name) = 'lotta' order by (slug = 'lotta') desc limit 1;
  if v_supporter is null then
    raise notice 'sponsor_tiers: no supporter named Lotta; the 2026 sponsorship is not recorded';
    return;
  end if;
  select chapter_id into v_chapter from public.sponsors where supporter_id = v_supporter and year = 2025 limit 1;
  if not exists (select 1 from public.sponsors where supporter_id = v_supporter and year = 2026) then
    insert into public.sponsors (name, tier, chapter_id, amount_cents, is_in_kind, status, supporter_id, year, fund, is_test)
    values ('Lotta', 'title partner', v_chapter, null, false, 'signed', v_supporter, 2026, 'operations', false);
  end if;
end $$;
