"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AGE_CATEGORY_LABELS,
  GENDER_LABELS,
  MEMBERSHIP_DURATION_LABELS,
  type AgeCategory,
  type Gender,
  type MembershipDuration,
  type ServiceUnitOption,
  type TitleOption,
} from "@/lib/types";

export interface MemberFilterValues {
  search: string;
  ageCategory: AgeCategory | "";
  gender: Gender | "";
  titleId: string;
  serviceUnitId: string;
  membershipDuration: MembershipDuration | "";
  hasPhoto: "yes" | "no" | "";
  registeredFrom: string;
  registeredTo: string;
  status: "active" | "deleted" | "all";
}

export const EMPTY_FILTERS: MemberFilterValues = {
  search: "",
  ageCategory: "",
  gender: "",
  titleId: "",
  serviceUnitId: "",
  membershipDuration: "",
  hasPhoto: "",
  registeredFrom: "",
  registeredTo: "",
  status: "active",
};

interface MemberFiltersProps {
  titles: TitleOption[];
  serviceUnits: ServiceUnitOption[];
}

export function MemberFilters({
  titles,
  serviceUnits,
}: MemberFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = React.useState(false);

  const readParam = (name: string) => searchParams.get(name) ?? "";

  const values: MemberFilterValues = {
    search: readParam("q"),
    ageCategory: (readParam("age") as AgeCategory) || "",
    gender: (readParam("gender") as Gender) || "",
    titleId: readParam("title"),
    serviceUnitId: readParam("unit"),
    membershipDuration: (readParam("duration") as MembershipDuration) || "",
    hasPhoto: (readParam("photo") as "yes" | "no") || "",
    registeredFrom: readParam("from"),
    registeredTo: readParam("to"),
    status: (readParam("status") as "active" | "deleted" | "all") || "active",
  };

  const activeFilterCount = [
    values.ageCategory,
    values.gender,
    values.titleId,
    values.serviceUnitId,
    values.membershipDuration,
    values.hasPhoto,
    values.registeredFrom,
    values.registeredTo,
    values.status !== "active" ? values.status : "",
  ].filter(Boolean).length;

  const applyParams = (next: Partial<MemberFilterValues>) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...values, ...next };

    const set = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    set("q", merged.search);
    set("age", merged.ageCategory);
    set("gender", merged.gender);
    set("title", merged.titleId);
    set("unit", merged.serviceUnitId);
    set("duration", merged.membershipDuration);
    set("photo", merged.hasPhoto);
    set("from", merged.registeredFrom);
    set("to", merged.registeredTo);
    set("status", merged.status === "active" ? "" : merged.status);

    // Any filter change resets pagination.
    params.delete("page");
    params.set("view", searchParams.get("view") ?? "table");

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    const view = searchParams.get("view");
    if (view && view !== "table") params.set("view", view);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const [searchValue, setSearchValue] = React.useState(values.search);

  // The search box is uncontrolled between navigations: it is seeded from
  // the URL and then owned by the user's typing. The debounce below pushes
  // the typed value to the server.
  const lastPushedRef = React.useRef(values.search);

  React.useEffect(() => {
    if (searchValue === lastPushedRef.current) return;

    const timer = setTimeout(() => {
      lastPushedRef.current = searchValue;
      applyParams({ search: searchValue });
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="member-search">Search the directory</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="member-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, phone, email or reference number"
              className="pl-11"
            />
          </div>
        </div>

        {/* Filter toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="member-filter-panel"
          >
            <Filter aria-hidden="true" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          {activeFilterCount > 0 || values.search ? (
            <Button type="button" variant="ghost" onClick={clearAll}>
              <RotateCcw aria-hidden="true" />
              Clear all filters
            </Button>
          ) : null}
        </div>

        {/* Filter panel */}
        {expanded ? (
          <div
            id="member-filter-panel"
            className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2">
              <Label htmlFor="filter-age">Age category</Label>
              <Select
                value={values.ageCategory}
                onValueChange={(value) =>
                  applyParams({ ageCategory: value as AgeCategory | "" })
                }
              >
                <SelectTrigger id="filter-age">
                  <SelectValue placeholder="All ages" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AGE_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-gender">Gender</Label>
              <Select
                value={values.gender}
                onValueChange={(value) => applyParams({ gender: value as Gender | "" })}
              >
                <SelectTrigger id="filter-gender">
                  <SelectValue placeholder="All genders" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDER_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-title">Title</Label>
              <Select
                value={values.titleId}
                onValueChange={(value) => applyParams({ titleId: value })}
              >
                <SelectTrigger id="filter-title">
                  <SelectValue placeholder="All titles" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
                    <SelectItem key={title.id} value={title.id}>
                      {title.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-unit">Service unit</Label>
              <Select
                value={values.serviceUnitId}
                onValueChange={(value) => applyParams({ serviceUnitId: value })}
              >
                <SelectTrigger id="filter-unit">
                  <SelectValue placeholder="All service units" />
                </SelectTrigger>
                <SelectContent>
                  {serviceUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-duration">Membership duration</Label>
              <Select
                value={values.membershipDuration}
                onValueChange={(value) =>
                  applyParams({ membershipDuration: value as MembershipDuration | "" })
                }
              >
                <SelectTrigger id="filter-duration">
                  <SelectValue placeholder="All durations" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEMBERSHIP_DURATION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-photo">Photograph</Label>
              <Select
                value={values.hasPhoto}
                onValueChange={(value) =>
                  applyParams({ hasPhoto: value as "yes" | "no" | "" })
                }
              >
                <SelectTrigger id="filter-photo">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Has a photograph</SelectItem>
                  <SelectItem value="no">No photograph</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-from">Registered from</Label>
              <Input
                id="filter-from"
                type="date"
                value={values.registeredFrom}
                onChange={(event) => applyParams({ registeredFrom: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-to">Registered to</Label>
              <Input
                id="filter-to"
                type="date"
                value={values.registeredTo}
                onChange={(event) => applyParams({ registeredTo: event.target.value })}
              />
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="filter-status">Record status</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  applyParams({ status: value as "active" | "deleted" | "all" })
                }
              >
                <SelectTrigger id="filter-status" className="sm:max-w-xs">
                  <SelectValue placeholder="Active records" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active records</SelectItem>
                  <SelectItem value="deleted">Deleted records</SelectItem>
                  <SelectItem value="all">All records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
