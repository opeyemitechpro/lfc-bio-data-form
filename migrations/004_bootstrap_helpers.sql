-- =====================================================================
-- Living Faith Church International — Laderin-Hilltop
-- Migration 004: Bootstrap helper functions
-- =====================================================================
-- The superadmin is provisioned by a privileged Node script (scripts/
-- bootstrap-admin.mjs) that uses the service-role key. It:
--   1. creates the Supabase Auth identity,
--   2. creates the app_users row,
--   3. inserts the hidden app_principals row,
--   4. assigns any requested operational roles.
--
-- The function below is used to grant the principal privilege idempotently
-- and is intentionally restricted to the service role.
-- =====================================================================

create or replace function public.grant_superadmin_principal(p_user_id uuid, p_created_by uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_users where id = p_user_id) then
    raise exception 'app_users row % does not exist', p_user_id;
  end if;

  insert into public.app_principals (user_id, principal_type, created_by)
  values (p_user_id, 'superadmin', p_created_by)
  on conflict (user_id) do update set principal_type = 'superadmin';
end;
$$;

revoke all on function public.grant_superadmin_principal(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_superadmin_principal(uuid, uuid) to service_role;

-- Convenience view that lists ordinary application users only. The hidden
-- superadmin principal is filtered out so it never appears in user
-- directories, user pickers or user-management screens.
create or replace view public.app_users_directory
with (security_invoker = true)
as
select
  u.id,
  u.email,
  u.full_name,
  u.status,
  u.is_active,
  u.must_change_password,
  u.last_login_at,
  u.created_at
from public.app_users u
where not exists (
  select 1 from public.app_principals ap where ap.user_id = u.id
);
