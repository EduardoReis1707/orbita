import type { LucideIcon } from "lucide-react";
import {
  AppleIcon,
  DumbbellIcon,
  FileTextIcon,
  FolderIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  RulerIcon,
  SettingsIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Milestone em que esta área entra em funcionamento. */
  milestone: string;
};

/** Navegação principal da aplicação (sidebar no desktop). */
export const mainNav: NavItem[] = [
  { title: "Painel", href: "/painel", icon: LayoutDashboardIcon, milestone: "M6" },
  { title: "Treinos", href: "/treinos", icon: DumbbellIcon, milestone: "M3" },
  { title: "Alimentação", href: "/alimentacao", icon: AppleIcon, milestone: "M4" },
  { title: "Metas", href: "/metas", icon: TargetIcon, milestone: "M5" },
  { title: "Evolução", href: "/evolucao", icon: TrendingUpIcon, milestone: "M2" },
  { title: "Medidas", href: "/medidas", icon: RulerIcon, milestone: "M2" },
  { title: "Arquivos", href: "/arquivos", icon: FolderIcon, milestone: "M7" },
  { title: "Relatórios", href: "/relatorios", icon: FileTextIcon, milestone: "M8" },
  { title: "Dicas", href: "/dicas", icon: LightbulbIcon, milestone: "M8" },
  { title: "Configurações", href: "/configuracoes", icon: SettingsIcon, milestone: "M8" },
];

/** Itens que aparecem na barra de navegação inferior no mobile. */
export const mobileNavHrefs = [
  "/painel",
  "/treinos",
  "/alimentacao",
  "/metas",
  "/evolucao",
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
