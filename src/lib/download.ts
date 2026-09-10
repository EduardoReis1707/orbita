/**
 * Baixa uma exportação sem sair da página e devolve erros HTTP para a tela.
 * Isso permite mostrar a cota de PDF em vez de baixar uma resposta de erro.
 */
export async function triggerDownload(
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Não foi possível preparar o arquivo agora.",
    };
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(contentDisposition)?.[1] ?? "exportacao";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return { ok: true };
}
