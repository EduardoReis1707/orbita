import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatDateBR, parseISODate } from "@/lib/date";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "@/lib/nutrition";
import type { MealType } from "@prisma/client";
import { Cell, PageChrome, type PdfMeta } from "./shared";
import { PDF, styles } from "./theme";

export type NutritionPdfFood = {
  name: string;
  quantity: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type NutritionPdfMeal = {
  isoDate: string;
  type: MealType;
  time: string | null;
  items: NutritionPdfFood[];
};

function n0(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function cell(value: number | null): string {
  return value == null ? "—" : n0(value);
}

function NutritionDocument({
  meals,
  meta,
}: {
  meals: NutritionPdfMeal[];
  meta: PdfMeta;
}) {
  const byDate = new Map<string, NutritionPdfMeal[]>();
  for (const meal of meals) {
    const list = byDate.get(meal.isoDate) ?? [];
    list.push(meal);
    byDate.set(meal.isoDate, list);
  }
  const dates = [...byDate.keys()].sort();

  return (
    <Document
      title="Alimentação — Auxiliar de Treino"
      author="Auxiliar de Treino"
    >
      <Page size="A4" style={styles.page}>
        <PageChrome
          title="Alimentação"
          meta={meta}
          footerNote="Valores nutricionais são estimativas informadas pelo usuário."
        />

        {dates.length === 0 ? (
          <Text style={styles.emptyNote}>Nenhuma refeição registrada.</Text>
        ) : null}

        {dates.map((isoDate) => {
          const dayMeals = (byDate.get(isoDate) ?? []).sort(
            (a, b) =>
              MEAL_TYPE_ORDER.indexOf(a.type) -
                MEAL_TYPE_ORDER.indexOf(b.type) ||
              (a.time ?? "").localeCompare(b.time ?? ""),
          );
          const dayTotals = dayMeals
            .flatMap((meal) => meal.items)
            .reduce(
              (acc, item) => ({
                calories: acc.calories + (item.calories ?? 0),
                proteinG: acc.proteinG + (item.proteinG ?? 0),
                carbsG: acc.carbsG + (item.carbsG ?? 0),
                fatG: acc.fatG + (item.fatG ?? 0),
              }),
              { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
            );

          return (
            <View key={isoDate}>
              <Text style={styles.h2} wrap={false}>
                {formatDateBR(parseISODate(isoDate) ?? new Date())}
              </Text>

              {dayMeals.map((meal, mi) => (
                <View key={mi}>
                  <Text style={[styles.sub, { marginTop: 4, marginBottom: 3 }]}>
                    {MEAL_TYPE_LABELS[meal.type]}
                    {meal.time ? ` · ${meal.time}` : ""}
                  </Text>
                  <View style={styles.table}>
                    <View style={styles.headRow}>
                      <Cell flex={3} head>
                        Alimento
                      </Cell>
                      <Cell flex={1.4} head>
                        Qtd.
                      </Cell>
                      <Cell flex={1} head align="center">
                        kcal
                      </Cell>
                      <Cell flex={0.8} head align="center">
                        P
                      </Cell>
                      <Cell flex={0.8} head align="center">
                        C
                      </Cell>
                      <Cell flex={0.8} head align="center">
                        G
                      </Cell>
                    </View>
                    {meal.items.map((item, ii) => (
                      <View
                        key={ii}
                        style={[styles.row, ii % 2 === 1 ? styles.zebra : {}]}
                        wrap={false}
                      >
                        <Cell flex={3}>{item.name}</Cell>
                        <Cell flex={1.4}>{item.quantity ?? "—"}</Cell>
                        <Cell flex={1} align="center">
                          {cell(item.calories)}
                        </Cell>
                        <Cell flex={0.8} align="center">
                          {cell(item.proteinG)}
                        </Cell>
                        <Cell flex={0.8} align="center">
                          {cell(item.carbsG)}
                        </Cell>
                        <Cell flex={0.8} align="center">
                          {cell(item.fatG)}
                        </Cell>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.totalRow} wrap={false}>
                <Cell flex={3} bold>
                  Total do dia
                </Cell>
                <Cell flex={1.4} bold>
                  {" "}
                </Cell>
                <Cell flex={1} bold align="center">
                  {n0(dayTotals.calories)}
                </Cell>
                <Cell flex={0.8} bold align="center">
                  {n0(dayTotals.proteinG)}
                </Cell>
                <Cell flex={0.8} bold align="center">
                  {n0(dayTotals.carbsG)}
                </Cell>
                <Cell flex={0.8} bold align="center">
                  {n0(dayTotals.fatG)}
                </Cell>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sub, { marginTop: 12, color: PDF.muted }]}>
          P = proteína · C = carboidrato · G = gordura, em gramas.
        </Text>
      </Page>
    </Document>
  );
}

export function renderNutritionPdf(
  meals: NutritionPdfMeal[],
  meta: PdfMeta,
): Promise<Buffer> {
  return renderToBuffer(<NutritionDocument meals={meals} meta={meta} />);
}
