"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Field } from "@/components/apply/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormValues } from "@/components/apply/apply-wizard";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;

export function PersonalDetailsStep({ form }: { form: UseFormReturn<FormValues> }) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} className="sm:col-span-2">
          <Input
            id="fullName"
            placeholder="As printed on your degree certificate"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
        </Field>

        <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
          <Input
            id="dateOfBirth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            aria-invalid={!!errors.dateOfBirth}
            {...register("dateOfBirth")}
          />
        </Field>

        <Field label="Gender" htmlFor="gender" error={errors.gender?.message} required={false}>
          {/* Controller rather than setValue, so the value survives form.reset()
              when a saved draft is restored. */}
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="gender" className="h-9" onBlur={field.onBlur}>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </section>

      <section>
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Registration
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field
            label="Registration number"
            htmlFor="registrationNumber"
            error={errors.registrationNumber?.message}
            hint="e.g. 2019/CS/04871"
          >
            <Input
              id="registrationNumber"
              placeholder="2019/CS/04871"
              aria-invalid={!!errors.registrationNumber}
              {...register("registrationNumber")}
            />
          </Field>

          <Field
            label="Year of passing"
            htmlFor="yearOfPassing"
            error={errors.yearOfPassing?.message}
          >
            <Input
              id="yearOfPassing"
              type="number"
              inputMode="numeric"
              placeholder={String(new Date().getFullYear())}
              min={1950}
              max={new Date().getFullYear()}
              aria-invalid={!!errors.yearOfPassing}
              {...register("yearOfPassing")}
            />
          </Field>

          <Field label="Course / programme" htmlFor="courseName" error={errors.courseName?.message}>
            <Input
              id="courseName"
              placeholder="B.Tech Computer Science & Engineering"
              aria-invalid={!!errors.courseName}
              {...register("courseName")}
            />
          </Field>

          <Field
            label="Institution"
            htmlFor="institutionName"
            error={errors.institutionName?.message}
          >
            <Input
              id="institutionName"
              placeholder="Government Institute of Technology"
              aria-invalid={!!errors.institutionName}
              {...register("institutionName")}
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Contact & address
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </Field>

          <Field
            label="Address line 1"
            htmlFor="addressLine1"
            error={errors.addressLine1?.message}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine1"
              autoComplete="address-line1"
              placeholder="House / street"
              aria-invalid={!!errors.addressLine1}
              {...register("addressLine1")}
            />
          </Field>

          <Field
            label="Address line 2"
            htmlFor="addressLine2"
            error={errors.addressLine2?.message}
            required={false}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine2"
              autoComplete="address-line2"
              placeholder="Area / landmark (optional)"
              {...register("addressLine2")}
            />
          </Field>

          <Field label="City" htmlFor="city" error={errors.city?.message}>
            <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />
          </Field>

          <Field label="State" htmlFor="state" error={errors.state?.message}>
            <Input id="state" autoComplete="address-level1" aria-invalid={!!errors.state} {...register("state")} />
          </Field>

          <Field label="Postal code" htmlFor="postalCode" error={errors.postalCode?.message}>
            <Input
              id="postalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="400001"
              aria-invalid={!!errors.postalCode}
              {...register("postalCode")}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
