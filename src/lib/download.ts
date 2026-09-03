/** Dispara o download de uma URL sem sair da página. */
export function triggerDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
