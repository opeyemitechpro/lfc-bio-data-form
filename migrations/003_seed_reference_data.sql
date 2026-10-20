-- =====================================================================
-- Living Faith Church International — Laderin-Hilltop
-- Migration 003: Seed reference data (permissions, roles, titles, units)
-- =====================================================================
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permission catalogue
-- ---------------------------------------------------------------------
insert into public.permissions (key, label, description, category, sort_order) values
  ('dashboard.view',      'Access dashboard',            'View the administrative dashboard and statistics.',        'dashboard', 10),
  ('members.view',        'View member records',         'View the member directory and individual member profiles.', 'members', 20),
  ('members.create',      'Create member records',       'Add new member records manually.',                       'members', 21),
  ('members.edit',        'Edit member records',         'Modify existing member records.',                         'members', 22),
  ('members.delete',      'Delete member records',       'Soft delete and restore member records.',                 'members', 23),
  ('members.view_photo',  'View photographs',            'See member passport photographs.',                        'members', 24),
  ('members.manage_photo','Manage photographs',          'Upload, replace or remove member photographs.',          'members', 25),
  ('export.csv',          'Export CSV',                  'Download member records as CSV.',                         'export', 30),
  ('export.excel',        'Export Excel',                'Download member records as .xlsx.',                       'export', 31),
  ('export.pdf',          'Export PDF',                  'Download member records as PDF.',                         'export', 32),
  ('print.table',         'Print member tables',         'Print the member directory as a table.',                  'print', 40),
  ('print.card',          'Print individual member cards','Print a single member card.',                            'print', 41),
  ('print.bulk_cards',    'Print bulk member cards',     'Print member cards for many members at once.',            'print', 42),
  ('duplicates.view',     'View duplicate alerts',       'Review members flagged as possible duplicates.',          'duplicates', 50),
  ('duplicates.resolve',  'Resolve duplicates',          'Confirm or dismiss possible duplicate records.',           'duplicates', 51),
  ('service_units.manage','Manage service units',        'Add, rename, deactivate and reorder service units.',       'configuration', 60),
  ('titles.manage',       'Manage titles',               'Add, rename, deactivate and reorder member titles.',       'configuration', 61),
  ('custom_fields.manage','Manage custom fields',        'Create and configure database-driven custom fields.',      'configuration', 62),
  ('form_settings.manage','Manage form settings',        'Configure the public registration form behaviour.',        'configuration', 63),
  ('audit.view',          'View audit logs',             'Review the administrative audit trail.',                   'audit', 70),
  ('users.manage',        'Manage ordinary users',       'Create, edit and deactivate administrative accounts.',    'users', 80),
  ('users.activate',      'Activate and suspend users',  'Suspend or reactivate administrative accounts.',          'users', 81),
  ('roles.manage',        'Manage roles and permissions','Create roles and assign granular permissions.',          'users', 82),
  ('settings.manage',     'Manage application settings', 'Change organisation-wide settings and the privacy notice.', 'settings', 90)
on conflict (key) do update
  set label       = excluded.label,
      description = excluded.description,
      category    = excluded.category,
      sort_order  = excluded.sort_order;

-- ---------------------------------------------------------------------
-- Seed roles
-- ---------------------------------------------------------------------

-- Resident Pastor: near-full operational access, no role/user administration.
insert into public.roles (id, name, description, is_system)
values ('00000000-0000-4000-8000-000000000001', 'Resident Pastor',
        'Full oversight of members, units and reporting. Cannot manage roles or users.', true)
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- Technical Unit: manages the register and media/photographs.
insert into public.roles (id, name, description, is_system)
values ('00000000-0000-4000-8000-000000000002', 'Technical Unit',
        'Registers members, manages photographs and produces reports.', true)
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- Viewer: read-only.
insert into public.roles (id, name, description, is_system)
values ('00000000-0000-4000-8000-000000000003', 'Viewer',
        'Read-only access to the member directory and member profiles.', true)
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- Resident Pastor permissions
insert into public.role_permissions (role_id, permission_key)
select '00000000-0000-4000-8000-000000000001', p.key
from public.permissions p
where p.key in (
  'dashboard.view','members.view','members.create','members.edit','members.delete',
  'members.view_photo','members.manage_photo',
  'export.csv','export.excel','export.pdf',
  'print.table','print.card','print.bulk_cards',
  'duplicates.view','duplicates.resolve',
  'service_units.manage','titles.manage','custom_fields.manage','form_settings.manage',
  'audit.view','settings.manage'
)
on conflict do nothing;

