create schema if not exists private;

revoke all on schema private from public, anon;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(trim(full_name)) between 2 and 100),
  constraint profiles_avatar_path_length check (avatar_path is null or char_length(avatar_path) <= 500)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  topic text,
  description text,
  teacher_name text,
  delivery_at timestamptz,
  photo_path text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_length check (char_length(trim(name)) between 2 and 100),
  constraint teams_subject_length check (char_length(trim(subject)) between 2 and 100),
  constraint teams_topic_length check (topic is null or char_length(topic) <= 160),
  constraint teams_description_length check (description is null or char_length(description) <= 2000),
  constraint teams_teacher_name_length check (teacher_name is null or char_length(teacher_name) <= 100),
  constraint teams_photo_path_length check (photo_path is null or char_length(photo_path) <= 500),
  constraint teams_status_allowed check (status in ('active', 'completed', 'archived'))
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'reader',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint team_members_role_allowed check (role in ('reader', 'editor', 'co_leader', 'leader'))
);

create unique index team_members_one_leader_idx
  on public.team_members (team_id)
  where role = 'leader';

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  role text not null default 'editor',
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses smallint not null default 20,
  use_count smallint not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_invites_role_allowed check (role in ('reader', 'editor', 'co_leader')),
  constraint team_invites_max_uses_range check (max_uses between 1 and 100),
  constraint team_invites_use_count_range check (use_count between 0 and max_uses),
  constraint team_invites_expiration_valid check (expires_at > created_at)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  priority text not null default 'medium',
  status text not null default 'todo',
  submission_text text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(trim(title)) between 2 and 160),
  constraint tasks_description_length check (description is null or char_length(description) <= 5000),
  constraint tasks_submission_length check (submission_text is null or char_length(submission_text) <= 5000),
  constraint tasks_priority_allowed check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint tasks_status_allowed check (status in ('todo', 'in_progress', 'in_review', 'completed')),
  constraint tasks_completion_consistent check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_comments_content_length check (char_length(trim(content)) between 1 and 3000)
);

create table public.activity_events (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_events_type_length check (char_length(event_type) between 2 and 80),
  constraint activity_events_entity_type_length check (entity_type is null or char_length(entity_type) <= 50),
  constraint activity_events_details_object check (jsonb_typeof(details) = 'object')
);

create table public.team_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  period_start timestamptz,
  period_end timestamptz,
  content jsonb not null,
  created_at timestamptz not null default now(),
  constraint team_reports_title_length check (char_length(trim(title)) between 2 and 160),
  constraint team_reports_period_valid check (
    period_start is null or period_end is null or period_end >= period_start
  ),
  constraint team_reports_content_object check (jsonb_typeof(content) = 'object')
);

create index teams_created_by_idx on public.teams (created_by);
create index teams_active_delivery_idx on public.teams (delivery_at)
  where status = 'active' and delivery_at is not null;
create index team_members_user_id_idx on public.team_members (user_id, joined_at desc);
create index team_members_team_role_idx on public.team_members (team_id, role);
create index team_invites_team_id_idx on public.team_invites (team_id, created_at desc);
create index team_invites_active_idx on public.team_invites (expires_at)
  where revoked_at is null;
create index tasks_team_status_idx on public.tasks (team_id, status, due_at);
create index tasks_assigned_to_idx on public.tasks (assigned_to, status, due_at);
create index tasks_overdue_idx on public.tasks (team_id, due_at)
  where status <> 'completed' and due_at is not null;
create index task_comments_task_id_idx on public.task_comments (task_id, created_at);
create index task_comments_team_id_idx on public.task_comments (team_id, created_at desc);
create index activity_events_team_created_idx on public.activity_events (team_id, created_at desc);
create index activity_events_actor_idx on public.activity_events (actor_id, created_at desc)
  where actor_id is not null;
