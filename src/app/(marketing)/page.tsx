import type { Metadata } from "next";

import { Hero } from "./_components/hero";
import { FeatureGrid } from "./_components/feature-grid";
import { HowItWorks } from "./_components/how-it-works";
import { Showcase } from "./_components/showcase";
import { Pricing } from "./_components/pricing";
import { Cta } from "./_components/cta";

export const metadata: Metadata = {
  description:
    "Registre treino, alimentação, peso e medidas em um só lugar e acompanhe a evolução com gráficos, metas e relatórios.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <HowItWorks />
      <Showcase />
      <Pricing />
      <Cta />
    </>
  );
}
