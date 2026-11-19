-- ============================================================================
-- Santamore — prospects found and checked live
-- Apply AFTER 20261119000088_prospects.sql. Re-runnable.
--
-- Two live sources join the research file: a Google Places search (a
-- business by type and town) and live research (who has sponsored what,
-- found on the web at the moment of asking). A prospect found on Google
-- keeps its place id, so the same business is not added twice. A prospect
-- checked live keeps when, and the check itself is a line in its log.
-- ============================================================================

alter table public.prospects add column if not exists google_place_id text;
-- A plain unique index: empty place ids do not collide, and the console's
-- "add, skipping what is there" needs an index without a condition.
create unique index if not exists prospects_google_place_idx on public.prospects (google_place_id);

alter table public.prospects add column if not exists checked_at timestamptz;
comment on column public.prospects.checked_at is 'When the prospect was last checked by live research.';

alter table public.prospect_activities drop constraint if exists prospect_activities_kind_check;
alter table public.prospect_activities
  add constraint prospect_activities_kind_check check (kind in ('message', 'note', 'stage', 'research'));

notify pgrst, 'reload schema';
