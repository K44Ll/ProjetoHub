alter table public.team_drive_connections
  add constraint team_drive_folder_id_format
    check (root_folder_id ~ '^[A-Za-z0-9_-]{5,255}$'),
  add constraint team_drive_access_token_format
    check (access_token_ciphertext ~ '^v2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  add constraint team_drive_refresh_token_format
    check (refresh_token_ciphertext ~ '^v2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  add constraint team_drive_scopes_size
    check (octet_length(array_to_string(granted_scopes, ' ')) <= 4096);

drop policy if exists task_comments_delete_author on public.task_comments;

create policy task_comments_delete_author
on public.task_comments for delete
to authenticated
using (
  author_id = (select auth.uid())
  and private.is_team_member(team_id)
);

create or replace function private.limit_team_invite_creation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.team_invites
    where team_id = new.team_id
      and invited_by = (select auth.uid())
      and created_at > now() - interval '2 seconds'
  ) then
    raise exception 'Wait before creating another invite.';
  end if;

  if (
    select count(*)
    from public.team_invites
    where team_id = new.team_id
      and revoked_at is null
      and expires_at > now()
      and use_count < max_uses
  ) >= 50 then
    raise exception 'This team already has too many active invites.';
  end if;

  return new;
end;
$$;

revoke all on function private.limit_team_invite_creation()
  from public, anon, authenticated;

create trigger team_invites_limit_creation
before insert on public.team_invites
for each row execute function private.limit_team_invite_creation();

create or replace function private.limit_team_report_creation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.team_reports
    where team_id = new.team_id
      and created_by = (select auth.uid())
      and created_at > now() - interval '10 seconds'
  ) then
    raise exception 'Wait before generating another report.';
  end if;

  return new;
end;
$$;

revoke all on function private.limit_team_report_creation()
  from public, anon, authenticated;

create trigger team_reports_limit_creation
before insert on public.team_reports
for each row execute function private.limit_team_report_creation();
