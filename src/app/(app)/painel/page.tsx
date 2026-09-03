import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = { title: "Painel" };

export default function PainelPage() {
  return (
    <PagePlaceholder
      title="Painel"
      description="Resumo da sua evolução: peso, IMC, treinos da semana, progresso das metas e últimos registros."
      milestone="M6"
    />
  );
}
