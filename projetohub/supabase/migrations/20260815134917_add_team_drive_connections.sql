create table public.team_drive_connections (
  team_id uuid primary key references public.teams(id) on delete cascade,
  connected_by uuid references auth.users(id) on delete set null,
  root_folder_id text not null,
  root_folder_name text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  access_token_expires_at timestamptz not null,
  granted_scopes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_drive_folder_id_length
    check (char_length(root_folder_id) between 1 and 255),
  constraint team_drive_folder_name_length
    check (char_length(trim(root_folder_name)) between 1 and 200),
  constraint team_drive_access_token_length
    check (char_length(access_token_ciphertext) between 1 and 8192),
  constraint team_drive_refresh_token_length
    check (char_length(refresh_token_ciphertext) between 1 and 8192),
  constraint team_drive_scope_count
    check (cardinality(granted_scopes) between 1 and 20)
);

create index team_drive_connections_connected_by_idx
  on public.team_drive_connections (connected_by)
  where connected_by is not null;

create trigger team_drive_connections_set_updated_at
before update on public.team_drive_connections
for each row execute function private.set_updated_at();

create or replace function private.protect_team_drive_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id <> old.team_id then
    raise exception 'The team of a Drive connection cannot be changed.';
  end if;

  new.created_at := old.created_at;
  return new;
end;
$$;

revoke all on function private.protect_team_drive_identity()
  from public, anon, authenticated;

create trigger team_drive_connections_protect_identity
before update on public.team_drive_connections
for each row execute function private.protect_team_drive_identity();

alter table public.team_drive_connections enable row level security;

create policy team_drive_connections_select_members
on public.team_drive_connections for select
to authenticated
using ((select private.is_team_member(team_id)));

create policy team_drive_connections_insert_managers
on public.team_drive_connections for insert
to authenticated
with check (
  connected_by = (select auth.uid())
  and (select private.can_manage_team(team_id))
);

create policy team_drive_connections_update_managers
on public.team_drive_connections for update
to authenticated
using ((select private.can_manage_team(team_id)))
with check ((select private.can_manage_team(team_id)));

create policy team_drive_connections_delete_managers
on public.team_drive_connections for delete
to authenticated
using ((select private.can_manage_team(team_id)));

revoke all on table public.team_drive_connections
  from public, anon, authenticated;
grant select, insert, update, delete on table public.team_drive_connections
  to authenticated;
grant select, insert, update, delete on table public.team_drive_connections
  to service_role;
