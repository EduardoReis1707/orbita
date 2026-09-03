import { redirect } from "next/navigation";
import { InfoIcon } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStorageConfigured } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentList } from "./document-list";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Arquivos" };

export default async function ArquivosPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const storageReady = isStorageConfigured();

  const documents = storageReady
    ? await prisma.fileDocument.findMany({
        where: { profileId: user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Guarde em PDF a sua ficha de treino, plano alimentar, avaliações e
        exames num só lugar.
      </p>

      {!storageReady ? (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              O envio de arquivos ainda não está configurado. Falta adicionar a
              chave secreta do Supabase (<code>SUPABASE_SECRET_KEY</code>) no
              arquivo <code>.env.local</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <UploadForm />
          <section className="space-y-3">
            <h2 className="font-heading text-sm font-semibold">
              Seus documentos
            </h2>
            <DocumentList documents={documents} />
          </section>
        </>
      )}
    </div>
  );
}
