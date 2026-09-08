"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Entrar
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a sua senha."),
});

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message:
        error.code === "email_not_confirmed"
          ? "Confirme o seu e-mail antes de entrar. Verifique a sua caixa de entrada."
          : "E-mail ou senha incorretos.",
    };
  }

  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" &&
    nextRaw.startsWith("/") &&
    !nextRaw.startsWith("//")
      ? nextRaw
      : "/painel";
  redirect(next);
}

// ---------------------------------------------------------------------------
// Cadastrar
// ---------------------------------------------------------------------------

const signUpSchema = z.object({
  fullName: z.string().min(2, "Informe o seu nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
});

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[signUpAction]", error.code, error.message);
    }

    let message = "Não foi possível criar a conta. Tente novamente.";
    if (
      error.code === "user_already_exists" ||
      error.message.toLowerCase().includes("already registered")
    ) {
      message = "Já existe uma conta com esse e-mail.";
    } else if (error.code === "over_email_send_rate_limit") {
      message =
        "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    } else if (error.code === "weak_password") {
      message = "Escolha uma senha mais forte.";
    } else if (error.code === "signup_disabled") {
      message = "O cadastro está desativado no momento.";
    }

    return { status: "error", message };
  }

  if (!data.session) {
    return {
      status: "success",
      message:
        "Enviamos um e-mail de confirmação. Abra o link para ativar a sua conta.",
    };
  }

  redirect("/onboarding");
}

// ---------------------------------------------------------------------------
// Recuperação de senha
// ---------------------------------------------------------------------------

const requestResetSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/redefinir-senha`,
  });

  return {
    status: "success",
    message:
      "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
  };
}

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });

export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message:
        "O link de redefinição expirou. Solicite um novo e-mail de recuperação.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "Não foi possível atualizar a senha. Tente novamente.",
    };
  }

  redirect("/painel");
}
