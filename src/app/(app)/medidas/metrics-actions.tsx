"use client";

import { useState } from "react";
import { PlusIcon, RulerIcon, ScaleIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WeightDialog } from "./weight-dialog";
import { MeasurementDialog } from "./measurement-dialog";
import { ImportMeasurementsDialog } from "./import-dialog";

export function MetricsActions() {
  const [weightOpen, setWeightOpen] = useState(false);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setWeightOpen(true)}>
          <ScaleIcon />
          Registrar peso
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMeasurementOpen(true)}
        >
          <RulerIcon />
          Registrar medidas
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setImportOpen(true)}
        >
          <SparklesIcon />
          Importar PDF
        </Button>
      </div>

      <WeightDialog open={weightOpen} onOpenChange={setWeightOpen} />
      <MeasurementDialog
        open={measurementOpen}
        onOpenChange={setMeasurementOpen}
      />
      <ImportMeasurementsDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}

/** Botão isolado para os estados vazios. */
export function AddWeightButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Registrar primeiro peso
      </Button>
      <WeightDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
