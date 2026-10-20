"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Loader2,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormErrorBanner,
  FormField,
  FormSuccessBanner,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomFieldInput } from "@/components/register/custom-field-input";
import {
  PhotoCapture,
  type UploadedPhoto,
} from "@/components/register/photo-capture";
import { submitRegistration } from "@/app/register/actions";
import { registrationSchema, type RegistrationFormValues } from "@/lib/validation/registration";
import {
  AGE_CATEGORY_LABELS,
  MEMBERSHIP_DURATION_LABELS,
  NO_SERVICE_UNITS_OPTION,
  type CustomFieldDefinition,
  type ServiceUnitOption,
  type TitleOption,
} from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

interface RegistrationFormProps {
  titles: TitleOption[];
  serviceUnits: ServiceUnitOption[];
  customFields: CustomFieldDefinition[];
  privacyNotice: {
    version: string;
    organisation: string;
    contactEmail: string;
    contactPhone: string;
    retentionYears: number;
    thirdParties: string[];
  };
  formSettings: {
    requireAddress: boolean;
    maxUploadBytes: number;
    acceptsChildren: boolean;
    requireGuardianConsent: boolean;
    allowAdditionalPhones: boolean;
    allowSuggestions: boolean;
  };
}

export function RegistrationForm({
  titles,
  serviceUnits,
  customFields,
  privacyNotice,
  formSettings,
}: RegistrationFormProps) {
  const [submissionId] = React.useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = React.useState<
    Record<string, string>
  >({});
  const [success, setSuccess] = React.useState<string | null>(null);
  const [referenceNo, setReferenceNo] = React.useState<string | null>(null);
  const [photo, setPhoto] = React.useState<UploadedPhoto | null>(null);
  const [noServiceUnits, setNoServiceUnits] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onBlur",
    defaultValues: {
      titleId: "",
      fullName: "",
      gender: "male",
      ageCategory: "adult",
      birthDay: undefined,
      birthMonth: undefined,
      serviceUnitIds: [],
      primaryPhone: "",
      whatsappSameAsPrimary: true,
      whatsappPhone: "",
      additionalPhones: [],
      email: "",
      residentialAddress: "",
      membershipDuration: "lt_1y",
      suggestions: "",
      photo: null,
      consentAccepted: false,
      isChildRegistration: false,
      guardianName: "",
      guardianRelationship: "",
      guardianPhone: "",
      customValues: {},
      submissionId,
    },
  });

  /*
   * `watch` is used to read a few live values (the selected age category,
   * the chosen service units and the extra phone numbers).
   *
   * React Hook Form's `watch()` cannot be memoized safely, so the React
   * Compiler skips optimizing this component. That is expected and
   * harmless here — the form is a single, deliberately uncontrolled
   * surface, and skipping the compiler loses no meaningful optimisation.
   */
  const ageCategory = watch("ageCategory");
  const isChild = ageCategory === "child";
  const selectedUnits = watch("serviceUnitIds") ?? [];
  const additionalPhones = watch("additionalPhones") ?? [];

  // When "No Service Units Yet" is chosen, every other selection is cleared.
  const toggleNoServiceUnits = (checked: boolean) => {
    setNoServiceUnits(checked);
    if (checked) {
      setValue("serviceUnitIds", [], { shouldValidate: false });
    }
  };

  const toggleServiceUnit = (unitId: string, checked: boolean) => {
    if (checked) {
      setNoServiceUnits(false);
      setValue(
        "serviceUnitIds",
        [...selectedUnits.filter((id) => id !== NO_SERVICE_UNITS_OPTION), unitId],
        { shouldValidate: true }
      );
    } else {
      setValue(
        "serviceUnitIds",
        selectedUnits.filter((id) => id !== unitId),
        { shouldValidate: true }
      );
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerFieldErrors({});

    const payload = {
      ...values,
      photo: photo
        ? {
            publicId: photo.publicId,
            format: photo.format,
            width: photo.width,
            height: photo.height,
            bytes: photo.bytes,
          }
        : null,
    };

    const result = await submitRegistration(payload);

    if (result.ok) {
      setSuccess(
        result.message ??
          "Thank you. Your registration has been received and recorded by the church."
      );
      setReferenceNo(result.data?.referenceNo ?? null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setServerError(result.message ?? "Something went wrong. Please try again.");
    if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
    toast.error(result.message ?? "Please check the form and try again.");
  });

  const errorFor = (name: string) =>
    serverFieldErrors[name] ?? (errors as Record<string, { message?: string }>)[name]?.message;

  if (success) {
    return (
      <Card className="border-2 border-success/40">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
            <Check className="size-9" aria-hidden="true" />
          </div>
          <CardTitle className="mt-3 text-2xl">Registration received</CardTitle>
          <CardDescription className="text-base">
            Thank you for registering with Living Faith Church International,
            Laderin-Hilltop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormSuccessBanner message={success} />
          {referenceNo ? (
            <div className="rounded-lg border-2 border-border bg-muted/50 p-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Your membership reference number
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-foreground">
                {referenceNo}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please keep this number safe. The church office may ask for it.
              </p>
            </div>
          ) : null}
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">What happens next?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your details have been saved in the church membership register.</li>
              <li>If a matching record already exists, our administrators will review both records.</li>
              <li>Contact the church office to correct any detail or to request a membership card.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                reset();
                setPhoto(null);
                setSuccess(null);
                setReferenceNo(null);
                setNoServiceUnits(false);
              }}
            >
              Register another member
            </Button>
            <Button type="button" variant="ghost" className="flex-1" asChild>
              <Link href="/">Return to the home page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormErrorBanner message={serverError} />

      {/* ---------------------------------------------------------- */}
      {/* Personal information                                          */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="size-6 text-primary" aria-hidden="true" />
            Personal information
          </CardTitle>
          <CardDescription>
            Please provide your details as they appear on your official documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField
            id="title"
            label="Title"
            required
            error={errorFor("titleId")}
            helpText="Choose the title you use in the church."
          >
            <Controller
              control={control}
              name="titleId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger id="title" aria-invalid={Boolean(errorFor("titleId")) || undefined}>
                    <SelectValue placeholder="Select a title" />
                  </SelectTrigger>
                  <SelectContent>
                    {titles.map((title) => (
                      <SelectItem key={title.id} value={title.id}>
                        {title.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />          </FormField>

          <FormField
            id="fullName"
            label="Full name"
            required
            error={errorFor("fullName")}
            helpText="Enter your first name and surname together."
          >
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="e.g. John Ade Okafor"
              aria-invalid={Boolean(errorFor("fullName")) || undefined}
              {...register("fullName")}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="gender"
              label="Gender"
              required
              error={errorFor("gender")}
            >
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender" aria-invalid={Boolean(errorFor("gender")) || undefined}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              id="ageCategory"
              label="Age category"
              required
              error={errorFor("ageCategory")}
              helpText="Select the range that matches your age today."
            >
              <Controller
                control={control}
                name="ageCategory"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ageCategory" aria-invalid={Boolean(errorFor("ageCategory")) || undefined}>
                      <SelectValue placeholder="Select age category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">
              Date of birth{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </legend>
            <p className="text-sm text-muted-foreground">
              Please give only the day and month. We do not record your year of birth.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
              <FormField id="birthDay" label="Day" error={errorFor("birthDay")}>
                <Controller
                  control={control}
                  name="birthDay"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="birthDay" aria-invalid={Boolean(errorFor("birthDay")) || undefined}>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField id="birthMonth" label="Month" error={errorFor("birthMonth")}>
                <Controller
                  control={control}
                  name="birthMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="birthMonth" aria-invalid={Boolean(errorFor("birthMonth")) || undefined}>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, index) => (
                          <SelectItem key={month} value={String(index + 1)}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* Contact information                                           */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Phone className="size-6 text-primary" aria-hidden="true" />
            Contact information
          </CardTitle>
          <CardDescription>
            We use these details to reach you about church activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField
            id="primaryPhone"
            label="Primary phone number"
            required
            error={errorFor("primaryPhone")}
            helpText="Include the country code, for example +234 801 234 5678."
          >
            <Input
              id="primaryPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+234 801 234 5678"
              aria-invalid={Boolean(errorFor("primaryPhone")) || undefined}
              {...register("primaryPhone")}
            />
          </FormField>

          <div className="space-y-3 rounded-lg border-2 border-border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <Controller
                control={control}
                name="whatsappSameAsPrimary"
                render={({ field }) => (
                  <Checkbox
                    id="whatsappSameAsPrimary"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true);
                      if (checked) setValue("whatsappPhone", "");
                    }}
                  />
                )}
              />
              <Label htmlFor="whatsappSameAsPrimary" className="cursor-pointer text-base">
                My WhatsApp number is the same as my primary phone number
              </Label>
            </div>

            {watch("whatsappSameAsPrimary") ? null : (
              <FormField
                id="whatsappPhone"
                label="WhatsApp number"
                optional
                error={errorFor("whatsappPhone")}
              >
                <Input
                  id="whatsappPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+234 801 234 5678"
                  aria-invalid={Boolean(errorFor("whatsappPhone")) || undefined}
                  {...register("whatsappPhone")}
                />
              </FormField>
            )}          </div>

          {formSettings.allowAdditionalPhones ? (
            <div className="space-y-3">
              <Label>Additional phone numbers</Label>
              <div className="space-y-3">
                {additionalPhones.map((phone, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <FormField
                      id={`additionalPhone-${index}`}
                      label={`Additional number ${index + 1}`}
                      className="flex-1"
                      error={errorFor(`additionalPhones.${index}`)}
                    >
                      <Input
                        id={`additionalPhone-${index}`}
                        type="tel"
                        inputMode="tel"
                        placeholder="+234 802 345 6789"
                        value={phone}
                        onChange={(event) => {
                          const next = [...additionalPhones];
                          next[index] = event.target.value;
                          setValue("additionalPhones", next, { shouldValidate: true });
                        }}
                      />
                    </FormField>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove additional phone number ${index + 1}`}
                      className="mb-0.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setValue(
                          "additionalPhones",
                          additionalPhones.filter((_, i) => i !== index),
                          { shouldValidate: true }
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
              {additionalPhones.length < 5 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setValue("additionalPhones", [...additionalPhones, ""], {
                      shouldValidate: true,
                    })
                  }
                >
                  <Plus aria-hidden="true" />
                  Add another number
                </Button>
              ) : null}
            </div>
          ) : null}

          <FormField
            id="email"
            label="Email address"
            optional
            error={errorFor("email")}
          >
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errorFor("email")) || undefined}
              {...register("email")}
            />
          </FormField>

          <FormField
            id="residentialAddress"
            label="Residential address"
            required={formSettings.requireAddress}
            optional={!formSettings.requireAddress}
            error={errorFor("residentialAddress")}
            helpText="Where you currently live."
          >
            <Textarea
              id="residentialAddress"
              autoComplete="street-address"
              placeholder="Street, area, city, state"
              aria-invalid={Boolean(errorFor("residentialAddress")) || undefined}
              {...register("residentialAddress")}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* Church membership                                            */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Church membership</CardTitle>
          <CardDescription>
            Tell us about your involvement in the church.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField
            id="membershipDuration"
            label="How long have you been a member?"
            required
            error={errorFor("membershipDuration")}
          >
            <Controller
              control={control}
              name="membershipDuration"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="membershipDuration"
                    aria-invalid={Boolean(errorFor("membershipDuration")) || undefined}
                  >
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEMBERSHIP_DURATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <fieldset>
            <legend className="text-sm font-semibold">
              Service units{" "}
              <span className="font-normal text-muted-foreground">(select all that apply)</span>
            </legend>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">
              Choose the departments or units you serve in.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {serviceUnits.map((unit) => {
                const unitId = `unit-${unit.id}`;
                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <Checkbox
                      id={unitId}
                      checked={selectedUnits.includes(unit.id)}
                      disabled={noServiceUnits}
                      onCheckedChange={(checked) => toggleServiceUnit(unit.id, checked === true)}
                    />
                    <label htmlFor={unitId} className="cursor-pointer text-base leading-snug">
                      {unit.name}
                    </label>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                "mt-3 flex items-center gap-3 rounded-lg border-2 p-3",
                noServiceUnits ? "border-primary bg-primary/5" : "border-border bg-background"
              )}
            >
              <Checkbox
                id="noServiceUnits"
                checked={noServiceUnits}
                onCheckedChange={(checked) => toggleNoServiceUnits(checked === true)}
              />
              <label htmlFor="noServiceUnits" className="cursor-pointer text-base font-semibold leading-snug">
                I do not belong to any service unit yet
              </label>
            </div>
            {errorFor("serviceUnitIds") ? (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {errorFor("serviceUnitIds")}
              </p>
            ) : null}
          </fieldset>

          {formSettings.allowSuggestions ? (
            <FormField
              id="suggestions"
              label="Suggestions or observations"
              optional
              error={errorFor("suggestions")}
              helpText="Share general suggestions or observations for the church. Please do not include highly sensitive personal information here."
            >
              <Textarea
                id="suggestions"
                rows={4}
                placeholder="Anything you would like us to know or suggest?"
                aria-invalid={Boolean(errorFor("suggestions")) || undefined}
                {...register("suggestions")}
              />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* Photograph                                                    */}
      {/* ---------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Passport photograph</CardTitle>
          <CardDescription>
            A clear, front-facing photograph is used for the church membership
            record and membership card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoCapture
            value={photo}
            onChange={(next) => {
              setPhoto(next);
              setValue("photo", next as never);
            }}
            maxBytes={formSettings.maxUploadBytes}
            error={errorFor("photo")}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* Guardian consent for children                                 */}
      {/* ---------------------------------------------------------- */}
      {isChild && formSettings.acceptsChildren ? (
        <Card className="border-2 border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-xl">Parent or guardian consent</CardTitle>
            <CardDescription>
              This registration is for a child. A parent or legal guardian must
              give consent on their behalf.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <Controller
                control={control}
                name="isChildRegistration"
                render={({ field }) => (
                  <Checkbox
                    id="isChildRegistration"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Label htmlFor="isChildRegistration" className="cursor-pointer text-base">
                I am the parent or legal guardian of this child and I consent to
                this registration and the collection of the information above.
              </Label>
            </div>
            {errorFor("isChildRegistration") ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errorFor("isChildRegistration")}
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="guardianName"
                label="Parent or guardian name"
                required={formSettings.requireGuardianConsent}
                error={errorFor("guardianName")}
              >
                <Input
                  id="guardianName"
                  autoComplete="name"
                  aria-invalid={Boolean(errorFor("guardianName")) || undefined}
                  {...register("guardianName")}
                />
              </FormField>

              <FormField
                id="guardianRelationship"
                label="Relationship to the child"
                optional
                error={errorFor("guardianRelationship")}
              >
                <Input
                  id="guardianRelationship"
                  placeholder="e.g. Mother, Father, Guardian"
                  aria-invalid={Boolean(errorFor("guardianRelationship")) || undefined}
                  {...register("guardianRelationship")}
                />
              </FormField>
            </div>

            <FormField
              id="guardianPhone"
              label="Parent or guardian phone number"
              required={formSettings.requireGuardianConsent}
              error={errorFor("guardianPhone")}
            >
              <Input
                id="guardianPhone"
                type="tel"
                inputMode="tel"
                placeholder="+234 801 234 5678"
                aria-invalid={Boolean(errorFor("guardianPhone")) || undefined}
                {...register("guardianPhone")}
              />
            </FormField>
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Configurable custom fields                                    */}
      {/* ---------------------------------------------------------- */}
      {customFields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Additional information</CardTitle>
            <CardDescription>
              These questions are set by the church and help us keep accurate records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {customFields.map((field) => (
              <Controller
                key={field.id}
                control={control}
                name={`customValues.${field.field_key}` as never}
                render={({ field: controllerField }) => (
                  <CustomFieldInput
                    field={field}
                    value={controllerField.value}
                    onChange={controllerField.onChange}
                    error={errorFor(`customValues.${field.field_key}`)}
                    idPrefix="public"
                  />
                )}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Privacy notice and consent                                    */}
      {/* ---------------------------------------------------------- */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-xl">Privacy notice and consent</CardTitle>
          <CardDescription>
            Please read this before submitting your registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              {privacyNotice.organisation}
            </p>
            <p className="mt-2">
              We collect your name, title, gender, age category, day and month of
              birth, phone numbers, email address, residential address, church
              membership details and passport photograph for the purpose of
              keeping the church membership register, issuing membership cards
              and contacting members about church activities.
            </p>
            <p className="mt-2">
              Your photograph is stored securely and is only accessible to
              authorised church administrators. Information is retained for
              approximately {privacyNotice.retentionYears} years for membership
              records.
            </p>
            <p className="mt-2">
              This application is hosted on {privacyNotice.thirdParties.join(", ")}.
              Please contact us to request access to, correction of, or deletion
              of your information.
            </p>
            <p className="mt-3">
              Contact:{" "}
              <a
                href={`mailto:${privacyNotice.contactEmail}`}
                className="font-semibold text-primary underline underline-offset-2"
              >
                {privacyNotice.contactEmail}
              </a>{" "}
              {privacyNotice.contactPhone ? ` · ${privacyNotice.contactPhone}` : ""}
            </p>
            <p className="mt-2 text-xs">
              Notice version {privacyNotice.version}. This notice supports, but
              does not replace, the church&apos;s obligations under the Nigeria
              Data Protection Act 2023.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border-2 border-border p-4">
            <Controller
              control={control}
              name="consentAccepted"
              render={({ field }) => (
                <Checkbox
                  id="consentAccepted"
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="consentAccepted" className="cursor-pointer text-base leading-relaxed">
              I have read the privacy notice, and I consent to {privacyNotice.organisation}
              collecting, storing and processing my personal information and
              photograph for church membership documentation.
            </Label>
          </div>
          {errorFor("consentAccepted") ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorFor("consentAccepted")}
            </p>
          ) : null}

          {!formSettings.acceptsChildren && isChild ? (
            <div className="flex items-start gap-3 rounded-lg border-2 border-warning/40 bg-warning/10 p-4 text-warning">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">
                Child registrations are currently closed. Please contact the church
                office so we can register your child directly.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* Submit                                                        */}
      {/* ---------------------------------------------------------- */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-6">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Submitting your registration…
            </>
          ) : (
            "Submit registration"
          )}
        </Button>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Please check your details before submitting. You will be shown a
          reference number once your registration is saved.
        </p>
      </div>
    </form>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
