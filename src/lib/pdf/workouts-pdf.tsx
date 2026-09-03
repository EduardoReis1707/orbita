import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatDateBR } from "@/lib/date";
import { WORKOUT_STATUS_LABELS } from "@/lib/workouts";
import { Cell, PageChrome, type PdfMeta } from "./shared";
import { PDF, styles } from "./theme";

export type WorkoutPdfExercise = {
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  restSec: number | null;
  note: string | null;
};

export type WorkoutPdfItem = {
  name: string;
  date: Date;
  status: keyof typeof WORKOUT_STATUS_LABELS;
  muscleGroups: string[];
  durationMin: number | null;
  note: string | null;
  exercises: WorkoutPdfExercise[];
};

function num(value: number | null): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function WorkoutsDocument({
  workouts,
  meta,
}: {
  workouts: WorkoutPdfItem[];
  meta: PdfMeta;
}) {
  return (
    <Document title="Treinos — Auxiliar de Treino" author="Auxiliar de Treino">
      <Page size="A4" style={styles.page}>
        <PageChrome title="Treinos" meta={meta} />

        {workouts.length === 0 ? (
          <Text style={styles.emptyNote}>Nenhum treino registrado.</Text>
        ) : null}

        {workouts.map((workout, index) => (
          <View key={index}>
            <View wrap={false}>
              <Text style={styles.h2}>{workout.name}</Text>
              <Text style={styles.sub}>
                {formatDateBR(workout.date)} ·{" "}
                {WORKOUT_STATUS_LABELS[workout.status]}
                {workout.durationMin ? ` · ${workout.durationMin} min` : ""}
              </Text>
              {workout.muscleGroups.length > 0 ? (
                <View style={styles.chipRow}>
                  {workout.muscleGroups.map((group) => (
                    <Text key={group} style={styles.chip}>
                      {group}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            {workout.exercises.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.headRow}>
                  <Cell flex={3} head>
                    Exercício
                  </Cell>
                  <Cell flex={1} head align="center">
                    Séries
                  </Cell>
                  <Cell flex={1} head align="center">
                    Reps
                  </Cell>
                  <Cell flex={1} head align="center">
                    Carga (kg)
                  </Cell>
                  <Cell flex={1} head align="center">
                    Desc. (s)
                  </Cell>
                </View>
                {workout.exercises.map((exercise, i) => (
                  <View
                    key={i}
                    style={[styles.row, i % 2 === 1 ? styles.zebra : {}]}
                    wrap={false}
                  >
                    <Cell flex={3}>
                      {exercise.name}
                      {exercise.note ? (
                        <Text style={{ color: PDF.muted }}>
                          {" "}
                          — {exercise.note}
                        </Text>
                      ) : null}
                    </Cell>
                    <Cell flex={1} align="center">
                      {exercise.sets ?? "—"}
                    </Cell>
                    <Cell flex={1} align="center">
                      {exercise.reps ?? "—"}
                    </Cell>
                    <Cell flex={1} align="center">
                      {num(exercise.weightKg)}
                    </Cell>
                    <Cell flex={1} align="center">
                      {exercise.restSec ?? "—"}
                    </Cell>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyNote}>Sem exercícios.</Text>
            )}

            {workout.note ? (
              <Text style={[styles.sub, { marginTop: 4 }]}>
                Observação: {workout.note}
              </Text>
            ) : null}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function renderWorkoutsPdf(
  workouts: WorkoutPdfItem[],
  meta: PdfMeta,
): Promise<Buffer> {
  return renderToBuffer(<WorkoutsDocument workouts={workouts} meta={meta} />);
}
