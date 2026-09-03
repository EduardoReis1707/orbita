import type { NextRequest } from "next/server";

import { importMealsFromPdf } from "@/lib/ai/import-meals";
import { handlePdfImport } from "@/lib/ai/pdf-request";

export const maxDuration = 60;

export function POST(request: NextRequest) {
  return handlePdfImport(request, "importar/alimentacao", importMealsFromPdf);
}
