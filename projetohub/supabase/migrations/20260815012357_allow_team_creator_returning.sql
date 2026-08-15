drop policy if exists teams_select_members on public.teams;

create policy teams_select_members
on public.teams for select
to authenticated
using (
  created_by = (select auth.uid())
  or private.is_team_member(id)
);
