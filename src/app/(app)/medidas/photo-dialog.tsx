"use client";

import { todayISO } from "@/lib/date";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/measurements";
import type { BodyPhotoEstimate } from "@/lib/ai/estimate-body-photo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoEstimateDialog } from "@/components/ai/photo-estimate-dialog";
import { confirmMeasurementImportAction } from "./import-actions";

type BodyValue = BodyPhotoEstimate & { date: string };

function numOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function BodyPhotoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <PhotoEstimateDialog<BodyValue>
      open={open}
      onOpenChange={onOpenChange}
      endpoint="/api/estimar/medidas"
      title="Estimar medidas por foto"
      description="Envie fotos de frente e de costas. A IA dá uma estimativa grosseira das circunferências e do percentual de gordura."
      disclaimer="Estimar medidas por foto é muito impreciso — sem uma referência de escala, o erro é grande. Use apenas como ponto de partida e ajuste os valores. Para acompanhamento sério, meça com fita métrica."
      fileHint="Fotos de frente e de costas (JPG, PNG ou WebP)"
      multiple
      normalize={(raw) => ({
        ...(raw as BodyPhotoEstimate),
        date: todayISO(),
      })}
      apply={(value) =>
        confirmMeasurementImportAction([
          {
            date: value.date,
            weightKg: value.weightKg,
            neckCm: value.neckCm,
            chestCm: value.chestCm,
            waistCm: value.waistCm,
            hipCm: value.hipCm,
            armCm: value.armCm,
            thighCm: value.thighCm,
            calfCm: value.calfCm,
            bodyFatPct: value.bodyFatPct,
          },
        ])
      }
      renderReview={(value, patch) => (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="bp-date">Data</Label>
              <Input
                id="bp-date"
                type="date"
                value={value.date}
                onChange={(e) => patch({ date: e.target.value })}
                className="h-8"
              />
            </div>
            <span className="mt-5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Confiança {value.confidence}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {MEASUREMENT_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`bp-${key}`}>{label} (cm)</Label>
                <Input
                  id={`bp-${key}`}
                  type="number"
                  inputMode="decimal"
                  value={value[key as MeasurementKey] ?? ""}
                  onChange={(e) =>
                    patch({
                      [key]: numOrNull(e.target.value),
                    } as Partial<BodyValue>)
                  }
                  className="h-8"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="bp-fat">Gordura (%)</Label>
              <Input
                id="bp-fat"
                type="number"
                inputMode="decimal"
                value={value.bodyFatPct ?? ""}
                onChange={(e) =>
                  patch({ bodyFatPct: numOrNull(e.target.value) })
                }
                className="h-8"
              />
            </div>
          </div>

          {value.note ? (
            <p className="text-xs text-muted-foreground">{value.note}</p>
          ) : null}
        </div>
      )}
    />
  );
}
