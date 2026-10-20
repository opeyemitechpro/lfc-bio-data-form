-- =====================================================================
-- Living Faith Church International — Laderin-Hilltop
-- Membership Bio-Data Management System
-- Migration 001: Core schema
-- =====================================================================
-- Conventions
--   * All primary keys are UUIDs generated with gen_random_uuid().
--   * All timestamps are timestamptz stored in UTC.
--   * Soft deletes are used for member records (status = 'deleted').
--   * Server-side application code runs with the Supabase service role and
--     is therefore the only writer. RLS (migration 002) denies anon/authenticated
--     direct access as defence in depth.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Reference / lookup tables
-- ---------------------------------------------------------------------

create table if not exists public.service_units (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  slug          text        not null,
  description   text,
  is_active     boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint service_units_name_key unique (name),
  constraint service_units_slug_key unique (slug)
);

create table if not exists public.titles (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  slug          text        not null,
  is_active     boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint titles_name_key unique (name),
  constraint titles_slug_key unique (slug)
);

-- ---------------------------------------------------------------------
-- 2. Members
-- ---------------------------------------------------------------------

create table if not exists public.members (
  id                       uuid primary key default gen_random_uuid(),
  reference_no             text        not null unique,
  full_name                text        not null,
  title_id                 uuid        references public.titles (id) on delete set null,
  gender                   text        not null check (gender in ('male', 'female')),
  age_category             text        not null check (age_category in ('child', 'youth', 'adult')),
  birth_day                integer     check (birth_day between 1 and 31),
  birth_month              integer     check (birth_month between 1 and 12),
  primary_phone            text        not null,
  primary_phone_normalized text        not null,
  whatsapp_same_as_primary boolean     not null default false,
  whatsapp_phone           text,
  whatsapp_phone_normalized text,
  email                    text,
  email_normalized         text,
  residential_address      text,
  membership_duration      text        not null check (membership_duration in ('lt_1y', 'y1_3', 'y4_6', 'y7_10', 'gt_10y')),
  suggestions              text,
  photo_public_id          text,
  photo_format             text,
  photo_width              integer,
  photo_height             integer,
  photo_bytes              integer,
  photo_uploaded_at        timestamptz,
  status                   text        not null default 'active' check (status in ('active', 'deleted')),
  deleted_at               timestamptz,
  deleted_by               uuid,
  deletion_reason          text,
  registration_source      text        not null default 'public_form' check (registration_source in ('public_form', 'admin')),
  idempotency_key         text,
  created_by               uuid,
  updated_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint members_birth_day_valid check (
    birth_day is null or (
      (birth_month = 2 and birth_day between 1 and 29)
      or (birth_month in (4, 6, 9, 11) and birth_day between 1 and 30)
      or (birth_month in (1, 3, 5, 7, 8, 10, 12) and birth_day between 1 and 31)
    )
  ),
  constraint members_full_name_len check (char_length(full_name) between 2 and 200),
  constraint members_email_present check (email is null or email <> ''),
  constraint members_email_normalized_present check (email_normalized is null or email_normalized <> '')
);

create index if not exists members_full_name_idx      on public.members (lower(full_name));
create index if not exists members_phone_idx          on public.members (primary_phone_normalized);
create index if not exists members_whatsapp_idx       on public.members (whatsapp_phone_normalized);
create index if not exists members_email_idx          on public.members (email_normalized);
create index if not exists members_status_idx         on public.members (status);
create index if not exists members_created_at_idx     on public.members (created_at desc);
create index if not exists members_age_category_idx   on public.members (age_category);
create index if not exists members_gender_idx         on public.members (gender);
create index if not exists members_membership_dur_idx on public.members (membership_duration);
create index if not exists members_title_idx          on public.members (title_id);