create index team_reports_team_created_idx on public.team_reports (team_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function private.set_updated_at();

create trigger team_invites_set_updated_at
before update on public.team_invites
for each row execute function private.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

create trigger task_comments_set_updated_at
before update on public.task_comments
for each row execute function private.set_updated_at();

revoke all on function private.set_updated_at() from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  if profile_name is null then
    profile_name := split_part(coalesce(new.email, 'Estudante'), '@', 1);
  end if;

  if char_length(profile_name) < 2 then
    profile_name := 'Estudante';
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, left(profile_name, 100))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, full_name)
select
  users.id,
  left(
    case
      when char_length(trim(coalesce(users.raw_user_meta_data ->> 'full_name', ''))) >= 2
        then trim(users.raw_user_meta_data ->> 'full_name')
      when char_length(split_part(coalesce(users.email, ''), '@', 1)) >= 2
        then split_part(users.email, '@', 1)
      else 'Estudante'
    end,
    100
  )
from auth.users as users
on conflict (id) do nothing;

create or replace function private.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.team_members
      where team_id = target_team_id
        and user_id = (select auth.uid())
    );
$$;

create or replace function private.team_role(target_team_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.team_members
  where team_id = target_team_id
    and user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.team_role(target_team_id)) in ('leader', 'co_leader'), false);
$$;

create or replace function private.is_team_leader(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.team_role(target_team_id)) = 'leader', false);
$$;

create or replace function private.can_contribute(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.team_role(target_team_id)) in ('editor', 'co_leader', 'leader'), false);
$$;

create or replace function private.shares_team(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.team_members as mine
      join public.team_members as theirs on theirs.team_id = mine.team_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = target_user_id
    );
$$;

revoke all on function private.is_team_member(uuid) from public, anon;
revoke all on function private.team_role(uuid) from public, anon;
revoke all on function private.can_manage_team(uuid) from public, anon;
revoke all on function private.is_team_leader(uuid) from public, anon;
revoke all on function private.can_contribute(uuid) from public, anon;
revoke all on function private.shares_team(uuid) from public, anon;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_team_member(uuid) to authenticated, service_role;
grant execute on function private.team_role(uuid) to authenticated, service_role;
grant execute on function private.can_manage_team(uuid) to authenticated, service_role;
grant execute on function private.is_team_leader(uuid) to authenticated, service_role;
grant execute on function private.can_contribute(uuid) to authenticated, service_role;
grant execute on function private.shares_team(uuid) to authenticated, service_role;

create or replace function private.add_team_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or new.created_by <> (select auth.uid()) then
    raise exception 'The team creator must match the authenticated user.';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.created_by, 'leader');

  insert into public.activity_events (
    team_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    details
  ) values (
    new.id,
    new.created_by,
    'team_created',
    'team',
    new.id,
    jsonb_build_object('name', new.name)
  );

  return new;
end;
$$;

revoke all on function private.add_team_creator() from public, anon, authenticated;

create trigger teams_add_creator
after insert on public.teams
for each row execute function private.add_team_creator();

create or replace function private.protect_team_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.created_by <> old.created_by then
    raise exception 'Team identity fields cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger teams_protect_identity
before update on public.teams
for each row execute function private.protect_team_identity();

revoke all on function private.protect_team_identity() from public, anon, authenticated;

create or replace function private.protect_member_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id <> old.team_id or new.user_id <> old.user_id then
    raise exception 'Member identity fields cannot be changed.';
  end if;

  if old.role = 'leader' and new.role <> 'leader' then
    raise exception 'Leadership transfer is not available through role editing.';
  end if;

  return new;
end;
$$;

create trigger team_members_protect_identity
before update on public.team_members
for each row execute function private.protect_member_identity();

revoke all on function private.protect_member_identity() from public, anon, authenticated;

create or replace function private.validate_task_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  assignee_role text;
  team_delivery timestamptz;
begin
  select role into assignee_role
  from public.team_members
  where team_id = new.team_id and user_id = new.assigned_to;

  if assignee_role is null then
    raise exception 'The assignee must be a member of this team.';
  end if;

  if assignee_role = 'reader' then
    raise exception 'Readers cannot be assigned tasks. Change the member role to editor first.';
  end if;

  select delivery_at into team_delivery
  from public.teams
  where id = new.team_id;

  if new.due_at is not null and team_delivery is not null and new.due_at > team_delivery then
    raise exception 'The task deadline cannot be after the team delivery date.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.team_id <> old.team_id or new.created_by <> old.created_by then
      raise exception 'Task identity fields cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_validate_assignment
