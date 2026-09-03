import { getProfile, getUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Bem-vindo" };

export default async function OnboardingPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);

  const defaultName =
    profile?.fullName ??
    (typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "");

  return <OnboardingForm defaultName={defaultName} />;
}
