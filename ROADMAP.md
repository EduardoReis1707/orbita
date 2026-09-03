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

- **M0 — Fundação** ✅
  - Scaffold Next.js + Tailwind + shadcn/ui.
  - Tema claro/escuro.
  - Layout da aplicação: sidebar no desktop, navegação inferior no mobile.
  - Páginas placeholder das dez áreas do menu.
  - Landing page.
- **M1 — Supabase + Autenticação** ✅
  - Conexão com Supabase e Prisma (modelo `Profile`).
  - Cadastro, login, logout e recuperação de senha.
  - Proteção de rotas (`proxy.ts`) e sessão no App Router.
  - Onboarding: dados básicos, objetivo e nível de atividade.
  - RLS habilitado na tabela `profiles` como defesa adicional.
- **M2 — Métricas corporais** ✅
  - Registro de peso e medidas com histórico, edição e exclusão.
  - Cálculos: IMC (+ faixa), TMB (Mifflin-St Jeor), GET/TDEE, variação de
    peso e progresso rumo ao peso-meta.
  - Página `/medidas` com cards de resumo e histórico em abas.
  - Página `/evolucao` com gráficos (peso, IMC, medidas) e seletor de
    período (7d, 30d, 3m, 6m, 1a, tudo).
  - Tabelas `weight_entries` e `measurement_entries` com RLS.
- **M3 — Treinos** ✅
  - CRUD de treinos (grupos musculares, data, duração, status, observações)
    em `/treinos` e `/treinos/[id]`.
  - CRUD de exercícios por treino (séries, repetições, carga, descanso).
  - Cards de resumo: treinos no mês, frequência semanal, volume, último treino.
  - Aba "Por exercício": evolução da carga máxima por exercício em gráfico.
  - Tabelas `workouts` e `exercises` com RLS.
- **M4 — Alimentação** ✅
  - CRUD de refeições e alimentos (quantidade, horário, calorias, macros).
  - Navegação por dia, resumo diário com barras de consumo × meta.
  - Metas de nutrição no perfil, com sugestão a partir do GET e do objetivo.
  - Lista dos últimos dias com total de calorias.
  - Tabelas `meals` e `food_items` com RLS.
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
