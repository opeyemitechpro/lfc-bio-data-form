// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { RegistrationForm } from "@/components/register/registration-form";
import { submitRegistration } from "@/app/register/actions";

vi.mock("@/app/register/actions", () => ({ submitRegistration: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/components/register/photo-capture", () => ({
  PhotoCapture: ({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) => (
    <button type="button" onClick={() => onChange({ publicId: "members/photo", format: "jpg", width: 320, height: 400, bytes: 1000 })}>
      {value ? "Photo uploaded" : "Upload test photo"}
    </button>
  ),
}));
vi.mock("@/components/members/member-photo", () => ({
  MemberPhoto: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: () => <option value="">Select</option>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const props: ComponentProps<typeof RegistrationForm> = {
  titles: [{ id: "11111111-1111-4111-8111-111111111111", name: "Brother", slug: "brother", is_active: true, sort_order: 0 }],
  serviceUnits: ["Youth Alive Fellowship", "Security", "Gilead Medical", "Decoration"].map((name, index) => ({
    id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    description: null,
    is_active: true,
    sort_order: index,
  })),
  customFields: [],
  privacyNotice: { version: "1", organisation: "LFC Laderin", contactEmail: "office@example.com", contactPhone: "", retentionYears: 5, thirdParties: [] },
  formSettings: { requireAddress: false, maxUploadBytes: 5000000, acceptsChildren: true, requireGuardianConsent: true, allowAdditionalPhones: true, allowSuggestions: true },
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.mocked(submitRegistration).mockResolvedValue({ ok: true, data: { referenceNo: "LFC-123" } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function completeRequiredFields() {
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: props.titles[0].id } });
  fireEvent.change(screen.getByLabelText(/^Surname/), { target: { value: "Okafor" } });
  fireEvent.change(screen.getByLabelText(/Primary phone number/), { target: { value: "+2348012345678" } });
  fireEvent.click(screen.getByLabelText(/I have read the privacy notice/));
}

it("requires a surname before showing review and never submits incomplete data", async () => {
  render(<RegistrationForm {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await waitFor(() => expect(screen.getByText(/Please enter your surname/)).toBeTruthy());
  expect(screen.queryByRole("heading", { name: "Review registration" })).toBeNull();
  expect(submitRegistration).not.toHaveBeenCalled();
});

it("reviews, preserves edits and photo, and saves only on final confirmation", async () => {
  render(<RegistrationForm {...props} />);
  completeRequiredFields();
  fireEvent.change(screen.getByLabelText(/^First name/), { target: { value: "John" } });
  fireEvent.change(screen.getByLabelText(/^Other names/), { target: { value: "Ade" } });
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "john@example.com" } });
  fireEvent.change(screen.getByLabelText(/Residential address/), { target: { value: "12 Unity Street" } });
  fireEvent.change(screen.getByLabelText(/^Next-of-kin full name/), { target: { value: "Mary Okafor" } });
  fireEvent.change(screen.getByLabelText(/^Next-of-kin phone number/), { target: { value: "+2348023456789" } });
  fireEvent.change(screen.getByLabelText(/^Next-of-kin relationship/), { target: { value: "Sister" } });
  fireEvent.change(screen.getByLabelText(/^Next-of-kin current address/), { target: { value: "10 Church Street" } });
  fireEvent.change(screen.getByLabelText(/Suggestions or observations/), { target: { value: "Thank you" } });
  fireEvent.click(screen.getByRole("button", { name: "Upload test photo" }));
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await screen.findByRole("heading", { name: "Review registration" });
  for (const value of ["Okafor", "John", "Ade", "john@example.com", "12 Unity Street", "Thank you", "Mary Okafor", "+2348023456789", "Sister", "10 Church Street"]) {
    expect(screen.getByText(value)).toBeTruthy();
  }
  expect(screen.getByRole("img", { name: "Registration passport photograph" })).toBeTruthy();
  expect(submitRegistration).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
  expect((screen.getByLabelText(/^Next-of-kin full name/) as HTMLInputElement).value).toBe("Mary Okafor");
  expect((screen.getByLabelText(/^First name/) as HTMLInputElement).value).toBe("John");
  expect(screen.getByRole("button", { name: "Photo uploaded" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/^First name/), { target: { value: "James" } });
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await screen.findByText("James");
  fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));
  await screen.findByText("Registration received");
  expect(submitRegistration).toHaveBeenCalledTimes(1);
  expect(submitRegistration).toHaveBeenCalledWith(expect.objectContaining({ surname: "Okafor", firstName: "James", otherNames: "Ade", nextOfKinFullName: "Mary Okafor", nextOfKinPhone: "+2348023456789", nextOfKinRelationship: "Sister", nextOfKinAddress: "10 Church Street", photo: expect.objectContaining({ publicId: "members/photo" }) }));
}, 15000);

it("allows surname-only review and lets the user retry a failed final submission", async () => {
  vi.mocked(submitRegistration).mockRejectedValueOnce(new Error("Offline"));
  render(<RegistrationForm {...props} />);
  completeRequiredFields();
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await screen.findByRole("heading", { name: "Review registration" });
  expect(screen.queryByText("Privacy consent")).toBeNull();
  expect(screen.queryByText("Privacy notice version")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));
  await screen.findByText(/We could not submit your registration/);
  fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));
  await screen.findByText("Registration received");
  expect(submitRegistration).toHaveBeenLastCalledWith(expect.objectContaining({ firstName: "", otherNames: "" }));
});

it("checks the configured address requirement before review", async () => {
  render(<RegistrationForm {...props} formSettings={{ ...props.formSettings, requireAddress: true }} />);
  completeRequiredFields();
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await screen.findByText("Your residential address is required.");
  expect(screen.queryByRole("heading", { name: "Review registration" })).toBeNull();
  expect(submitRegistration).not.toHaveBeenCalled();
});

it("retains mandatory consent without the privacy notice section", async () => {
  render(<RegistrationForm {...props} />);
  expect(screen.queryByText("Privacy notice and consent")).toBeNull();
  expect(screen.getByLabelText(/I have read the privacy notice/)).toBeTruthy();
  completeRequiredFields();
  fireEvent.click(screen.getByLabelText(/I have read the privacy notice/));
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await screen.findByText(/Please confirm that you have read and accept the privacy notice/);
  expect(screen.queryByRole("heading", { name: "Review registration" })).toBeNull();
});

it("reviews and submits all four added service units", async () => {
  render(<RegistrationForm {...props} />);
  completeRequiredFields();
  for (const unit of props.serviceUnits) fireEvent.click(screen.getByLabelText(unit.name, { exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Review registration" }));
  await screen.findByText(props.serviceUnits.map((unit) => unit.name).join(", "));
  fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));
  await screen.findByText("Registration received");
  expect(submitRegistration).toHaveBeenCalledWith(expect.objectContaining({ serviceUnitIds: props.serviceUnits.map((unit) => unit.id) }));
});