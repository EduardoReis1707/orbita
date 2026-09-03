import { Text, View } from "@react-pdf/renderer";

import { formatDateBR } from "@/lib/date";
import { styles } from "./theme";

export type PdfMeta = { userName: string; generatedAt: Date };

export function PageChrome({
  title,
  meta,
  footerNote,
}: {
  title: string;
  meta: PdfMeta;
  footerNote?: string;
}) {
  return (
    <>
      <View style={styles.headerBand} fixed />
      <View style={styles.headerAccent} fixed />
      <View style={styles.headerContent} fixed>
        <View>
          <Text style={styles.brand}>Auxiliar de Treino</Text>
          <Text style={styles.docTitle}>{title}</Text>
        </View>
        <View>
          <Text style={styles.metaLine}>{meta.userName}</Text>
          <Text style={styles.metaLine}>
            Exportado em {formatDateBR(meta.generatedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.footer} fixed>
        <Text>{footerNote ?? "Gerado pelo Auxiliar de Treino"}</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </>
  );
}

export function Cell({
  children,
  flex,
  align = "left",
  bold = false,
  head = false,
}: {
  children: React.ReactNode;
  flex: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  head?: boolean;
}) {
  const base = head ? styles.th : bold ? styles.tdBold : styles.td;
  return <Text style={[base, { flex, textAlign: align }]}>{children}</Text>;
}
