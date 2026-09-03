import type { NextRequest } from "next/server";

import { estimateBodyFromPhotos } from "@/lib/ai/estimate-body-photo";
import { handleImageEstimate } from "@/lib/ai/pdf-request";

export const maxDuration = 60;

export function POST(request: NextRequest) {
  return handleImageEstimate(request, "estimar/medidas", estimateBodyFromPhotos);
}
