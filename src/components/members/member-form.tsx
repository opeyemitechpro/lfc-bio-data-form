"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import { createMemberAction, updateMemberAction } from "@/app/dashboard/members/actions";
import { adminMemberSchema, type AdminMemberFormValues } from "@/lib/validation/registration";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
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

export interface MemberFormInitialValues {
  id?: string;
  full_name: string;
  title_id: string | null;
  gender: "male" | "female";
  age_category: "child" | "youth" | "adult";
  birth_day: number | null;
  birth_month: number | null;
  primary_phone: string;
  whatsapp_same_as_primary: boolean;
  whatsapp_phone: string | null;
  email: string | null;
  residential_address: string | null;
  membership_duration: "lt_1y" | "y1_3" | "y4_6" | "y7_10" | "gt_10y";
  suggestions: string | null;
  service_unit_ids: string[];
  additional_phones: string[];
  custom_values: Record<string, unknown>;
  photo_public_id: string | null;
  photo_format: string | null;
  photo_width: number | null;
  photo_height: number | null;
  photo_bytes: number | null;
}

interface MemberFormProps {
  titles: TitleOption[];
  serviceUnits: ServiceUnitOption[];
  customFields: CustomFieldDefinition[];
  initial?: MemberFormInitialValues;
  maxUploadBytes: number;
  allowAdditionalPhones: boolean;
  allowSuggestions: boolean;
}

