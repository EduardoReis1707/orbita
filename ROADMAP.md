# Roadmap — Auxiliar de Treino

Plataforma web responsiva para acompanhamento pessoal de treino, alimentação,
metas e evolução física. Este documento acompanha o escopo do MVP e o andamento
por milestone.

## Stack

| Camada        | Tecnologia                                                        |
| ------------- | --------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, TypeScript, `src/`), React 19           |
| UI            | Tailwind CSS v4 + shadcn/ui, tema claro/escuro (`next-themes`)  |
| Autenticação  | Supabase Auth (e-mail/senha) via `@supabase/ssr`               |
| Banco         | PostgreSQL (Supabase) acessado via Prisma em Server Actions     |
| Segurança     | Autorização na camada de aplicação + RLS como defesa adicional  |
| Arquivos      | Supabase Storage (bucket privado); banco guarda só metadados    |
| Gráficos      | Recharts (componente de chart do shadcn)                        |
| Deploy        | Vercel                                                          |

## Escopo do MVP

Incluído: autenticação, onboarding/perfil, métricas corporais (peso e medidas),
treinos com histórico, alimentação básica, metas, dashboard com gráficos e
upload de PDFs.

Fora do MVP (fases seguintes): parte premium / Stripe, notificações, painel de
administração, relatórios em PDF/CSV, perfil de profissional (personal,
nutricionista), integrações via API, PWA instalável e sugestões inteligentes
avançadas.

## Milestones

Cada milestone é um incremento testável e termina com um commit.

- **M0 — Fundação** _(em andamento)_
  - Scaffold Next.js + Tailwind + shadcn/ui.
  - Tema claro/escuro.
  - Layout da aplicação: sidebar no desktop, navegação inferior no mobile.
  - Páginas placeholder das dez áreas do menu.
  - Landing page.
- **M1 — Supabase + Autenticação**
  - Conexão com Supabase e Prisma (modelos `User` e `Profile`).
  - Cadastro, login, logout e recuperação de senha.
  - Proteção de rotas (`proxy.ts`) e sessão no App Router.
  - Onboarding: dados básicos, objetivo e nível de atividade.
- **M2 — Métricas corporais**
  - Registro de peso e medidas com histórico e edição.
  - Cálculos: IMC, TMB, GET/TDEE, variação percentual, diferença para a meta.
  - Gráficos de evolução com seletor de período (7d, 30d, 3m, 6m, 1a,
    personalizado).
- **M3 — Treinos**
  - CRUD de treinos (grupo muscular, data, duração, status, observações).
  - CRUD de exercícios (séries, repetições, carga, descanso).
  - Histórico e comparações: evolução de carga por exercício e frequência.
- **M4 — Alimentação**
  - CRUD de refeições e alimentos (quantidade, horário, calorias, macros).
  - Resumo diário e comparação entre consumo estimado e metas.
- **M5 — Metas**
  - CRUD de metas (valor inicial, valor desejado, prazo, tipo).
  - Cálculo de progresso, percentual concluído e status.
  - Vínculo com peso, medidas, carga e frequência de treino.
- **M6 — Dashboard**
  - Cards de resumo, gráfico de evolução do peso, progresso das metas,
    próximos treinos e últimos registros.
  - Linha do tempo de registros e acontecimentos.
- **M7 — Arquivos**
  - Upload, listagem, download e exclusão de PDFs no Supabase Storage.
  - Nome, categoria, data e descrição; busca e filtros.
- **M8 — Ajustes finais**
  - Configurações (perfil, unidades, preferências, notificações, segurança).
  - Busca global e filtros.
  - Sugestões simples baseadas em regras.
  - PWA básico (manifest + service worker).
  - Deploy na Vercel.