-- Idempotency key for public submissions; unique so a repeated submission
-- id can never create a second member row.
create unique index if not exists members_idempotency_key_idx
  on public.members (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.member_phones (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid        not null references public.members (id) on delete cascade,
  phone             text        not null,
  phone_normalized  text        not null,
  label             text        not null default 'other' check (label in ('primary', 'whatsapp', 'other')),
  is_primary        boolean     not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists member_phones_member_idx   on public.member_phones (member_id);
create index if not exists member_phones_normalized_idx on public.member_phones (phone_normalized);

create table if not exists public.member_service_units (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid        not null references public.members (id) on delete cascade,
  service_unit_id uuid        not null references public.service_units (id) on delete restrict,
  assigned_at     timestamptz not null default now(),
  assigned_by     uuid,
  constraint member_service_units_unique unique (member_id, service_unit_id)
);

create index if not exists member_service_units_member_idx on public.member_service_units (member_id);
create index if not exists member_service_units_unit_idx   on public.member_service_units (service_unit_id);

-- ---------------------------------------------------------------------
-- 3. Configurable custom fields
-- ---------------------------------------------------------------------

create table if not exists public.custom_fields (
  id                uuid primary key default gen_random_uuid(),
  field_key         text        not null unique,
  label             text        not null,
  field_type        text        not null check (field_type in
                      ('short_text', 'long_text', 'select', 'multi_select', 'checkbox',
                       'date', 'number', 'email', 'telephone', 'yes_no')),
  help_text         text,
  is_required       boolean     not null default false,
  default_value     jsonb,
  options           jsonb       not null default '[]'::jsonb,
  validation        jsonb       not null default '{}'::jsonb,
  sort_order        integer     not null default 0,
  is_active         boolean     not null default true,
  show_on_public_form boolean   not null default false,
  show_on_profile   boolean     not null default true,
  show_on_card      boolean     not null default false,
  show_in_table     boolean     not null default false,
  show_in_export    boolean     not null default false,
  is_sensitive      boolean     not null default false,
  required_permission text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists custom_fields_active_idx on public.custom_fields (is_active, sort_order);

create table if not exists public.member_custom_values (
  member_id  uuid        not null references public.members (id) on delete cascade,
  field_id   uuid        not null references public.custom_fields (id) on delete cascade,
  value      jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, field_id)
);

-- ---------------------------------------------------------------------
-- 4. Application users, roles, permissions
-- ---------------------------------------------------------------------

create table if not exists public.app_users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text        not null,
  full_name           text,
  is_active           boolean     not null default true,
  must_change_password boolean    not null default false,
  status              text        not null default 'active' check (status in ('active', 'suspended')),
  suspended_at        timestamptz,
  suspended_by        uuid,
  last_login_at       timestamptz,
  created_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists app_users_email_lower_key on public.app_users (lower(email));

-- Hidden system-level principal. Ordinary role management can never read or
-- write this table: it is excluded from the application role/user APIs and
-- is only ever touched by the privileged service-role code paths.
create table if not exists public.app_principals (
  user_id        uuid primary key references public.app_users (id) on delete cascade,
  principal_type text        not null default 'superadmin' check (principal_type in ('superadmin')),
  created_at     timestamptz not null default now(),
  created_by     uuid
);

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  is_system   boolean     not null default false,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  key         text primary key,
  label       text        not null,
  description text,
  category    text        not null default 'general',
  sort_order  integer     not null default 0
);

create table if not exists public.role_permissions (
  role_id        uuid        not null references public.roles (id) on delete cascade,
  permission_key text        not null references public.permissions (key) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists public.user_roles (
  user_id    uuid        not null references public.app_users (id) on delete cascade,
  role_id    uuid        not null references public.roles (id) on delete cascade,
  assigned_by uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists user_roles_role_idx on public.user_roles (role_id);

-- Explicit per-user grants/denials layered on top of role permissions.
create table if not exists public.user_permission_overrides (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references public.app_users (id) on delete cascade,
  permission_key text        not null references public.permissions (key) on delete cascade,
  effect         text        not null check (effect in ('allow', 'deny')),
  created_by     uuid,
  created_at     timestamptz not null default now(),
  constraint user_permission_overrides_unique unique (user_id, permission_key)
);

-- Optional record scoping: a user restricted to service units can only see
-- members assigned to those units (or members with no unit assignment, when
-- the scope is inclusive).
create table if not exists public.user_service_unit_scopes (
  user_id        uuid        not null references public.app_users (id) on delete cascade,
  service_unit_id uuid       not null references public.service_units (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, service_unit_id)
);

-- ---------------------------------------------------------------------
-- 5. Consent, duplicates, audit, settings, abuse control
-- ---------------------------------------------------------------------

create table if not exists public.registration_consents (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid        not null references public.members (id) on delete cascade,
  notice_version      text        not null,
  consented_at        timestamptz not null default now(),
  status              text        not null default 'granted' check (status in ('granted', 'withdrawn')),
  is_child_registration boolean   not null default false,
  guardian_name       text,
  guardian_relationship text,
  guardian_phone      text,
  source              text        not null default 'public_form'
);

create index if not exists registration_consents_member_idx on public.registration_consents (member_id);

create table if not exists public.duplicate_flags (
  id             uuid primary key default gen_random_uuid(),
  member_a_id    uuid        not null references public.members (id) on delete cascade,
  member_b_id    uuid        not null references public.members (id) on delete cascade,
  match_reason   text        not null,
  match_score    numeric(5,2) not null default 0,
  status         text        not null default 'pending' check (status in ('pending', 'confirmed', 'distinct', 'resolved')),
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint duplicate_flags_unique unique (member_a_id, member_b_id),
  constraint duplicate_flags_not_self check (member_a_id <> member_b_id)
);

create index if not exists duplicate_flags_status_idx on public.duplicate_flags (status, created_at desc);

create table if not exists public.audit_events (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email   text,
  action        text        not null,
  entity_type   text,
  entity_id     uuid,
  entity_ref    text,
  summary       jsonb       not null default '{}'::jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists audit_events_actor_idx   on public.audit_events (actor_user_id);
create index if not exists audit_events_action_idx  on public.audit_events (action);

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb       not null default '{}'::jsonb,
  description text,
  updated_by  uuid,
  updated_at  timestamptz not null default now()
);

-- Lightweight abuse tracker used for public registration rate limiting.
create table if not exists public.abuse_events (
  id         bigserial primary key,
  bucket     text        not null,
  identifier text        not null,
  created_at timestamptz not null default now()
);

create index if not exists abuse_events_lookup_idx on public.abuse_events (bucket, identifier, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Reference number generation (collision safe under concurrency)
-- ---------------------------------------------------------------------

create sequence if not exists public.member_reference_seq;

create or replace function public.next_member_reference()
returns text
language plpgsql
as $$
declare
  v_year integer := extract(year from now());
  v_seq  bigint;
begin
  select nextval('public.member_reference_seq') into v_seq;
  return 'LFC-LH-' || v_year::text || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- 7. updated_at maintenance
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'service_units', 'titles', 'members', 'custom_fields',
    'app_users', 'roles', 'member_custom_values'
  ] loop
    execute format('drop trigger if exists trg_set_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger trg_set_updated_at_%s before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;
