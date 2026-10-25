import { describe, expect, it } from "vitest";

import {
  adminMemberSchema,
  registrationSchema,
} from "@/lib/validation/registration";

const validPayload = {
  titleId: "11111111-1111-4111-8111-111111111111",
  fullName: "John Ade Okafor",
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

  it("requires a full name of at least two characters", () => {
    expect(registrationSchema.safeParse({ ...validPayload, fullName: "J" }).success).toBe(
      false
    );
  });

  it("normalises whitespace in the full name", () => {
    const result = registrationSchema.safeParse({
      ...validPayload,
      fullName: "  John   Ade   Okafor  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("John Ade Okafor");
    }
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
