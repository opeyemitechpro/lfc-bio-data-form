/**
 * The permission catalogue.
 *
 * This module contains only plain constants, so it is safe to import from
 * client components (for example, to decide which navigation items to
 * show). The actual authorization decisions are always made on the
 * server — see `src/lib/auth/permissions.ts`.
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  MEMBERS_VIEW: "members.view",
  MEMBERS_CREATE: "members.create",
  MEMBERS_EDIT: "members.edit",
  MEMBERS_DELETE: "members.delete",
  MEMBERS_VIEW_PHOTO: "members.view_photo",
  MEMBERS_MANAGE_PHOTO: "members.manage_photo",
  EXPORT_CSV: "export.csv",
  EXPORT_EXCEL: "export.excel",
  EXPORT_PDF: "export.pdf",
  PRINT_TABLE: "print.table",
  PRINT_CARD: "print.card",
  PRINT_BULK_CARDS: "print.bulk_cards",
  DUPLICATES_VIEW: "duplicates.view",
  DUPLICATES_RESOLVE: "duplicates.resolve",
  SERVICE_UNITS_MANAGE: "service_units.manage",
  TITLES_MANAGE: "titles.manage",
  CUSTOM_FIELDS_MANAGE: "custom_fields.manage",
  FORM_SETTINGS_MANAGE: "form_settings.manage",
  AUDIT_VIEW: "audit.view",
  USERS_MANAGE: "users.manage",
  USERS_ACTIVATE: "users.activate",
  ROLES_MANAGE: "roles.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

/** Human-readable labels for the permission keys. */
export const PERMISSION_LABELS: Record<string, string> = {
  "dashboard.view": "Access dashboard",
  "members.view": "View member records",
  "members.create": "Create member records",
  "members.edit": "Edit member records",
  "members.delete": "Delete member records",
  "members.view_photo": "View photographs",
  "members.manage_photo": "Manage photographs",
  "export.csv": "Export CSV",
  "export.excel": "Export Excel",
  "export.pdf": "Export PDF",
  "print.table": "Print member tables",
  "print.card": "Print individual member cards",
  "print.bulk_cards": "Print bulk member cards",
  "duplicates.view": "View duplicate alerts",
  "duplicates.resolve": "Resolve duplicates",
  "service_units.manage": "Manage service units",
  "titles.manage": "Manage titles",
  "custom_fields.manage": "Manage custom fields",
  "form_settings.manage": "Manage form settings",
  "audit.view": "View audit logs",
  "users.manage": "Manage ordinary users",
  "users.activate": "Activate and suspend users",
  "roles.manage": "Manage roles and permissions",
  "settings.manage": "Manage application settings",
};
