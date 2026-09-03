"use client";

import { DownloadIcon, FileJsonIcon, FileSpreadsheetIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Menu "Exportar" com download em JSON (backup) e CSV (planilha). */
export function ExportMenu({ base }: { base: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <DownloadIcon />
        Exportar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<a href={`${base}?formato=json`} download />}>
          <FileJsonIcon />
          Baixar JSON (backup)
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={`${base}?formato=csv`} download />}>
          <FileSpreadsheetIcon />
          Baixar CSV (planilha)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