before insert or update on public.tasks
for each row execute function private.validate_task_assignment();

revoke all on function private.validate_task_assignment() from public, anon, authenticated;

create or replace function private.validate_task_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  task_team_id uuid;
begin
  select team_id into task_team_id from public.tasks where id = new.task_id;

  if task_team_id is null or task_team_id <> new.team_id then
    raise exception 'The comment team must match the task team.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
      or new.task_id <> old.task_id
      or new.team_id <> old.team_id
      or new.author_id <> old.author_id then
      raise exception 'Comment identity fields cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;

create trigger task_comments_validate
before insert or update on public.task_comments
for each row execute function private.validate_task_comment();

revoke all on function private.validate_task_comment() from public, anon, authenticated;

create or replace function private.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_event text;
begin
  if tg_op = 'INSERT' then
    next_event := 'task_created';
  elsif new.status is distinct from old.status then
    next_event := case new.status
      when 'in_review' then 'task_submitted'
      when 'completed' then 'task_completed'
      else 'task_status_changed'
    end;
  else
    return new;
  end if;

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
    next_event,
    'task',
    new.id,
    jsonb_build_object(
      'title', new.title,
      'assigned_to', new.assigned_to,
      'status', new.status,
      'due_at', new.due_at
    )
  );

  return new;
end;
$$;

revoke all on function private.log_task_activity() from public, anon, authenticated;

create trigger tasks_log_activity
after insert or update on public.tasks
for each row execute function private.log_task_activity();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.team_reports enable row level security;

create policy profiles_select_shared_team
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_team(id)
);

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy teams_select_members
on public.teams for select
to authenticated
using (private.is_team_member(id));

create policy teams_insert_creator
on public.teams for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
);

create policy teams_update_managers
on public.teams for update
to authenticated
using (private.can_manage_team(id))
with check (private.can_manage_team(id));

create policy teams_delete_leader
on public.teams for delete
to authenticated
using (private.is_team_leader(id));

create policy team_members_select_team
on public.team_members for select
to authenticated
using (private.is_team_member(team_id));

create policy team_members_update_leader
on public.team_members for update
to authenticated
using (
  role <> 'leader'
  and private.is_team_leader(team_id)
)
with check (
  role in ('reader', 'editor', 'co_leader')
  and private.is_team_leader(team_id)
);

create policy team_members_delete_leader
on public.team_members for delete
to authenticated
using (
  role <> 'leader'
  and private.is_team_leader(team_id)
);

create policy team_members_leave_self
on public.team_members for delete
to authenticated
using (
  role <> 'leader'
  and user_id = (select auth.uid())
);

create policy team_invites_select_managers
on public.team_invites for select
to authenticated
using (private.can_manage_team(team_id));

create policy team_invites_insert_managers
on public.team_invites for insert
to authenticated
with check (
  private.can_manage_team(team_id)
  and invited_by = (select auth.uid())
  and role in ('reader', 'editor', 'co_leader')
);

create policy team_invites_update_managers
on public.team_invites for update
to authenticated
using (private.can_manage_team(team_id))
with check (
  private.can_manage_team(team_id)
  and role in ('reader', 'editor', 'co_leader')
);

create policy team_invites_delete_managers
on public.team_invites for delete
to authenticated
using (private.can_manage_team(team_id));

create policy tasks_select_members
on public.tasks for select
to authenticated
using (private.is_team_member(team_id));

create policy tasks_insert_managers
on public.tasks for insert
to authenticated
with check (
  private.can_manage_team(team_id)
  and created_by = (select auth.uid())
);

create policy tasks_update_managers
on public.tasks for update
to authenticated
using (private.can_manage_team(team_id))
with check (private.can_manage_team(team_id));

create policy tasks_delete_managers
on public.tasks for delete
to authenticated
using (private.can_manage_team(team_id));

create policy task_comments_select_members
on public.task_comments for select
to authenticated
using (private.is_team_member(team_id));

