"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import type { MeasurementEntry, WeightEntry } from "@prisma/client";

import { formatDateBR } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import { MEASUREMENT_FIELDS } from "@/lib/measurements";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  deleteMeasurementEntryAction,
  deleteWeightEntryAction,
} from "./actions";
import { MeasurementDialog } from "./measurement-dialog";
import { WeightDialog } from "./weight-dialog";

type Props = {
  weightEntries: WeightEntry[];
  measurementEntries: MeasurementEntry[];
};

export function HistorySection({ weightEntries, measurementEntries }: Props) {
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [editingMeasurement, setEditingMeasurement] =
    useState<MeasurementEntry | null>(null);

  return (
    <Tabs defaultValue="peso">
      <TabsList>
        <TabsTrigger value="peso">Peso ({weightEntries.length})</TabsTrigger>
        <TabsTrigger value="medidas">
          Medidas ({measurementEntries.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="peso" className="mt-3">
        {weightEntries.length === 0 ? (
          <EmptyRow text="Nenhum peso registrado ainda." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {weightEntries.map((entry, index) => {
                const previous = weightEntries[index + 1];
                const delta = previous
                  ? entry.weightKg - previous.weightKg
                  : null;
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateBR(entry.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(entry.weightKg)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {delta === null
                        ? "—"
                        : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${formatNumber(Math.abs(delta))}`}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {entry.note ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar"
                          onClick={() => setEditingWeight(entry)}
                        >
                          <PencilIcon />
                        </Button>
                        <ConfirmDeleteButton
                          action={deleteWeightEntryAction}
                          id={entry.id}
                          ariaLabel="Excluir peso"
                          successMessage="Peso excluído."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="medidas" className="mt-3">
        {measurementEntries.length === 0 ? (
          <EmptyRow text="Nenhuma medida registrada ainda." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                {MEASUREMENT_FIELDS.map(({ key, label }) => (
                  <TableHead key={key} className="text-right whitespace-nowrap">
                    {label}
                  </TableHead>
                ))}
                <TableHead className="text-right">Gordura</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurementEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateBR(entry.date)}
                  </TableCell>
                  {MEASUREMENT_FIELDS.map(({ key }) => {
                    const value = entry[key];
                    return (
                      <TableCell
                        key={key}
                        className="text-right tabular-nums text-muted-foreground"
                      >
                        {value == null ? "—" : formatNumber(value)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {entry.bodyFatPct == null
                      ? "—"
                      : `${formatNumber(entry.bodyFatPct)}%`}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar"
                        onClick={() => setEditingMeasurement(entry)}
                      >
                        <PencilIcon />
                      </Button>
                      <ConfirmDeleteButton
                        action={deleteMeasurementEntryAction}
                        id={entry.id}
                        ariaLabel="Excluir medidas"
                        successMessage="Medidas excluídas."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <WeightDialog
        open={editingWeight !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWeight(null);
        }}
        entry={editingWeight}
      />
      <MeasurementDialog
        open={editingMeasurement !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMeasurement(null);
        }}
        entry={editingMeasurement}
      />
    </Tabs>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
