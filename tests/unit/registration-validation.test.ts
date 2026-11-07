import { describe, expect, it, vi } from "vitest";
import { registerMember } from "@/lib/members/register";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/clients", () => ({ createAdminSupabaseClient: async () => ({ rpc }) }));

import {
  adminMemberSchema,
  combineMemberName,
  registrationSchema,
} from "@/lib/validation/registration";

const validPayload = {
  titleId: "11111111-1111-4111-8111-111111111111",
  surname: "Okafor",
  firstName: "John",
  otherNames: "Ade",
  gender: "male" as const,
  ageCategory: "adult" as const,
  birthDay: 15,
  birthMonth: 6,
  serviceUnitIds: [],
  primaryPhone: "+2348012345678",
  whatsappSameAsPrimary: true,
  whatsappPhone: "",
  additionalPhones: [],
  email: "john@example.com",
  residentialAddress: "12 Unity Street, Laderin, Ogun State",
  membershipDuration: "y1_3" as const,
  suggestions: "",
  photo: null,
  consentAccepted: true,
  isChildRegistration: false,
  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  customValues: {},
  submissionId: "submission-abc-123",
};

describe("registrationSchema", () => {
  it("accepts a complete, valid submission", () => {
    const result = registrationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts blank and partially supplied next-of-kin details", () => {
    expect(registrationSchema.safeParse({
      ...validPayload, nextOfKinFullName: "", nextOfKinPhone: "", nextOfKinRelationship: "", nextOfKinAddress: "",
    }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...validPayload, nextOfKinFullName: "Mary Okafor" }).success).toBe(true);
  });

  it("validates a next-of-kin phone only when supplied", () => {
    expect(registrationSchema.safeParse({ ...validPayload, nextOfKinPhone: "+2348023456789" }).success).toBe(true);
    const result = registrationSchema.safeParse({ ...validPayload, nextOfKinPhone: "123" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.includes("nextOfKinPhone"))).toBe(true);
  });

  it.each([
    ["nextOfKinFullName", 200], ["nextOfKinRelationship", 80], ["nextOfKinAddress", 500],
  ])("bounds the optional %s field", (field, limit) => {
    expect(registrationSchema.safeParse({ ...validPayload, [field]: "a".repeat(Number(limit) + 1) }).success).toBe(false);
  });

  it("requires the consent acknowledgement", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      consentAccepted: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("consentAccepted"))).toBe(
        true
      );
    }
  });

  it("requires a surname", () => {
    for (const surname of ["", "   "]) {
      expect(registrationSchema.safeParse({ ...validPayload, surname }).success).toBe(false);
    }
  });

  it("allows surname-only registration", () => {
    const result = registrationSchema.safeParse({ ...validPayload, firstName: "", otherNames: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(combineMemberName(result.data)).toBe("Okafor");
  });

  it("normalises whitespace in each name and combines surname first", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      surname: "  Okafor  ",
      firstName: " John ",
      otherNames: " Ade   James ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.surname).toBe("Okafor");
      expect(result.data.otherNames).toBe("Ade James");
      expect(combineMemberName(result.data)).toBe("Okafor John Ade James");
    }
  });

  it("rejects a combined name longer than the storage limit", () => {
    expect(registrationSchema.safeParse({ ...validPayload, surname: "a".repeat(150), firstName: "b".repeat(100) }).success).toBe(false);
  });

  it("requires a title", () => {
    expect(registrationSchema.safeParse({ ...validPayload, titleId: "" }).success).toBe(
      false
    );
  });

  it("rejects an invalid gender", () => {
    expect(
      registrationSchema.safeParse({ ...validPayload, gender: "other" }).success
    ).toBe(false);
  });

  it("rejects an invalid age category", () => {
    expect(
      registrationSchema.safeParse({ ...validPayload, ageCategory: "senior" }).success
    ).toBe(false);
  });

  it("rejects an invalid membership duration", () => {
    expect(
      registrationSchema.safeParse({ ...validPayload, membershipDuration: "30y" })
        .success
    ).toBe(false);
  });

  it("allows the day and month of birth to be omitted", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      birthDay: undefined,
      birthMonth: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a day without a month", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      birthDay: 15,
      birthMonth: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a month without a day", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      birthDay: undefined,
      birthMonth: 6,
    });
    expect(result.success).toBe(false);
  });

  it("accepts 29 February for a leap-day birth date", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      birthDay: 29,
      birthMonth: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects 30 February", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      birthDay: 30,
      birthMonth: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects 31 April", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      birthDay: 31,
      birthMonth: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number that is too short", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      primaryPhone: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty optional email address", () => {
    const result = registrationSchema.safeParse({ ...validPayload, email: "" });
    expect(result.success).toBe(true);
  });

  it("requires a guardian name for a child registration", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      ageCategory: "child",
      isChildRegistration: true,
      guardianName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("guardianName"))
      ).toBe(true);
    }
  });

  it("accepts a child registration with a guardian", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      ageCategory: "child",
      isChildRegistration: true,
      guardianName: "Mary Okafor",
      guardianRelationship: "Mother",
      guardianPhone: "+2348023456789",
    });
    expect(result.success).toBe(true);
  });

  it("requires a short submission id for idempotency", () => {
    expect(registrationSchema.safeParse({ ...validPayload, submissionId: "x" }).success).toBe(
      false
    );
  });
});

describe("adminMemberSchema", () => {
  it("accepts an administrator payload without public-only fields", () => {
    const adminPayload = Object.fromEntries(
      Object.entries(validPayload).filter(
        ([key]) => key !== "consentAccepted" && key !== "submissionId"
      )
    );

    expect(adminMemberSchema.safeParse(adminPayload).success).toBe(true);
  });
});

describe("next-of-kin registration persistence", () => {
  it.each([false, true])("forwards optional details to the transactional RPC (populated: %s)", async (populated) => {
    rpc.mockResolvedValue({ data: [{ member_id: "member-1", reference_no: "LFC-1", duplicate_flagged: false }], error: null });
    const input = {
      ...validPayload,
      photoPublicId: null, photoFormat: null, photoWidth: null, photoHeight: null, photoBytes: null,
      consent: { noticeVersion: "1", isChildRegistration: false, guardianName: null, guardianRelationship: null, guardianPhone: null },
      nextOfKinFullName: populated ? " Mary Okafor " : "",
      nextOfKinPhone: populated ? " +2348023456789 " : "",
      nextOfKinRelationship: populated ? " Sister " : "",
      nextOfKinAddress: populated ? " 10 Church Street " : "",
    };
    await registerMember(input);
    expect(rpc).toHaveBeenLastCalledWith("create_member_registration_named", { p_registration: expect.objectContaining({
      p_next_of_kin_full_name: populated ? "Mary Okafor" : null,
      p_next_of_kin_phone: populated ? "+2348023456789" : null,
      p_next_of_kin_relationship: populated ? "Sister" : null,
      p_next_of_kin_address: populated ? "10 Church Street" : null,
    }) });
  });
});