-- Technical Unit permissions
insert into public.role_permissions (role_id, permission_key)
select '00000000-0000-4000-8000-000000000002', p.key
from public.permissions p
where p.key in (
  'dashboard.view','members.view','members.create','members.edit',
  'members.view_photo','members.manage_photo',
  'export.csv','export.excel','export.pdf',
  'print.table','print.card','print.bulk_cards',
  'duplicates.view','duplicates.resolve'
)
on conflict do nothing;

-- Viewer permissions (read only, no photograph access by default)
insert into public.role_permissions (role_id, permission_key)
select '00000000-0000-4000-8000-000000000003', p.key
from public.permissions p
where p.key in ('dashboard.view','members.view')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Configurable titles
-- ---------------------------------------------------------------------
insert into public.titles (name, slug, sort_order) values
  ('Brother',      'brother',       10),
  ('Sister',       'sister',        20),
  ('Deacon',       'deacon',        30),
  ('Deaconess',    'deaconess',     40),
  ('Pastor',       'pastor',        50),
  ('Pastor (Mrs.)','pastor-mrs',    60),
  ('Bishop',       'bishop',        70),
  ('Apostle',      'apostle',       80),
  ('Reverend',     'reverend',      90),
  ('Elder',        'elder',        100),
  ('Other',        'other',        110),
  ('No title',     'no-title',     120)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order,
      is_active = true;

-- ---------------------------------------------------------------------
-- Service units
-- ---------------------------------------------------------------------
insert into public.service_units (name, slug, sort_order) values
  ('Choir',             'choir',              10),
  ('Ushering',          'ushering',           20),
  ('Sanctuary Keepers', 'sanctuary-keepers',  30),
  ('Protocol',          'protocol',           40),
  ('Children''s Church','childrens-church',   50),
  ('Media',             'media',              60),
  ('Technical Unit',    'technical-unit',     70),
  ('Hospitality',       'hospitality',        80),
  ('Prayer',            'prayer',             90),
  ('Evangelism',        'evangelism',        100),
  ('Others',            'others',            110)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order,
      is_active = true;

-- ---------------------------------------------------------------------
-- Application settings defaults
-- ---------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('privacy_notice', '{"version":"1.0","updatedAt":"2026-01-01","contactEmail":"lfc.laderin@example.org","contactPhone":"+234","retentionYears":7,"organisation":"Living Faith Church International — Laderin-Hilltop","thirdParties":["Supabase (hosting, database and authentication)","Vercel (application hosting)","Cloudinary (photograph storage and delivery)"]}',
   'Privacy notice shown on the public registration form. Editable by the superadmin.'),
  ('form_settings', '{"requireAddress":true,"maxUploadBytes":5242880,"acceptsChildren":true,"requireGuardianConsent":true,"allowAdditionalPhones":true,"allowSuggestions":true,"successMessage":"Thank you. Your registration has been received."}',
   'Public registration form behaviour.'),
  ('retention_policy', '{"memberYears":7,"deletedRecordMonths":24,"photoDeletionOnPermanentDelete":true}',
   'Data retention policy applied to member records and photographs.'),
  ('reference_format', '{"prefix":"LFC-LH-","pad":6}',
   'Member reference number format.')
on conflict (key) do update
  set description = excluded.description;
