"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function clearChatAction(): Promise<void> {
  const user = await requireUser();
  await prisma.chatMessage.deleteMany({ where: { profileId: user.id } });
  revalidatePath("/assistente");
}
