-- =====================================================================
-- Living Faith Church International — Laderin-Hilltop
-- Migration 002: Row Level Security, grants and helper functions
-- =====================================================================
-- Policy model
--   * The application never talks to PostgREST with the anon/authenticated
--     keys for member data. Every read/write happens server-side with the
--     service-role client, after the server has performed authorization.
--   * To make that guarantee enforceable *inside* the database as defence in
--     depth, RLS is enabled on every table and the only permissive policies
--     are for non-sensitive reference data.
--   * All member, user, role, permission, audit and settings tables are
--     revoked from anon/authenticated entirely.
-- =====================================================================

alter table public.service_units           enable row level security;
alter table public.titles                  enable row level security;
alter table public.members                 enable row level security;
alter table public.member_phones           enable row level security;
alter table public.member_service_units    enable row level security;
alter table public.custom_fields           enable row level security;
alter table public.member_custom_values    enable row level security;
alter table public.app_users               enable row level security;
alter table public.app_principals          enable row level security;
alter table public.roles                   enable row level security;
alter table public.permissions             enable row level security;
alter table public.role_permissions        enable row level security;
alter table public.user_roles              enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.user_service_unit_scopes enable row level security;
alter table public.registration_consents  enable row level security;
alter table public.duplicate_flags         enable row level security;
alter table public.audit_events            enable row level security;
alter table public.app_settings            enable row level security;
alter table public.abuse_events            enable row level security;

-- ---------------------------------------------------------------------
-- Grants: deny direct client access by default
-- ---------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

-- Reference data is safe to expose read-only (used by the public form
-- configuration endpoint and by future client-side filtering).
grant select on public.service_units to anon, authenticated;
grant select on public.titles        to anon, authenticated;

-- Public registration may only create a member row, and only with the
-- server-generated reference number. A policy with a check constraint
-- guard is not possible here, so instead we grant INSERT with a column
-- level restriction: the privileged columns (reference_no, status,
-- created_by, updated_by, photo_* columns, deleted_*) are NOT granted.
grant insert (full_name, gender, age_category, birth_day, birth_month,
              primary_phone, primary_phone_normalized, whatsapp_same_as_primary,
              whatsapp_phone, whatsapp_phone_normalized, email, email_normalized,
              residential_address, membership_duration, suggestions,
              title_id, registration_source)
  on public.members to authenticated;

-- ---------------------------------------------------------------------
-- Policies for the two readable reference tables
-- ---------------------------------------------------------------------

drop policy if exists service_units_read on public.service_units;
create policy service_units_read on public.service_units
  for select to anon, authenticated using (true);

drop policy if exists titles_read on public.titles;
create policy titles_read on public.titles
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Helper: effective permission calculation (server side, service role)
-- ---------------------------------------------------------------------

create or replace function public.user_has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- The hidden superadmin principal always holds every permission.
    exists (
      select 1 from public.app_principals ap
      where ap.user_id = p_user_id and ap.principal_type = 'superadmin'
    )
    or (
      -- A deny override always wins over role grants.
      not exists (
        select 1 from public.user_permission_overrides upo
        where upo.user_id = p_user_id
          and upo.permission_key = p_permission
          and upo.effect = 'deny'
      )
      and (
        -- Granted through one of the user's roles.
        exists (
          select 1
          from public.user_roles ur
          join public.role_permissions rp on rp.role_id = ur.role_id
          where ur.user_id = p_user_id and rp.permission_key = p_permission
        )
        -- Or granted directly to the user.
        or exists (
          select 1 from public.user_permission_overrides upo
          where upo.user_id = p_user_id
            and upo.permission_key = p_permission
            and upo.effect = 'allow'
        )
      )
    );
$$;

revoke all on function public.user_has_permission(uuid, text) from public, anon, authenticated;
grant execute on function public.user_has_permission(uuid, text) to service_role;
