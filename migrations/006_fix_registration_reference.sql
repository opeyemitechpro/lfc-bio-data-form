create or replace function public.create_member_registration(
  p_full_name                text,
  p_title_id                 uuid,
  p_gender                   text,
  p_age_category             text,
  p_birth_day                integer,
  p_birth_month              integer,
  p_primary_phone            text,
  p_primary_phone_normalized text,
  p_whatsapp_same_as_primary boolean,
  p_whatsapp_phone           text,
  p_whatsapp_phone_normalized text,
  p_email                    text,
  p_email_normalized         text,
  p_residential_address      text,
  p_membership_duration      text,
  p_suggestions              text,
  p_photo_public_id          text,
  p_photo_format             text,
  p_photo_width              integer,
  p_photo_height             integer,
  p_photo_bytes              integer,
  p_registration_source      text,
  p_created_by               uuid,
  p_idempotency_key          text,
  p_service_unit_ids         uuid[],
  p_additional_phones        jsonb,
  p_custom_values            jsonb,
  p_notice_version           text,
  p_is_child_registration    boolean,
  p_guardian_name            text,
  p_guardian_relationship    text,
  p_guardian_phone           text
)
returns table (member_id uuid, reference_no text, duplicate_flagged boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id       uuid;
  v_reference       text;
  v_duplicate_count integer := 0;
  v_key             text;
  v_value           jsonb;
  v_field_id        uuid;
  v_other_id        uuid;
  v_score           numeric(5,2);
  v_reason          text;
begin
  if p_full_name is null or char_length(trim(p_full_name)) < 2 then
    raise exception 'A full name is required.';
  end if;

  if p_gender is null or p_gender not in ('male', 'female') then
    raise exception 'A valid gender is required.';
  end if;

  if p_age_category is null or p_age_category not in ('child', 'youth', 'adult') then
    raise exception 'A valid age category is required.';
  end if;

  if p_membership_duration is null or p_membership_duration not in ('lt_1y','y1_3','y4_6','y7_10','gt_10y') then
    raise exception 'A valid membership duration is required.';
  end if;

  if p_primary_phone_normalized is null or p_primary_phone_normalized = '' then
    raise exception 'A primary phone number is required.';
  end if;

  if p_notice_version is null or p_notice_version = '' then
    raise exception 'A consent notice version is required.';
  end if;

  if p_is_child_registration and (p_guardian_name is null or p_guardian_name = '') then
    raise exception 'A parent or guardian name is required for child registrations.';
  end if;

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select m.id, m.reference_no into v_member_id, v_reference
    from public.members m
    where m.idempotency_key = p_idempotency_key
    limit 1;

    if v_member_id is not null then
      return query select v_member_id, v_reference, false;
      return;
    end if;
  end if;

  v_reference := public.next_member_reference();

  insert into public.members (
    reference_no, full_name, title_id, gender, age_category, birth_day, birth_month,
    primary_phone, primary_phone_normalized, whatsapp_same_as_primary,
    whatsapp_phone, whatsapp_phone_normalized, email, email_normalized,
    residential_address, membership_duration, suggestions,
    photo_public_id, photo_format, photo_width, photo_height, photo_bytes,
    photo_uploaded_at, registration_source, idempotency_key, created_by, updated_by
  ) values (
    v_reference, trim(p_full_name), p_title_id, p_gender, p_age_category,
    p_birth_day, p_birth_month,
    p_primary_phone, p_primary_phone_normalized, p_whatsapp_same_as_primary,
    p_whatsapp_phone, p_whatsapp_phone_normalized, p_email, p_email_normalized,
    p_residential_address, p_membership_duration, p_suggestions,
    p_photo_public_id, p_photo_format, p_photo_width, p_photo_height, p_photo_bytes,
    case when p_photo_public_id is not null then now() else null end,
    p_registration_source, p_idempotency_key, p_created_by, p_created_by
  )
  returning id into v_member_id;

  insert into public.member_phones (member_id, phone, phone_normalized, label, is_primary)
  values (v_member_id, p_primary_phone, p_primary_phone_normalized, 'primary', true);

  if p_whatsapp_same_as_primary then
    insert into public.member_phones (member_id, phone, phone_normalized, label, is_primary)
    values (v_member_id, p_primary_phone, p_primary_phone_normalized, 'whatsapp', false);
  elsif p_whatsapp_phone is not null and p_whatsapp_phone <> '' then
    insert into public.member_phones (member_id, phone, phone_normalized, label, is_primary)
    values (v_member_id, p_whatsapp_phone, p_whatsapp_phone_normalized, 'whatsapp', false);
  end if;

  if p_additional_phones is not null and jsonb_typeof(p_additional_phones) = 'array' then
    for v_key in select jsonb_array_elements_text(p_additional_phones) loop
      if v_key is not null and v_key <> '' then
        insert into public.member_phones (member_id, phone, phone_normalized, label, is_primary)
        values (v_member_id, v_key, v_key, 'other', false);
      end if;
    end loop;
  end if;

  if p_service_unit_ids is not null and array_length(p_service_unit_ids, 1) > 0 then
    insert into public.member_service_units (member_id, service_unit_id, assigned_by)
    select v_member_id, su.id, p_created_by
    from public.service_units su
    where su.id = any(p_service_unit_ids) and su.is_active
    on conflict on constraint member_service_units_unique do nothing;
  end if;

  if p_custom_values is not null and jsonb_typeof(p_custom_values) = 'object' then
    for v_key, v_value in select key, value from jsonb_each(p_custom_values) loop
      select cf.id into v_field_id
      from public.custom_fields cf
      where cf.field_key = v_key and cf.is_active;

      if v_field_id is not null then
        insert into public.member_custom_values (member_id, field_id, value)
        values (v_member_id, v_field_id, v_value)
        on conflict on constraint member_custom_values_pkey do update
          set value = excluded.value, updated_at = now();
      end if;
    end loop;
  end if;

  insert into public.registration_consents (
    member_id, notice_version, consented_at, status,
    is_child_registration, guardian_name, guardian_relationship, guardian_phone, source
  ) values (
    v_member_id, p_notice_version, now(), 'granted',
    coalesce(p_is_child_registration, false),
    nullif(trim(p_guardian_name), ''),
    nullif(trim(p_guardian_relationship), ''),
    nullif(trim(p_guardian_phone), ''),
    p_registration_source
  );

  for v_other_id, v_score, v_reason in
    select m.id,
           case
             when m.primary_phone_normalized = p_primary_phone_normalized
               or m.whatsapp_phone_normalized = p_primary_phone_normalized
               or m.primary_phone_normalized = p_whatsapp_phone_normalized
               or m.whatsapp_phone_normalized = p_whatsapp_phone_normalized
               then 100
             when p_email_normalized is not null and m.email_normalized = p_email_normalized then 80
             when lower(m.full_name) = lower(trim(p_full_name)) then 60
             else 40
           end as score,
           case
             when (m.primary_phone_normalized = p_primary_phone_normalized
               or m.whatsapp_phone_normalized = p_primary_phone_normalized
               or m.primary_phone_normalized = p_whatsapp_phone_normalized
               or m.whatsapp_phone_normalized = p_whatsapp_phone_normalized)
               and p_email_normalized is not null and m.email_normalized = p_email_normalized
               then 'Matching phone number and email address'
             when m.primary_phone_normalized = p_primary_phone_normalized
               or m.whatsapp_phone_normalized = p_primary_phone_normalized
               or m.primary_phone_normalized = p_whatsapp_phone_normalized
               or m.whatsapp_phone_normalized = p_whatsapp_phone_normalized
               then 'Matching phone number'
             when p_email_normalized is not null and m.email_normalized = p_email_normalized
               then 'Matching email address'
             when lower(m.full_name) = lower(trim(p_full_name))
               then 'Identical full name'
             else 'Similar full name'
           end as reason
    from public.members m
    where m.id <> v_member_id
      and m.status = 'active'
      and (
        m.primary_phone_normalized = p_primary_phone_normalized
        or m.whatsapp_phone_normalized = p_primary_phone_normalized
        or m.primary_phone_normalized = p_whatsapp_phone_normalized
        or m.whatsapp_phone_normalized = p_whatsapp_phone_normalized
        or (p_email_normalized is not null and m.email_normalized = p_email_normalized)
        or lower(m.full_name) = lower(trim(p_full_name))
      )
  loop
    insert into public.duplicate_flags (member_a_id, member_b_id, match_reason, match_score)
    values (
      least(v_member_id, v_other_id),
      greatest(v_member_id, v_other_id),
      v_reason,
      v_score
    )
    on conflict (member_a_id, member_b_id) do nothing;

    v_duplicate_count := v_duplicate_count + 1;
  end loop;

  return query select v_member_id, v_reference, (v_duplicate_count > 0);
end;
$$;

revoke all on function public.create_member_registration(
  text, uuid, text, text, integer, integer, text, text, boolean, text, text,
  text, text, text, text, text, text, text, integer, integer, integer,
  text, uuid, text, uuid[], jsonb, jsonb, text, boolean, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_member_registration(
  text, uuid, text, text, integer, integer, text, text, boolean, text, text,
  text, text, text, text, text, text, text, integer, integer, integer,
  text, uuid, text, uuid[], jsonb, jsonb, text, boolean, text, text, text
) to service_role;