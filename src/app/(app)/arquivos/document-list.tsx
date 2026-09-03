"use client";

import { useState } from "react";
import { DownloadIcon, FileTextIcon } from "lucide-react";
import type { DocumentCategory, FileDocument } from "@prisma/client";

import { formatDateBR } from "@/lib/date";
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_VALUES,
  formatBytes,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteDocumentAction } from "./actions";

export function DocumentList({ documents }: { documents: FileDocument[] }) {
  const [filter, setFilter] = useState<DocumentCategory | "ALL">("ALL");

  const present = new Set(documents.map((doc) => doc.category));
  const filtered =
    filter === "ALL"
      ? documents
      : documents.filter((doc) => doc.category === filter);

  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhum documento ainda. Envie o primeiro acima.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <FilterChip
          active={filter === "ALL"}
          onClick={() => setFilter("ALL")}
        >
          Todos ({documents.length})
        </FilterChip>
        {DOCUMENT_CATEGORY_VALUES.filter((value) => present.has(value)).map(
          (value) => (
            <FilterChip
              key={value}
              active={filter === value}
              onClick={() => setFilter(value)}
            >
              {DOCUMENT_CATEGORY_LABELS[value]}
            </FilterChip>
          ),
        )}
      </div>

      <ul className="space-y-2">
        {filtered.map((doc) => (
          <li key={doc.id}>
            <Card className="py-0">
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <FileTextIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    {" · "}
                    {formatBytes(doc.sizeBytes)}
                    {" · "}
                    {formatDateBR(doc.createdAt)}
                  </p>
                  {doc.description ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={`/arquivos/${doc.id}/download`}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
                    aria-label="Baixar"
                  >
                    <DownloadIcon className="size-4" />
                  </a>
                  <ConfirmDeleteButton
                    action={deleteDocumentAction}
                    id={doc.id}
                    ariaLabel="Excluir documento"
                    successMessage="Documento excluído."
                  />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
