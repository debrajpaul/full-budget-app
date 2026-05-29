"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudUpload } from "lucide-react";
import { BankName, BankType } from "@api-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreateUploadUrlDocument,
  NotifyUploadCompleteDocument,
} from "@/lib/graphql/upload";

const WARN_BYTES = 6 * 1024 * 1024;
const MAX_BYTES = 8 * 1024 * 1024;

const BANK_NAME_OPTIONS = [
  BankName.Hdfc,
  BankName.Sbi,
  BankName.Axis,
  BankName.Other,
] as const;

const BANK_TYPE_OPTIONS = [
  BankType.Savings,
  BankType.Current,
  BankType.CreditCard,
  BankType.Other,
] as const;

const schema = z.object({
  bankName: z.enum(BANK_NAME_OPTIONS),
  bankType: z.enum(BANK_TYPE_OPTIONS),
});

type FormValues = z.infer<typeof schema>;

type Phase = "idle" | "creating" | "uploading" | "notifying" | "done";

const BANK_LABELS: Record<(typeof BANK_NAME_OPTIONS)[number], string> = {
  [BankName.Hdfc]: "HDFC Bank",
  [BankName.Sbi]: "SBI",
  [BankName.Axis]: "Axis Bank",
  [BankName.Other]: "Other",
};

const BANK_TYPE_LABELS: Record<(typeof BANK_TYPE_OPTIONS)[number], string> = {
  [BankType.Savings]: "Savings Account",
  [BankType.Current]: "Current Account",
  [BankType.CreditCard]: "Credit Card",
  [BankType.Other]: "Other",
};

function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during file upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "text/csv");
    xhr.send(file);
  });
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Upload",
  creating: "Preparing…",
  uploading: "Uploading…",
  notifying: "Finalising…",
  done: "Done — redirecting…",
};

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [createUploadUrl] = useMutation(CreateUploadUrlDocument);
  const [notifyUploadComplete] = useMutation(NotifyUploadCompleteDocument);

  const busy = phase !== "idle" && phase !== "done";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFileError("File too large — max 8 MB");
      setFile(null);
      e.target.value = "";
    } else {
      setFile(picked);
      if (picked.size > WARN_BYTES) {
        toast.warning("Large file — upload may be slow");
      }
    }
  }

  async function onSubmit(values: FormValues) {
    if (!file) {
      setFileError("Please select a file");
      return;
    }

    try {
      setPhase("creating");
      const { data: urlData } = await createUploadUrl({
        variables: {
          input: {
            fileName: file.name,
            bankName: values.bankName,
            bankType: values.bankType,
          },
        },
      });

      if (!urlData?.createUploadUrl) throw new Error("No upload URL returned");
      const { jobId, uploadUrl } = urlData.createUploadUrl;

      setPhase("uploading");
      setProgress(0);
      await putWithProgress(uploadUrl, file, (pct) => {
        setProgress(pct);
        PHASE_LABEL.uploading = `Uploading ${pct}%`;
      });

      setPhase("notifying");
      const { data: notifyData } = await notifyUploadComplete({
        variables: { jobId },
      });

      const w = notifyData?.notifyUploadComplete.warnings ?? [];
      if (w.length) setWarnings(w);

      setPhase("done");
      toast.success("Statement uploaded — processing started");
      setTimeout(() => router.push("/transactions"), 2000);
    } catch (err) {
      setPhase("idle");
      toast.error(
        err instanceof Error ? err.message.slice(0, 120) : "Upload failed"
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload Statement
        </h1>
        <p className="text-sm text-muted-foreground">
          Import a bank statement (.csv) to process your transactions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement details</CardTitle>
          <CardDescription>
            Select your bank, account type, and statement file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BANK_NAME_OPTIONS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {BANK_LABELS[b]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BANK_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {BANK_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="statement-file"
                >
                  Statement file
                </label>
                <div
                  role="button"
                  aria-label="Choose file"
                  tabIndex={busy ? -1 : 0}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                  onClick={() => !busy && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !busy) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <CloudUpload className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span
                    className={
                      file ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {file ? file.name : "Choose .csv…"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  id="statement-file"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={busy}
                />
                {fileError && (
                  <p className="text-sm font-medium text-destructive">
                    {fileError}
                  </p>
                )}
              </div>

              {phase === "uploading" && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {(phase === "creating" || phase === "notifying") && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>
                    {phase === "creating" ? "Preparing upload…" : "Finalising…"}
                  </span>
                </div>
              )}

              {phase === "done" && (
                <p className="text-sm text-muted-foreground">
                  Done — redirecting to transactions…
                </p>
              )}

              {warnings.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <p className="mb-1 font-medium">Warnings</p>
                    <ul className="list-inside list-disc space-y-0.5 text-sm">
                      {warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={busy} className="mt-1">
                {phase === "uploading"
                  ? `Uploading ${progress}%`
                  : PHASE_LABEL[phase]}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
