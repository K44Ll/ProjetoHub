create or replace function private.log_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_title text;
begin
  select title into task_title
  from public.tasks
  where id = new.task_id;

  insert into public.activity_events (
    team_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    details
  ) values (
    new.team_id,
    new.author_id,
    'comment_created',
    'comment',
    new.id,
    jsonb_build_object('title', task_title)
  );

  return new;
end;
$$;

revoke all on function private.log_comment_activity() from public, anon, authenticated;

create trigger task_comments_log_activity
after insert on public.task_comments
for each row execute function private.log_comment_activity();

create or replace function private.log_member_role_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_name text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  select full_name into member_name
  from public.profiles
  where id = new.user_id;

  insert into public.activity_events (
    team_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    details
  ) values (
    new.team_id,
    (select auth.uid()),
    'member_role_changed',
    'member',
    new.user_id,
    jsonb_build_object(
      'name', member_name,
      'previous_role', old.role,
      'role', new.role
    )
  );

  return new;
end;
$$;

revoke all on function private.log_member_role_activity() from public, anon, authenticated;

create trigger team_members_log_role_activity
after update of role on public.team_members
for each row execute function private.log_member_role_activity();
