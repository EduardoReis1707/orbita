import type { NextRequest } from "next/server";

import { importWorkoutsFromPdf } from "@/lib/ai/import-workouts";
import { handlePdfImport } from "@/lib/ai/pdf-request";

export const maxDuration = 60;

export function POST(request: NextRequest) {
  return handlePdfImport(request, "importar/treinos", importWorkoutsFromPdf);
}
