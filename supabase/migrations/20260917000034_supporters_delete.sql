-- ============================================================================
-- Santamore — delete a supporter that was added by mistake
-- Apply AFTER 20260917000033_seed_santamore_25_donors.sql. Re-runnable.
--
-- Until now staff could only deactivate a supporter. Deleting one removes
-- its sponsorship deals with it and detaches its challenge offers (the
-- offer keeps its denormalised partner name). The staff "for all" policies
-- on both tables already cover delete; only the grant was missing.
-- ============================================================================

grant delete on public.supporters to authenticated;
grant delete on public.sponsors    to authenticated;

alter table public.sponsors
  drop constraint if exists sponsors_supporter_id_fkey,
  add constraint sponsors_supporter_id_fkey
    foreign key (supporter_id) references public.supporters (id) on delete cascade;

alter table public.perk_challenges
  drop constraint if exists perk_challenges_supporter_id_fkey,
  add constraint perk_challenges_supporter_id_fkey
    foreign key (supporter_id) references public.supporters (id) on delete set null;
