"use client";

import { todayISO } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import { MEASUREMENT_FIELDS } from "@/lib/measurements";
import type { ImportedMeasurement } from "@/lib/ai/import-measurements";
import { Input } from "@/components/ui/input";
import { PdfImportDialog } from "@/components/ai/pdf-import-dialog";
import { confirmMeasurementImportAction } from "./import-actions";

export function ImportMeasurementsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <PdfImportDialog<ImportedMeasurement>
      open={open}
      onOpenChange={onOpenChange}
      endpoint="/api/importar/medidas"
      resultKey="entries"
      title="Importar avaliação física de PDF"
      description="A IA lê a avaliação e extrai as medidas. Você revê antes de salvar. Todos os valores são aproximações do documento de origem."
      emptyMessage="A IA não encontrou medidas neste PDF."
      normalize={(entry) => ({ ...entry, date: entry.date ?? todayISO() })}
      apply={confirmMeasurementImportAction}
      renderCard={(entry, patch) => {
        const parts: string[] = [];
        if (entry.weightKg != null)
          parts.push(`Peso ${formatNumber(entry.weightKg)} kg`);
        for (const { key, label } of MEASUREMENT_FIELDS) {
          const value = entry[key];
          if (value != null) parts.push(`${label} ${formatNumber(value)} cm`);
        }
        if (entry.bodyFatPct != null)
          parts.push(`Gordura ${formatNumber(entry.bodyFatPct)}%`);

        return (
          <div className="space-y-2">
            <Input
              type="date"
              value={entry.date ?? todayISO()}
              onChange={(e) => patch({ date: e.target.value })}
              className="h-8 w-auto"
            />
            <p className="text-xs text-muted-foreground">
              {parts.length > 0 ? parts.join(" · ") : "Nenhum valor reconhecido"}
            </p>
          </div>
        );
      }}
    />
  );
}