create policy task_comments_insert_contributors
on public.task_comments for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.can_contribute(team_id)
);

create policy task_comments_update_author
on public.task_comments for update
to authenticated
using (author_id = (select auth.uid()))
with check (
  author_id = (select auth.uid())
  and private.can_contribute(team_id)
);

create policy task_comments_delete_author
on public.task_comments for delete
to authenticated
using (author_id = (select auth.uid()));

create policy activity_events_select_members
on public.activity_events for select
to authenticated
using (private.is_team_member(team_id));

create policy team_reports_select_members
on public.team_reports for select
to authenticated
using (private.is_team_member(team_id));

create policy team_reports_delete_leader
on public.team_reports for delete
to authenticated
using (private.is_team_leader(team_id));

create or replace function public.get_team_invite(invite_token uuid)
returns table (
  team_id uuid,
  team_name text,
  subject text,
  topic text,
  invite_role text,
  expires_at timestamptz,
  is_available boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  return query
  select
    teams.id,
    teams.name,
    teams.subject,
    teams.topic,
    invites.role,
    invites.expires_at,
    (
      invites.revoked_at is null
      and invites.expires_at > now()
      and invites.use_count < invites.max_uses
    ) as is_available
  from public.team_invites as invites
  join public.teams as teams on teams.id = invites.team_id
  where invites.token = invite_token
  limit 1;
end;
$$;

create or replace function public.accept_team_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invite_record public.team_invites%rowtype;
  inserted_rows integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into invite_record
  from public.team_invites
  where token = invite_token
  for update;

  if invite_record.id is null then
    raise exception 'Invite not found.';
  end if;

  if invite_record.revoked_at is not null then
    raise exception 'This invite was revoked.';
  end if;

  if invite_record.expires_at <= now() then
    raise exception 'This invite expired.';
  end if;

  if invite_record.use_count >= invite_record.max_uses then
    raise exception 'This invite reached its usage limit.';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (invite_record.team_id, current_user_id, invite_record.role)
  on conflict (team_id, user_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    update public.team_invites
    set use_count = use_count + 1
    where id = invite_record.id;

    insert into public.activity_events (
      team_id,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      details
    ) values (
      invite_record.team_id,
      current_user_id,
      'member_joined',
      'member',
      current_user_id,
      jsonb_build_object('role', invite_record.role)
    );
  end if;

  return invite_record.team_id;
end;
$$;

create or replace function public.submit_task(target_task_id uuid, submission text default null)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  updated_task public.tasks;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if submission is not null and char_length(submission) > 5000 then
    raise exception 'The submission exceeds 5000 characters.';
  end if;

  update public.tasks
  set
    submission_text = nullif(trim(submission), ''),
    submitted_at = now(),
    status = 'in_review',
    completed_at = null
  where id = target_task_id
    and assigned_to = current_user_id
    and status <> 'completed'
    and private.can_contribute(team_id)
  returning * into updated_task;

  if updated_task.id is null then
    raise exception 'Task not found or not assigned to the current user.';
  end if;

  return updated_task;
end;
$$;

create or replace function public.generate_team_report(
  target_team_id uuid,
  report_start timestamptz default null,
  report_end timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  report_id uuid;
  report_title text;
  report_content jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.can_manage_team(target_team_id)) then
    raise exception 'Only leaders and co-leaders can generate reports.';
  end if;

  if report_start is not null and report_end is not null and report_end < report_start then
    raise exception 'The report end must be after its start.';
  end if;

  select
    'Relatório de contribuição — ' || teams.name,
    jsonb_build_object(
      'generated_at', now(),
      'team', jsonb_build_object(
        'id', teams.id,
        'name', teams.name,
        'subject', teams.subject,
        'topic', teams.topic,
        'delivery_at', teams.delivery_at
      ),
      'period', jsonb_build_object('start', report_start, 'end', report_end),
      'members', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'user_id', members.user_id,
            'name', profiles.full_name,
            'role', members.role,
            'tasks_assigned', (
              select count(*) from public.tasks
              where team_id = target_team_id
                and assigned_to = members.user_id
                and (report_start is null or created_at >= report_start)
                and (report_end is null or created_at <= report_end)
            ),
            'tasks_completed', (
              select count(*) from public.tasks
              where team_id = target_team_id
                and assigned_to = members.user_id
                and status = 'completed'
                and (report_start is null or completed_at >= report_start)
                and (report_end is null or completed_at <= report_end)
            ),
            'tasks_overdue', (
              select count(*) from public.tasks
              where team_id = target_team_id
                and assigned_to = members.user_id
                and due_at < now()
                and status <> 'completed'
                and (report_start is null or created_at >= report_start)
                and (report_end is null or created_at <= report_end)
            ),
            'comments_added', (
              select count(*) from public.task_comments
              where team_id = target_team_id
                and author_id = members.user_id
                and (report_start is null or created_at >= report_start)
                and (report_end is null or created_at <= report_end)
            )
          ) order by members.joined_at
        )
        from public.team_members as members
        join public.profiles on profiles.id = members.user_id
        where members.team_id = target_team_id
      ), '[]'::jsonb),
      'overdue_tasks', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', tasks.id,
            'title', tasks.title,
            'assigned_to', tasks.assigned_to,
            'due_at', tasks.due_at,
            'status', tasks.status
          ) order by tasks.due_at
        )
        from public.tasks
        where tasks.team_id = target_team_id
          and tasks.due_at < now()
          and tasks.status <> 'completed'
      ), '[]'::jsonb)
    )
  into report_title, report_content
  from public.teams
  where teams.id = target_team_id;

  if report_title is null then
    raise exception 'Team not found.';
  end if;

  insert into public.team_reports (
    team_id,
    created_by,
    title,
    period_start,
    period_end,
    content
  ) values (
    target_team_id,
    current_user_id,
    report_title,
    report_start,
    report_end,
    report_content
  )
  returning id into report_id;

  insert into public.activity_events (
    team_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    details
  ) values (
    target_team_id,
    current_user_id,
    'report_generated',
    'report',
    report_id,
    jsonb_build_object('title', report_title)
  );

  return report_id;