export function MemberForm({
  titles,
  serviceUnits,
  customFields,
  initial,
  maxUploadBytes,
  allowAdditionalPhones,
  allowSuggestions,
}: MemberFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initial?.id);

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = React.useState<
    Record<string, string>
  >({});
  const [photo, setPhoto] = React.useState<UploadedPhoto | null>(
    initial?.photo_public_id
      ? {
          publicId: initial.photo_public_id,
          format: initial.photo_format ?? "jpg",
          width: initial.photo_width ?? 320,
          height: initial.photo_height ?? 400,
          bytes: initial.photo_bytes ?? 0,
        }
      : null
  );
  const [removePhoto, setRemovePhoto] = React.useState(false);
  const [noServiceUnits, setNoServiceUnits] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminMemberFormValues>({
    resolver: zodResolver(adminMemberSchema),
    mode: "onBlur",
    defaultValues: {
      titleId: initial?.title_id ?? "",
      fullName: initial?.full_name ?? "",
      gender: initial?.gender ?? "male",
      ageCategory: initial?.age_category ?? "adult",
      birthDay: initial?.birth_day ?? undefined,
      birthMonth: initial?.birth_month ?? undefined,
      serviceUnitIds: initial?.service_unit_ids ?? [],
      primaryPhone: initial?.primary_phone ?? "",
      whatsappSameAsPrimary: initial?.whatsapp_same_as_primary ?? true,
      whatsappPhone: initial?.whatsapp_phone ?? "",
      additionalPhones: initial?.additional_phones ?? [],
      email: initial?.email ?? "",
      residentialAddress: initial?.residential_address ?? "",
      membershipDuration: initial?.membership_duration ?? "lt_1y",
      suggestions: initial?.suggestions ?? "",
      photo: null,
      isChildRegistration: false,
      guardianName: "",
      guardianRelationship: "",
      guardianPhone: "",
      customValues: initial?.custom_values ?? {},
    },
  });

  const ageCategory = watch("ageCategory");
  const isChild = ageCategory === "child";
  const selectedUnits = watch("serviceUnitIds") ?? [];
  const additionalPhones = watch("additionalPhones") ?? [];

  const toggleNoServiceUnits = (checked: boolean) => {
    setNoServiceUnits(checked);
    if (checked) setValue("serviceUnitIds", []);
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
      ...(isEditing
        ? {
            memberId: initial?.id,
            photo: photo ? photo : undefined,
            removePhoto,
          }
        : {
            photo: photo
              ? {
                  publicId: photo.publicId,
                  format: photo.format,
                  width: photo.width,
                  height: photo.height,
                  bytes: photo.bytes,
                }
              : null,
          }),
    };

    const result = isEditing
      ? await updateMemberAction(payload)
      : await createMemberAction(payload);

    if (result.ok) {
      toast.success(result.message ?? "The member record was saved.");
      router.push(
        isEditing
          ? `/dashboard/members/${initial?.id}`
          : `/dashboard/members/${result.memberId}`
      );
      router.refresh();
      return;
    }

    setServerError(result.message ?? "Something went wrong. Please try again.");
    if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
    toast.error(result.message ?? "Please check the form and try again.");
  });

  const errorFor = (name: string) =>
    serverFieldErrors[name] ??
    (errors as Record<string, { message?: string }>)[name]?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormErrorBanner message={serverError} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Personal information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="title" label="Title" required error={errorFor("titleId")}>
              <Controller
                control={control}
                name="titleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="title">
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
              />
            </FormField>

            <FormField id="fullName" label="Full name" required error={errorFor("fullName")}>
              <Input
                id="fullName"
                aria-invalid={Boolean(errorFor("fullName")) || undefined}
                {...register("fullName")}
              />
            </FormField>

            <FormField id="gender" label="Gender" required error={errorFor("gender")}>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GENDER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
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
            >
              <Controller
                control={control}
                name="ageCategory"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ageCategory">
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
              Day and month only — the year of birth is never stored.
            </p>
            <div className="grid max-w-sm grid-cols-2 gap-4">
              <FormField id="birthDay" label="Day" error={errorFor("birthDay")}>
                <Controller
                  control={control}
                  name="birthDay"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="birthDay">
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
                      <SelectTrigger id="birthMonth">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Contact information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField
            id="primaryPhone"
            label="Primary phone number"
            required
            error={errorFor("primaryPhone")}
          >
            <Input
              id="primaryPhone"
              type="tel"
              inputMode="tel"
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
                WhatsApp number is the same as the primary phone number
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
                  {...register("whatsappPhone")}
                />
              </FormField>
            )}
          </div>

          {allowAdditionalPhones ? (
            <div className="space-y-3">
              <Label>Additional phone numbers</Label>
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

          <FormField id="email" label="Email address" optional error={errorFor("email")}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              {...register("email")}
            />
          </FormField>

          <FormField
            id="residentialAddress"
            label="Residential address"
            required
            error={errorFor("residentialAddress")}
          >
            <Textarea
              id="residentialAddress"
              autoComplete="street-address"
              {...register("residentialAddress")}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Church membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField
            id="membershipDuration"
            label="Membership duration"
            required
            error={errorFor("membershipDuration")}
          >
            <Controller
              control={control}
              name="membershipDuration"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="membershipDuration">
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
            <legend className="text-sm font-semibold">Service units</legend>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
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
                      onCheckedChange={(checked) =>
                        toggleServiceUnit(unit.id, checked === true)
                      }
                    />
                    <label htmlFor={unitId} className="cursor-pointer text-base leading-snug">
                      {unit.name}
                    </label>
                  </div>
                );
              })}
            </div>
            <div
              className={
                noServiceUnits
                  ? "mt-3 flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/5 p-3"
                  : "mt-3 flex items-center gap-3 rounded-lg border-2 border-border bg-background p-3"
              }
            >
              <Checkbox
                id="noServiceUnits"
                checked={noServiceUnits}
                onCheckedChange={(checked) => toggleNoServiceUnits(checked === true)}
              />
              <label htmlFor="noServiceUnits" className="cursor-pointer text-base font-semibold">
                Not in any service unit
              </label>
            </div>
          </fieldset>

          {allowSuggestions ? (
            <FormField
              id="suggestions"
              label="Suggestions or observations"
              optional
              error={errorFor("suggestions")}
            >
              <Textarea id="suggestions" rows={4} {...register("suggestions")} />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Passport photograph</CardTitle>
          <CardDescription>
            A clear, front-facing photograph for the membership record and card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PhotoCapture
            value={photo}
            onChange={(next) => {
              setPhoto(next);
              setRemovePhoto(false);
            }}
            maxBytes={maxUploadBytes}
            error={errorFor("photo")}
            disabled={isSubmitting}
          />

          {isEditing && initial?.photo_public_id && !removePhoto ? (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id="removePhoto"
                checked={removePhoto}
                onCheckedChange={(checked) => {
                  setRemovePhoto(checked === true);
                  if (checked) setPhoto(null);
                }}
              />
              <Label htmlFor="removePhoto" className="cursor-pointer text-base">
                Remove the current photograph
              </Label>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isChild ? (
        <Card className="border-2 border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-xl">Parent or guardian consent</CardTitle>
            <CardDescription>
              This member is a child. Record the parent or guardian.
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
                A parent or legal guardian has consented to this registration
              </Label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="guardianName"
                label="Parent or guardian name"
                required
                error={errorFor("guardianName")}
              >
                <Input id="guardianName" {...register("guardianName")} />
              </FormField>
              <FormField
                id="guardianRelationship"
                label="Relationship to the child"
                optional
                error={errorFor("guardianRelationship")}
              >
                <Input id="guardianRelationship" {...register("guardianRelationship")} />
              </FormField>
            </div>

            <FormField
              id="guardianPhone"
              label="Parent or guardian phone number"
              required
              error={errorFor("guardianPhone")}
            >
              <Input id="guardianPhone" type="tel" {...register("guardianPhone")} />
            </FormField>
          </CardContent>
        </Card>
      ) : null}

      {customFields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Additional information</CardTitle>
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
                    idPrefix="admin"
                  />
                )}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Save aria-hidden="true" />
              {isEditing ? "Save changes" : "Create member record"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
