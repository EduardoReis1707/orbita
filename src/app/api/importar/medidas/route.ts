import type { NextRequest } from "next/server";

import { importMeasurementsFromPdf } from "@/lib/ai/import-measurements";
import { handlePdfImport } from "@/lib/ai/pdf-request";

export const maxDuration = 60;

export function POST(request: NextRequest) {
  return handlePdfImport(
    request,
    "importar/medidas",
    importMeasurementsFromPdf,
  );
}
