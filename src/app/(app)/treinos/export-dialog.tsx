"use client";

import { useMemo, useState } from "react";
import {
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
} from "lucide-react";

import { formatDateBR } from "@/lib/date";
import { triggerDownload } from "@/lib/download";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WorkoutOption = { id: number; name: string; date: Date };

export function ExportWorkoutsButton({
  workouts,
}: {
  workouts: WorkoutOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allSelected = selected.size === workouts.length && workouts.length > 0;

  const sorted = useMemo(
    () =>
      [...workouts].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [workouts],
  );

  function openDialog() {
    setSelected(new Set(workouts.map((w) => w.id)));
    setOpen(true);
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function download(format: "pdf" | "csv" | "json") {
    const ids = [...selected].join(",");
    triggerDownload(
      `/api/exportar/treinos?formato=${format}${ids ? `&ids=${ids}` : ""}`,
    );
    setOpen(false);
  }

  if (workouts.length === 0) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <DownloadIcon />
        Exportar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar treinos</DialogTitle>
            <DialogDescription>
              Escolha os treinos e o formato.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {selected.size} de {workouts.length} selecionados
            </span>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() =>
                setSelected(
                  allSelected
                    ? new Set()
                    : new Set(workouts.map((w) => w.id)),
                )
              }
            >
              {allSelected ? "Limpar" : "Selecionar todos"}
            </button>
          </div>

          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {sorted.map((workout) => (
              <li key={workout.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={selected.has(workout.id)}
                    onChange={() => toggle(workout.id)}
                  />
                  <span className="flex-1 truncate">{workout.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateBR(workout.date)}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <DialogFooter className="flex-row flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => download("pdf")}
            >
              <FileTextIcon />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => download("csv")}
            >
              <FileSpreadsheetIcon />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => download("json")}
            >
              <FileJsonIcon />
              JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
