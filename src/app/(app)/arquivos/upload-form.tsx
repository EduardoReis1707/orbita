"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";

import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_VALUES,
} from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/form-feedback";
import { uploadDocumentAction } from "./actions";

export function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const nameInput = formRef.current?.elements.namedItem(
      "name",
    ) as HTMLInputElement | null;
    if (file && nameInput && !nameInput.value) {
      nameInput.value = file.name.replace(/\.pdf$/i, "");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await uploadDocumentAction(formData);
      if (result.status === "error") {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? null);
        return;
      }
      toast.success(result.message ?? "Enviado.");
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">Arquivo PDF (até 10 MB)</Label>
              <Input
                id="doc-file"
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                required
              />
              <FieldError errors={fieldErrors.file} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-name">Nome</Label>
              <Input
                id="doc-name"
                name="name"
                placeholder="Ficha de treino — setembro"
                required
              />
              <FieldError errors={fieldErrors.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-category">Categoria</Label>
              <Select name="category" defaultValue="WORKOUT_PLAN" items={DOCUMENT_CATEGORY_LABELS}>
                <SelectTrigger id="doc-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORY_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DOCUMENT_CATEGORY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-desc">Descrição (opcional)</Label>
              <Input id="doc-desc" name="description" maxLength={300} />
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            <UploadIcon />
            {pending ? "Enviando…" : "Enviar documento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
