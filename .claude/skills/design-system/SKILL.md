---
name: design-system
description: Convenções de UI, design e front-end do Auxiliar de Treino (Next.js 16 + Tailwind v4 + shadcn/ui estilo base-nova). Consulte antes de criar ou alterar qualquer tela, componente, estilo ou texto de interface.
---

# Design System — Auxiliar de Treino

Plataforma web responsiva de acompanhamento de treino, alimentação, metas e
evolução física. Interface em **português do Brasil**, **mobile-first**, com
estética de **software profissional de saúde e produtividade** — não de
"app de academia".

## Stack e ferramentas

- **Next.js 16** (App Router, TypeScript, `src/`), **React 19**, Turbopack.
- **Tailwind CSS v4** — configuração por CSS em `src/app/globals.css`
  (`@theme inline`, `@custom-variant dark`). Não existe `tailwind.config`.
- **shadcn/ui no estilo `base-nova`** (ver `components.json`). Este estilo usa
  **`@base-ui/react`**, não Radix. Consequências práticas:
  - Não existe `asChild`. Para trocar o elemento renderizado, use a prop
    **`render`**: `<SidebarMenuButton render={<Link href="/x" />}>…</SidebarMenuButton>`.
  - `Button` é `@base-ui/react/button`. Para um **link com aparência de botão**,
    NÃO use `<Button render={<Link/>}>` (gera aviso de acessibilidade
    "expected a native <button>"). Use:
    `<Link href="/x" className={buttonVariants({ variant, size })}>`.
  - `Select`, `DropdownMenu` etc. também usam `render` para polimorfismo.
- **lucide-react** para ícones (nomes com sufixo `Icon`, ex.: `DumbbellIcon`).
- **Recharts** via o componente `chart` do shadcn (M2 em diante).
- **next-themes** para tema claro/escuro (`ThemeProvider` no root layout).
- Formulários: **Server Actions + `useActionState`** (React 19) + validação
  **Zod v4** no servidor. Zod 4: use `z.email()`, `z.flattenError(err)`,
  `z.enum([...])`. Sem `react-hook-form`.
- Arquivos `"use server"` só podem exportar **funções async** — nunca objetos
  ou constantes (mova-os para um módulo comum).

## Tokens de cor (definidos em `globals.css`)

Sempre use os tokens semânticos via classes Tailwind (`bg-primary`,
`text-muted-foreground`, `border-border`…), nunca hex fixo.

| Token | Uso |
| --- | --- |
| `background` / `foreground` | fundo e texto padrão |
| `card` / `card-foreground` | superfícies elevadas |
| `muted` / `muted-foreground` | fundos sutis, texto secundário |
| `primary` | ação principal — roxo `#69078C` (claro) / orquídea `#D064F7` (escuro) |
| `secondary`, `accent` | apoio |
| `border`, `input`, `ring` | traços e foco |
| `destructive` | erros e ações destrutivas — **só** para isso |
| `success` | progresso, metas atingidas, tendências positivas — **com moderação** |
| `warning` | avisos e ações que pedem atenção (laranja) |
| `chart-1..5` | séries de gráfico (verde, azul, âmbar, violeta, cinza-azulado) |

### Marca e gradiente

Paleta roxa sobre base branca moderna:

| Hex | Papel |
| --- | --- |
| `#69078C` | roxo primário (tema claro) |
| `#330444` | roxo profundo — fundos escuros e texto |
| `#D064F7` | orquídea — destaque, brilho e `primary` no tema escuro |

- Gradiente da marca: variável `--gradient-brand` (roxo → orquídea, 135°).
  Use a utilidade **`bg-brand-gradient`** — só em **fundos** (marca, CTA
  principal, brilho do hero). Nunca em texto (gradiente em texto é tell de
  IA e prejudica leitura).
- A marca do produto é o componente **`BrandMark`**
  (`src/components/brand-mark.tsx`) — quadrado com o gradiente e o ícone.
  Não recriar o quadradinho à mão.
- `Button` variante `default` já usa `bg-brand-gradient` + brilho/elevação no
  hover (`motion-safe`). Para link com cara de botão primário, continue usando
  `buttonVariants({ size })` — herda o gradiente.

