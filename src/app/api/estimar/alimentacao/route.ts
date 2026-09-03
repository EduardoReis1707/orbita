import type { NextRequest } from "next/server";

import { estimateMealFromPhoto } from "@/lib/ai/estimate-meal-photo";
import { handleImageEstimate } from "@/lib/ai/pdf-request";

export const maxDuration = 60;

export function POST(request: NextRequest) {
  return handleImageEstimate(
    request,
    "estimar/alimentacao",
    estimateMealFromPhoto,
  );
}
