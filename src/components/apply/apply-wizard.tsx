"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Stepper, type StepDefinition } from "@/components/apply/stepper";
import { PersonalDetailsStep } from "@/components/apply/step-personal";
import { DocumentsStep } from "@/components/apply/step-documents";
import { ReviewStep } from "@/components/apply/step-review";
import { SubmittedPanel } from "@/components/apply/submitted-panel";
import type { UploadedDocument } from "@/components/apply/upload-field";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import type { ApplicationDto } from "@/lib/dto";
import {
  submitApplicationSchema,
  type SubmitApplicationInput,
} from "@/lib/validation/application";

const STEPS: StepDefinition[] = [
  { id: 1, title: "Personal details", description: "Name, DOB, registration" },
  { id: 2, title: "Documents", description: "ID proof & degree" },
  { id: 3, title: "Review & submit", description: "Check and confirm" },
];

const STEP_FIELDS: Record<number, FieldPath<FormValues>[]> = {
  1: [
    "fullName",
    "dateOfBirth",
    "gender",
    "registrationNumber",
    "courseName",
    "institutionName",
    "yearOfPassing",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
  ],
  2: ["idProofDocumentId", "degreeCertificateDocumentId"],
  3: ["declarationAccepted"],
};

const DRAFT_KEY = "pcp:apply:draft:v1";

export type FormValues = SubmitApplicationInput;

type Draft = {
  step: number;
  values: Partial<FormValues>;
  documents: Partial<Record<"ID_PROOF" | "DEGREE_CERTIFICATE", UploadedDocument>>;
};

/**
 * The multi-step form.
 *
 * One react-hook-form instance backs all three steps, which is what makes
 * going back and forward lossless: nothing is unmounted-and-forgotten, only
 * the visible step changes. The draft is additionally mirrored into
 * sessionStorage on every change, so a refresh or an accidental navigation
 * does not cost the applicant their work — including the documents they have
 * already uploaded, because those are staged server-side and referenced by id.
 */
export function ApplyWizard({
  defaults,
}: {
  defaults: { fullName: string; email: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState<Draft["documents"]>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<ApplicationDto | null>(null);
  const [restored, setRestored] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(submitApplicationSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: defaults.fullName,
      dateOfBirth: "",
      registrationNumber: "",
      courseName: "",
      institutionName: "",
      yearOfPassing: undefined as unknown as number,
      email: defaults.email,
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      idProofDocumentId: "",
      degreeCertificateDocumentId: "",
      declarationAccepted: undefined as unknown as true,
    },
  });

  /* ---------------------------------------------- draft persistence */

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        form.reset({ ...form.getValues(), ...draft.values });
        setDocuments(draft.documents ?? {});
        setStep(Math.min(Math.max(draft.step ?? 1, 1), STEPS.length));
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    } finally {
      setRestored(true);
    }
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    const subscription = form.watch((values) => {
      const draft: Draft = { step, values, documents };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* storage full or unavailable — the in-memory form is unaffected */
      }
    });
    return () => subscription.unsubscribe();
  }, [form, step, documents, restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      const draft: Draft = { step, values: form.getValues(), documents };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [step, documents, restored, form]);

  /* ------------------------------------------------------ navigation */

  const goTo = useCallback((next: number) => {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function handleNext() {
    const valid = await form.trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (!valid) return;
    goTo(Math.min(step + 1, STEPS.length));
  }

  function setDocument(
    docType: "ID_PROOF" | "DEGREE_CERTIFICATE",
    document: UploadedDocument | undefined
  ) {
    setDocuments((current) => ({ ...current, [docType]: document }));
    const field =
      docType === "ID_PROOF" ? "idProofDocumentId" : "degreeCertificateDocumentId";
    form.setValue(field, document?.id ?? "", { shouldValidate: Boolean(document) });
  }

  /* ---------------------------------------------------------- submit */

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await apiFetch<{ application: ApplicationDto }>("/api/applications", {
        method: "POST",
        body: JSON.stringify(values),
      });

      sessionStorage.removeItem(DRAFT_KEY);
      setSubmitted(result.application);
      toast.success("Application submitted.");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        const fieldErrors = error.failure.fieldErrors ?? {};
        let firstStepWithError: number | null = null;

        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in values) {
            form.setError(field as FieldPath<FormValues>, { message });
            const owner = Number(
              Object.entries(STEP_FIELDS).find(([, fields]) =>
                (fields as string[]).includes(field)
              )?.[0]
            );
            if (owner && (firstStepWithError === null || owner < firstStepWithError)) {
              firstStepWithError = owner;
            }
          }
        }

        setSubmitError(error.failure.message);
        if (firstStepWithError) goTo(firstStepWithError);
        return;
      }
      setSubmitError("Could not reach the server. Please try again.");
    }
  });

  if (submitted) {
    return <SubmittedPanel application={submitted} />;
  }

  return (
    <div ref={topRef} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New application</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Provisional Certificate · takes about five minutes
        </p>
      </div>

      <Card>
        <CardHeader>
          <Stepper steps={STEPS} current={step} onSelect={goTo} />
        </CardHeader>

        <Separator />

        <CardHeader className="pt-2">
          <CardTitle className="text-lg">{STEPS[step - 1].title}</CardTitle>
          <CardDescription>
            {step === 1 && "These details are printed on your acknowledgement, so check the spelling."}
            {step === 2 && "Upload both documents as PDFs, up to 5 MB each."}
            {step === 3 && "Confirm everything below, then submit your application."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (step === STEPS.length) void onSubmit(event);
              else void handleNext();
            }}
            noValidate
          >
            {submitError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle />
                <AlertTitle>Could not submit</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className={step === 1 ? "block" : "hidden"}>
              <PersonalDetailsStep form={form} />
            </div>
            <div className={step === 2 ? "block" : "hidden"}>
              <DocumentsStep form={form} documents={documents} onChange={setDocument} />
            </div>
            <div className={step === 3 ? "block" : "hidden"}>
              <ReviewStep
                form={form}
                documents={documents}
                onEditStep={goTo}
              />
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => goTo(Math.max(step - 1, 1))}
                disabled={step === 1 || form.formState.isSubmitting}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              {step < STEPS.length ? (
                <Button type="submit">
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit application
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
