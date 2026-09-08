import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

/**
 * Extrai texto de arquivos anexados no chat do assistente (PDF, Excel) pra
 * entregar pro modelo interpretar. A Groq não lê PDF/imagem nativamente como
 * o Gemini — por isso a extração acontece aqui, em texto puro, antes de
 * montar a mensagem enviada à IA.
 *
 * Só funciona com PDF de texto selecionável (gerado por Word, site, etc.) —
 * PDF escaneado/foto de papel não tem texto pra extrair (sem OCR nesse
 * caminho) e recebe um erro explicando isso.
 */

/** Teto de tamanho do arquivo — payload prático de function na Vercel. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
/** Teto de texto extraído enviado pro modelo — protege a cota grátis da Groq. */
const MAX_EXTRACTED_CHARS = 12_000;

export type AttachmentExtractResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; error: string };

function truncate(text: string): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_EXTRACTED_CHARS) {
    return { text: trimmed, truncated: false };
  }
  return {
    text: `${trimmed.slice(0, MAX_EXTRACTED_CHARS)}\n\n[...conteúdo cortado por tamanho...]`,
    truncated: true,
  };
}

async function extractPdf(buffer: Buffer): Promise<AttachmentExtractResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    // Texto corrido pro contexto geral + detecção de tabelas à parte — ficha
    // de treino/dieta em PDF costuma vir em tabela, e o texto corrido do
    // pdf.js embaralha colunas (perde a relação "exercício ↔ séries ↔ carga").
    const [textResult, tableResult] = await Promise.all([
      parser.getText(),
      parser.getTable().catch(() => null),
    ]);
    const text = textResult.text ?? "";
    if (text.trim().length < 20) {
      return {
        ok: false,
        error:
          "Não consegui ler texto nesse PDF — parece ser um PDF escaneado ou uma imagem. Esse formato não é suportado por aqui; funciona melhor com um PDF gerado direto de um documento, com texto selecionável.",
      };
    }

    const tableSections = (tableResult?.pages ?? [])
      .flatMap((page) =>
        page.tables.map((table) => {
          const rows = table.filter((row) => row.some((cell) => cell.trim()));
          if (rows.length === 0) return null;
          return `Tabela (página ${page.num}):\n${rows
            .map((row) => `| ${row.map((cell) => cell.trim()).join(" | ")} |`)
            .join("\n")}`;
        }),
      )
      .filter((section): section is string => Boolean(section));

    // Tabelas primeiro — é o dado mais estruturado; se truncar, prioriza isso.
    const combined =
      tableSections.length > 0
        ? `${tableSections.join("\n\n")}\n\n---\n\nTexto completo do documento:\n${text}`
        : text;

    return { ok: true, ...truncate(combined) };
  } finally {
    await parser.destroy();
  }
}

function extractSpreadsheet(buffer: Buffer): AttachmentExtractResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return {
      ok: false,
      error:
        "Não consegui abrir essa planilha — o arquivo pode estar corrompido ou num formato não suportado.",
    };
  }

  const sections = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet).trim();
    return csv ? `## Aba: ${name}\n${csv}` : null;
  }).filter((section): section is string => Boolean(section));

  if (sections.length === 0) {
    return { ok: false, error: "Essa planilha parece estar vazia." };
  }
  return { ok: true, ...truncate(sections.join("\n\n")) };
}

function isSpreadsheet(ext: string, mimeType: string): boolean {
  return (
    ext === "xlsx" ||
    ext === "xls" ||
    mimeType.includes("spreadsheet") ||
    mimeType === "application/vnd.ms-excel"
  );
}

/** Só PDF e planilhas Excel são aceitos como anexo no chat. */
export function isSupportedAttachment(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return ext === "pdf" || mimeType === "application/pdf" || isSpreadsheet(ext, mimeType);
}

/** Extrai o texto de um PDF ou planilha anexado no chat. */
export async function extractAttachmentText(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<AttachmentExtractResult> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || mimeType === "application/pdf") {
    return extractPdf(buffer);
  }
  if (isSpreadsheet(ext, mimeType)) {
    return extractSpreadsheet(buffer);
  }
  return {
    ok: false,
    error: "Formato de arquivo não suportado — anexe um PDF ou uma planilha Excel (.xlsx/.xls).",
  };
}
