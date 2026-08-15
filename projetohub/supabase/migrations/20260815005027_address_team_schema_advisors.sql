create index task_comments_author_id_idx
  on public.task_comments (author_id, created_at desc);

create index tasks_created_by_idx
  on public.tasks (created_by, created_at desc);

create index team_invites_invited_by_idx
  on public.team_invites (invited_by, created_at desc);

create index team_reports_created_by_idx
  on public.team_reports (created_by, created_at desc);

drop policy team_members_delete_leader on public.team_members;
drop policy team_members_leave_self on public.team_members;

create policy team_members_delete_allowed
on public.team_members for delete
to authenticated
using (
  role <> 'leader'
  and (
    private.is_team_leader(team_id)
    or user_id = (select auth.uid())
  )
);