end;
$$;

revoke all on function public.get_team_invite(uuid) from public, anon;
revoke all on function public.accept_team_invite(uuid) from public, anon;
revoke all on function public.submit_task(uuid, text) from public, anon;
revoke all on function public.generate_team_report(uuid, timestamptz, timestamptz) from public, anon;

grant execute on function public.get_team_invite(uuid) to authenticated, service_role;
grant execute on function public.accept_team_invite(uuid) to authenticated, service_role;
grant execute on function public.submit_task(uuid, text) to authenticated, service_role;
grant execute on function public.generate_team_report(uuid, timestamptz, timestamptz) to authenticated, service_role;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.teams from anon, authenticated;
revoke all on table public.team_members from anon, authenticated;
revoke all on table public.team_invites from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_comments from anon, authenticated;
revoke all on table public.activity_events from anon, authenticated;
revoke all on table public.team_reports from anon, authenticated;
revoke all on sequence public.activity_events_id_seq from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;
grant select, update, delete on table public.team_members to authenticated;
grant select, insert, update, delete on table public.team_invites to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.task_comments to authenticated;
grant select on table public.activity_events to authenticated;
grant select, delete on table public.team_reports to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-photos',
  'team-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy team_photos_select_members
on storage.objects for select
to authenticated
using (
  bucket_id = 'team-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.is_team_member(((storage.foldername(name))[1])::uuid))
);

create policy team_photos_insert_managers
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'team-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.can_manage_team(((storage.foldername(name))[1])::uuid))
);

create policy team_photos_update_managers
on storage.objects for update
to authenticated
using (
  bucket_id = 'team-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.can_manage_team(((storage.foldername(name))[1])::uuid))
)
with check (
  bucket_id = 'team-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.can_manage_team(((storage.foldername(name))[1])::uuid))
);

create policy team_photos_delete_managers
on storage.objects for delete
to authenticated
using (
  bucket_id = 'team-photos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.can_manage_team(((storage.foldername(name))[1])::uuid))
);

notify pgrst, 'reload schema';
