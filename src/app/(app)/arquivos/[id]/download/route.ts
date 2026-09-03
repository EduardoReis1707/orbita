import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORAGE_BUCKET, createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const doc = await prisma.fileDocument.findFirst({
    where: { id: documentId, profileId: user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storagePath, 60, {
      download: `${doc.name}.pdf`,
    });

  if (error || !data) {
    return NextResponse.json(
      { error: "could not sign url" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
