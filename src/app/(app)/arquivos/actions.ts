"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { DocumentCategory } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_CATEGORY_VALUES,
  MAX_DOCUMENT_BYTES,
} from "@/lib/documents";
import { STORAGE_BUCKET, createAdminClient } from "@/lib/supabase/admin";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function uploadDocumentAction(
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string[]> = {};

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    fieldErrors.file = ["Escolha um arquivo PDF."];
  } else {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) fieldErrors.file = ["Apenas arquivos PDF são aceitos."];
    else if (file.size > MAX_DOCUMENT_BYTES) {
      fieldErrors.file = ["O arquivo deve ter no máximo 10 MB."];
    }
  }

  const name = str(formData, "name");
  if (name.length < 1) fieldErrors.name = ["Dê um nome ao documento."];

  const categoryRaw = str(formData, "category");
  const category = (
    DOCUMENT_CATEGORY_VALUES.includes(categoryRaw as DocumentCategory)
      ? categoryRaw
      : "OTHER"
  ) as DocumentCategory;

  const description = str(formData, "description") || null;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const pdf = file as File;
  const supabase = createAdminClient();
  const path = `${user.id}/${randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return {
      status: "error",
      message: "Não foi possível enviar o arquivo. Tente novamente.",
    };
  }

  try {
    await prisma.fileDocument.create({
      data: {
        profileId: user.id,
        name,
        category,
        description,
        storagePath: path,
        sizeBytes: pdf.size,
        mimeType: "application/pdf",
      },
    });
  } catch {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    return {
      status: "error",
      message: "Não foi possível salvar o documento. Tente novamente.",
    };
  }

  revalidatePath("/arquivos");
  return { status: "success", message: "Documento enviado." };
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const doc = await prisma.fileDocument.findFirst({
    where: { id, profileId: user.id },
  });
  if (!doc) return;

  const supabase = createAdminClient();
  await supabase.storage.from(STORAGE_BUCKET).remove([doc.storagePath]);
  await prisma.fileDocument.delete({ where: { id: doc.id } });

  revalidatePath("/arquivos");
}
