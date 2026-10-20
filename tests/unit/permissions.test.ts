import { describe, expect, it } from "vitest";

import { ALL_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";

describe("permission catalogue", () => {
  it("contains every permission required by the specification", () => {
    const required = [
      "dashboard.view",
      "members.view",
      "members.create",
      "members.edit",
      "members.delete",
      "members.view_photo",
      "members.manage_photo",
      "export.csv",
      "export.excel",
      "export.pdf",
      "print.table",
      "print.card",
      "print.bulk_cards",
      "duplicates.view",
      "duplicates.resolve",
      "service_units.manage",
      "titles.manage",
      "custom_fields.manage",
      "form_settings.manage",
      "audit.view",
      "users.manage",
      "users.activate",
      "roles.manage",
      "settings.manage",
    ];

    for (const key of required) {
      expect(ALL_PERMISSION_KEYS).toContain(key);
    }
  });

  it("has no duplicate permission keys", () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
  });

  it("exposes the superadmin permissions as a constant", () => {
    expect(PERMISSIONS.MEMBERS_DELETE).toBe("members.delete");
    expect(PERMISSIONS.ROLES_MANAGE).toBe("roles.manage");
  });

  it("uses a namespaced key format", () => {
    for (const key of ALL_PERMISSION_KEYS) {
      expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });
});
