import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/ai/client";
import { AssistantChat } from "./chat";

export const metadata = { title: "Assistente" };

export default async function AssistentePage() {
  const user = await requireUser();

  const history = isAiConfigured()
    ? await prisma.chatMessage.findMany({
        where: { profileId: user.id },
        orderBy: { createdAt: "asc" },
        take: 100,
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <AssistantChat
        aiEnabled={isAiConfigured()}
        initialMessages={history.map((message) => ({
          id: String(message.id),
          role: message.role === "USER" ? "user" : "assistant",
          content: message.content,
        }))}
      />
    </div>
  );
}
