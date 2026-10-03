-- 0075 — "Chapter lead" as a role on the team (docs/ROLES.md).
--
-- A person's role on the team (officer, board, grants committee, chapter
-- lead, staff, volunteer) is what the public sees; what their account may
-- do in the admin is the access level on their profile, set on the same
-- Staff record. Chapter lead was only an access-level label before; it is
-- a position in the organisation, so it joins the team roles.

alter table public.team_members drop constraint if exists team_members_kind_check;
alter table public.team_members
  add constraint team_members_kind_check
  check (kind in ('officer', 'staff', 'board', 'committee', 'volunteer', 'chapter_lead'));

notify pgrst, 'reload schema';
