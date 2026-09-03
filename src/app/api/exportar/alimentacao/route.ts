import { NextResponse, type NextRequest } from "next/server";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toISODate, todayISO } from "@/lib/date";
import { downloadHeaders, toCsv } from "@/lib/export";
import { renderNutritionPdf } from "@/lib/pdf/nutrition-pdf";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const requested = request.nextUrl.searchParams.get("formato");
  const format =
    requested === "csv" || requested === "pdf" ? requested : "json";

  const meals = await prisma.meal.findMany({
    where: { profileId: user.id },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { items: { orderBy: { position: "asc" } } },
  });

  const stamp = todayISO();

  if (format === "pdf") {
    const profile = await getProfile();
    const buffer = await renderNutritionPdf(
      meals.map((meal) => ({
        isoDate: toISODate(meal.date),
        type: meal.type,
        time: meal.time,
        items: meal.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        })),
      })),
      { userName: profile?.fullName ?? "", generatedAt: new Date() },
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: downloadHeaders(`alimentacao-${stamp}.pdf`, "application/pdf"),
    });
  }

  if (format === "csv") {
    const rows = meals.flatMap((meal) =>
      (meal.items.length > 0 ? meal.items : [null]).map((item) => ({
        data: toISODate(meal.date),
        refeicao: MEAL_TYPE_LABELS[meal.type],
        horario: meal.time ?? "",
        alimento: item?.name ?? "",
        quantidade: item?.quantity ?? "",
        kcal: item?.calories ?? "",
        proteina_g: item?.proteinG ?? "",
        carbo_g: item?.carbsG ?? "",
        gordura_g: item?.fatG ?? "",
      })),
    );

    const csv = toCsv(rows, [
      ["data", "Data"],
      ["refeicao", "Refeição"],
      ["horario", "Horário"],
      ["alimento", "Alimento"],
      ["quantidade", "Quantidade"],
      ["kcal", "Calorias (kcal)"],
      ["proteina_g", "Proteína (g)"],
      ["carbo_g", "Carboidrato (g)"],
      ["gordura_g", "Gordura (g)"],
    ]);

    return new NextResponse(csv, {
      headers: downloadHeaders(`alimentacao-${stamp}.csv`, "text/csv"),
    });
  }

  const payload = {
    exportadoEm: new Date().toISOString(),
    tipo: "alimentacao",
    refeicoes: meals.map((meal) => ({
      data: toISODate(meal.date),
      tipo: meal.type,
      horario: meal.time,
      observacao: meal.note,
      alimentos: meal.items.map((item) => ({
        nome: item.name,
        quantidade: item.quantity,
        calorias: item.calories,
        proteinaG: item.proteinG,
        carboidratoG: item.carbsG,
        gorduraG: item.fatG,
      })),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: downloadHeaders(`alimentacao-${stamp}.json`, "application/json"),
  });
}