Direção visual: base branca (quase pura), bastante espaço em branco, bordas
discretas, cantos levemente arredondados (`--radius: 0.625rem`), roxo como
única família de destaque. Gradiente só em pontos-âncora (marca, CTA
principal, brilho atrás do hero) — não como decoração espalhada. Evitar a
aparência genérica de "kit de cards SaaS": nem toda seção precisa ser um card
com a mesma sombra.

## Tipografia

- Fonte: **Geist** (`--font-sans`) para corpo; `font-heading` (mapeado para a
  mesma família) em títulos. `--font-geist-mono` para números tabulares quando
  fizer sentido (ex.: colunas de carga/peso).
- Escala com hierarquia clara. Títulos de página em `text-sm`/`text-base`
  `font-semibold` no cabeçalho do app; hero da landing em `text-3xl`→`text-5xl`.
- **Não** usar ALL-CAPS para rótulos. **Não** destacar uma única palavra do
  título em cor/itálico. **Não** adicionar rótulos tipográficos decorativos
  acima do conteúdo.

## Layout e navegação

- **Desktop:** `SidebarProvider` + `AppSidebar` (colapsável em ícones) +
  `SidebarInset` com `AppHeader` fixo no topo.
- **Mobile:** `MobileNav` — barra inferior fixa com os itens principais
  (`mobileNavHrefs` em `src/lib/nav.ts`); a sidebar vira Sheet.
- A navegação canônica é `mainNav` em `src/lib/nav.ts`. Ao adicionar área nova,
  registre lá (título, href, ícone, milestone).
- Conteúdo das páginas do app dentro de `<main className="flex-1 p-4 pb-24
  md:p-6 md:pb-6">` (o `pb-24` no mobile evita a barra inferior cobrir o
  conteúdo).
- Rotas agrupadas: `(marketing)` (público), `(auth)` (login/cadastro),
  `(app)` (autenticado, com shell), `onboarding` (autenticado, sem shell).

## Componentes e padrões

- Reaproveite os componentes de `src/components/ui/*`. Só adicione novos via
  `npx shadcn@latest add <nome>`.
- Feedback de formulário: `FormAlert`, `FieldError`, `SubmitButton` de
  `src/components/form-feedback.tsx`. Estado padrão: `FormState` /
  `initialFormState` de `src/lib/forms.ts`.
- Toasts: `sonner` (`<Toaster richColors position="top-center" />` já no root).
- Estados de carregamento: `Skeleton`. Estados vazios: um convite para agir
  (botão + frase curta), não só "nenhum dado".
- Datas e números: formato brasileiro (`pt-BR`) — `Intl.NumberFormat("pt-BR")`,
  vírgula decimal, `kg`, `cm`, `kcal`.

## Texto de interface

- Português do Brasil, tom **conversacional e direto**, frases em caixa baixa
  (sentence case), sem floreio.
- Voz ativa nos botões, dizendo o que acontece: "Salvar alterações", não
  "Enviar". O rótulo do botão e a confirmação combinam ("Concluir" →
  "Perfil salvo").
- Erros explicam o que aconteceu e como resolver, na voz do sistema, sem pedir
  desculpas e sem ser vago.
- Nomear pelo que o usuário entende ("Notificações", não "webhooks").
- Sempre deixar claro quando um número é **estimativa** (IMC, TMB, GET) e que
  não substitui avaliação de profissionais de saúde.

## Acessibilidade e qualidade (piso, não extra)

- Responsivo até 360px de largura; nada de scroll horizontal.
- Foco de teclado visível (os componentes já trazem `focus-visible:ring`).
- `aria-label` em botões só com ícone.
- Respeitar `prefers-reduced-motion`; movimento só para indicar mudança de
  estado (abrir, confirmar), nunca entradas animadas em toda seção.
- Contraste suficiente nos dois temas — testar claro **e** escuro.

## Antes de finalizar qualquer UI

1. Rodou `npm run lint` e `npm run build` sem erros.
2. Conferiu no tema claro e no escuro.
3. Conferiu em largura de celular.
4. Os textos seguem o tom acima e estão em pt-BR.
5. Nenhum hex fixo onde havia token; nenhum `console.log` esquecido.
