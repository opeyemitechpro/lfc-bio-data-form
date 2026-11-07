alter table public.members
  add column if not exists next_of_kin_full_name text check (char_length(next_of_kin_full_name) <= 200),
  add column if not exists next_of_kin_phone text check (char_length(next_of_kin_phone) <= 30),
  add column if not exists next_of_kin_relationship text check (char_length(next_of_kin_relationship) <= 80),
  add column if not exists next_of_kin_address text check (char_length(next_of_kin_address) <= 500);

insert into public.service_units (name, slug, sort_order) values
  ('Youth Alive Fellowship', 'youth-alive-fellowship', 120),
  ('Security', 'security', 130),
  ('Gilead Medical', 'gilead-medical', 140),
  ('Decoration', 'decoration', 150)
on conflict (slug) do update set name = excluded.name, is_active = true;

create or replace function public.create_member_registration_named(p_registration jsonb)
returns table (member_id uuid, reference_no text, duplicate_flagged boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
  v_surname text := trim(regexp_replace(p_registration->>'p_surname', '\s+', ' ', 'g'));
  v_first_name text := nullif(trim(regexp_replace(p_registration->>'p_first_name', '\s+', ' ', 'g')), '');
  v_other_names text := nullif(trim(regexp_replace(p_registration->>'p_other_names', '\s+', ' ', 'g')), '');
  v_full_name text;
begin
  if v_surname is null or char_length(v_surname) < 2 then
    raise exception 'A surname of at least two characters is required.';
  end if;
  v_full_name := concat_ws(' ', v_surname, v_first_name, v_other_names);
  if char_length(v_full_name) > 200 then
    raise exception 'The combined name must not exceed 200 characters.';
  end if;

  if nullif(p_registration->>'p_idempotency_key', '') is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_registration->>'p_idempotency_key', 0));
    return query select m.id, m.reference_no, false
      from public.members m
      where m.idempotency_key = p_registration->>'p_idempotency_key';
    if found then return; end if;
  end if;

  select * into v_result from public.create_member_registration(
    p_full_name := v_full_name,
    p_title_id := (p_registration->>'p_title_id')::uuid,
    p_gender := p_registration->>'p_gender',
    p_age_category := p_registration->>'p_age_category',
    p_birth_day := (p_registration->>'p_birth_day')::integer,
    p_birth_month := (p_registration->>'p_birth_month')::integer,
    p_primary_phone := p_registration->>'p_primary_phone',
    p_primary_phone_normalized := p_registration->>'p_primary_phone_normalized',
    p_whatsapp_same_as_primary := (p_registration->>'p_whatsapp_same_as_primary')::boolean,
    p_whatsapp_phone := p_registration->>'p_whatsapp_phone',
    p_whatsapp_phone_normalized := p_registration->>'p_whatsapp_phone_normalized',
    p_email := p_registration->>'p_email',
    p_email_normalized := p_registration->>'p_email_normalized',
    p_residential_address := p_registration->>'p_residential_address',
    p_membership_duration := p_registration->>'p_membership_duration',
    p_suggestions := p_registration->>'p_suggestions',
    p_photo_public_id := p_registration->>'p_photo_public_id',
    p_photo_format := p_registration->>'p_photo_format',
    p_photo_width := (p_registration->>'p_photo_width')::integer,
    p_photo_height := (p_registration->>'p_photo_height')::integer,
    p_photo_bytes := (p_registration->>'p_photo_bytes')::integer,
    p_registration_source := p_registration->>'p_registration_source',
    p_created_by := (p_registration->>'p_created_by')::uuid,
    p_idempotency_key := p_registration->>'p_idempotency_key',
    p_service_unit_ids := array(select jsonb_array_elements_text(nullif(p_registration->'p_service_unit_ids', 'null'::jsonb))::uuid),
    p_additional_phones := nullif(p_registration->'p_additional_phones', 'null'::jsonb),
    p_custom_values := p_registration->'p_custom_values',
    p_notice_version := p_registration->>'p_notice_version',
    p_is_child_registration := (p_registration->>'p_is_child_registration')::boolean,
    p_guardian_name := p_registration->>'p_guardian_name',
    p_guardian_relationship := p_registration->>'p_guardian_relationship',
    p_guardian_phone := p_registration->>'p_guardian_phone'
  );

  update public.members set
    surname = v_surname,
    first_name = v_first_name,
    other_names = v_other_names,
    next_of_kin_full_name = nullif(trim(p_registration->>'p_next_of_kin_full_name'), ''),
    next_of_kin_phone = nullif(trim(p_registration->>'p_next_of_kin_phone'), ''),
    next_of_kin_relationship = nullif(trim(p_registration->>'p_next_of_kin_relationship'), ''),
    next_of_kin_address = nullif(trim(p_registration->>'p_next_of_kin_address'), '')
    where id = v_result.member_id;

  return query select v_result.member_id, v_result.reference_no, v_result.duplicate_flagged;
end;
$$;

revoke all on function public.create_member_registration_named(jsonb) from public, anon, authenticated;
grant execute on function public.create_member_registration_named(jsonb) to service_role;