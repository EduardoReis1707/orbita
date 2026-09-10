"use client";

import { useState } from "react";
import {
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExportMealsButton({ defaultDate }: { defaultDate?: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  function openDialog() {
    setFrom("");
    setTo(defaultDate ?? "");
    setError(null);
    setOpen(true);
  }

  async function download(format: "pdf" | "csv" | "json") {
    if (from && to && from > to) {
      setError("A data inicial não pode ser depois da final.");
      return;
    }
    const params = new URLSearchParams({ formato: format });
    if (from) params.set("de", from);
    if (to) params.set("ate", to);
    setDownloading(true);
    const result = await triggerDownload(
      `/api/exportar/alimentacao?${params.toString()}`,
    );
    setDownloading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <DownloadIcon />
        Exportar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar alimentação</DialogTitle>
            <DialogDescription>
              Escolha o período e o formato. Deixe as datas em branco para
              exportar tudo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-de">De</Label>
              <Input
                id="exp-de"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-ate">Até</Label>
              <Input
                id="exp-ate"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter className="flex-row flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => void download("pdf")}
            >
              <FileTextIcon />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => void download("csv")}
            >
              <FileSpreadsheetIcon />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => void download("json")}
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
