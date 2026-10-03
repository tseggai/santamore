-- 0077 — the role is the access (docs/ROLES.md).
--
-- A person's Role is now what they may do: None, Accounting, Editor,
-- Admin (team_members.access). Where they appear on About us — Team,
-- Board, Grants committee, Volunteers — is a listing, not a role; Officer
-- and Chapter lead were never groupings on the page, so they fold into the
-- team and live on as titles.

update public.team_members set kind = 'staff' where kind in ('officer', 'chapter_lead');

alter table public.team_members drop constraint if exists team_members_kind_check;
alter table public.team_members
  add constraint team_members_kind_check
  check (kind in ('staff', 'board', 'committee', 'volunteer'));

notify pgrst, 'reload schema';
