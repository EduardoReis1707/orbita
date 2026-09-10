import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGroqConfigured } from "@/lib/ai/groq-client";
import { GOAL_TYPE_LABELS } from "@/lib/profile";
import { AssistantChat } from "./chat";

export const metadata = { title: "Assistente" };

/**
 * Mensagem de boas-vindas roteirizada (sem chamar a IA — grátis e instantânea)
 * mostrada só quando a pessoa ainda não tem nenhuma conversa. É o "primeiro
 * contato" logo após o onboarding: usa o que o formulário já coletou pra
 * puxar assunto e convidar a pessoa a detalhar o objetivo, o que dispara a
 * sugestão inicial (metas de nutrição + treino + refeições) no back-end.
 */
function buildWelcomeMessage(profile: {
  fullName: string;
  goalType: keyof typeof GOAL_TYPE_LABELS | null;
  targetWeightKg: number | null;
} | null) {
  const firstName = profile?.fullName?.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Oi, ${firstName}! 👋` : "Oi! 👋";

  if (!profile?.goalType) {
    return `${greeting} Que bom ter você por aqui. Me conta: qual é o seu objetivo agora — perder peso, ganhar massa, manter, melhorar o condicionamento? A partir disso eu já monto um ponto de partida pra você: metas de nutrição, um treino inicial e sugestões de refeição. Você ajusta tudo depois, é só um começo 🙂`;
  }

  const goalLabel = GOAL_TYPE_LABELS[profile.goalType].toLowerCase();
  const targetPart = profile.targetWeightKg
    ? `, com meta de chegar a ${profile.targetWeightKg} kg`
    : "";

  return `${greeting} Que bom ter você por aqui. Vi que seu objetivo é **${goalLabel}**${targetPart}. Me conta um pouco mais — algum prazo em mente, o que te motivou, algo específico que eu deva saber — e eu já monto um ponto de partida pra você: metas de calorias e macros, um treino inicial e algumas sugestões de refeição pro seu dia. Você ajusta tudo depois, é só um começo 🙂`;
}

export default async function AssistentePage() {
  const user = await requireUser();

  const [history, profile] = await Promise.all([
    isGroqConfigured()
      ? prisma.chatMessage.findMany({
          where: { profileId: user.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
        })
      : Promise.resolve([]),
    getProfile(),
  ]);

  const messages = history.reverse().map((message) => ({
    id: String(message.id),
    role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: message.content,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <AssistantChat
        aiEnabled={isGroqConfigured()}
        initialMessages={messages}
        welcomeMessage={buildWelcomeMessage(profile)}
      />
    </div>
  );
}
