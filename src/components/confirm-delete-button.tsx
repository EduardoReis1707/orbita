"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  /** Server Action que recebe um FormData com `id` e apaga o registro. */
  action: (formData: FormData) => Promise<void>;
  id: string | number;
  ariaLabel?: string;
  successMessage?: string;
};

export function ConfirmDeleteButton({
  action,
  id,
  ariaLabel = "Excluir",
  successMessage = "Registro excluído.",
}: Props) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const formData = new FormData();
    formData.set("id", String(id));
    startTransition(async () => {
      await action(formData);
      toast.success(successMessage);
      setArmed(false);
      router.refresh();
    });
  }

  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={ariaLabel}
        onClick={() => setArmed(true)}
      >
        <Trash2Icon />
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Button
        variant="destructive"
        size="xs"
        disabled={pending}
        onClick={handleDelete}
      >
        {pending ? "Excluindo…" : "Confirmar"}
      </Button>
      <Button variant="ghost" size="xs" onClick={() => setArmed(false)}>
        Cancelar
      </Button>
    </span>
  );
}
