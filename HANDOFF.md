# Handoff — Auxiliar de Treino

Documento pra continuar o projeto no Claude Code desktop. Escrito em 2026-09-06.

## Onde o projeto está

- **App**: "Auxiliar de Treino" — Next.js 16 (App Router, Turbopack), Supabase
  Auth, Prisma + Postgres (Supabase), deploy na Vercel (integração Git com
  `EduardoReis1707/treinamento`, push em `main` = deploy).
- **Produção**: funcionando. O erro de "server error" nas rotas autenticadas
  era `DATABASE_URL` vazio nas env vars da Vercel — resolvido (valores
  recolocados a partir do `.env.local` + redeploy sem cache).
- **Branch atual**: `feat/assistente-tom-e-onboarding` — commit `1197fbb`.
  Ainda **não foi feito push nem merge** (a pedido do usuário). O `main` local
  está em `f0db5ae`.

## O que tem nessa branch (commit 1197fbb)

Continuação do "assistente com ações" (function calling via Groq). Cinco
frentes:

1. **Tom mais humano** — `src/lib/ai/assistant-context.ts`: o
   `ASSISTANT_SYSTEM_PROMPT` foi reescrito pra conversar como gente (sem
   cabeçalho markdown, sem lista com marcador), usar o primeiro nome, puxar
   2-3 perguntas antes de despejar um plano pronto, e escrever cada item
   (exercício, refeição) na própria linha. `src/app/(app)/assistente/chat.tsx`
   renderiza `**negrito**` de verdade com um `renderInlineMarkdown` leve (sem
   trazer lib de markdown).

2. **Não duplicar registros** — `src/lib/ai/assistant-tools.ts`:
   `registrar_refeicao` (chave data+tipo) e `registrar_treino` (chave data)
   agora **substituem** o registro daquele dia em vez de criar outro. O prompt
   instrui a não espalhar um plano de vários dias em vários registros —
   registrar só um exemplo de cada tipo, na data de hoje.

3. **Onboarding entra pelo assistente** — `src/app/onboarding/actions.ts`
   redireciona pra `/assistente` (era `/painel`).
   `src/app/(app)/assistente/page.tsx` passa uma `welcomeMessage` roteirizada
   (sem IA, sem custo) e o chat mostra essa mensagem sempre que está vazio,
   inclusive logo depois de "Limpar". Ferramenta nova
   `definir_metas_nutricao` (TMB → GET → `suggestTargets`, grava em
   `profile.targetCalories/targetProteinG/targetCarbsG/targetFatG`). Em
   `src/app/api/chat/route.ts`, enquanto `profile.targetCalories` for `null`,
   injeta uma instrução de boas-vindas pedindo as perguntas de personalização
   antes do plano e registro de cada dia de treino numa chamada separada.

4. **Apagar dados pelo chat** — `src/lib/ai/assistant-tools.ts`: 5 ferramentas
   novas — `apagar_peso`, `apagar_medidas`, `apagar_treino`,
   `apagar_refeicao`, `apagar_meta`. Aceitam uma data específica **ou**
   `tudo=true` (histórico inteiro daquele tipo). `apagar_refeicao` também tem
   `tipo`; `apagar_meta` identifica pelo título (aproximado). São
   **irreversíveis** — o prompt manda só usar `tudo=true` quando o pedido for
   inequívoco e confirmar por escrito quantos registros saíram.

5. **Anexo de PDF/Excel no chat** — `src/lib/ai/attachment-extract.ts` (novo):
   extrai texto e tabelas de PDF (`pdf-parse`) e de planilha (`xlsx`).
   `src/app/api/chat/route.ts` aceita `multipart/form-data`; o texto extraído
   vai pro modelo, mas só um resumo curto (`[Arquivo anexado: nome]`) fica no
   histórico. A instrução manda **primeiro resumir e sugerir**, só registrar
   depois que o usuário confirmar. `chat.tsx` ganhou botão de clipe, chip do
   arquivo e envio como `FormData`. `next.config.ts` ganhou
   `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` (senão o pdf.js quebra
   no bundle do Next — **precisa reiniciar o dev server** depois de mexer
   nisso).

Também: quando a Groq recusa uma tool call por formato inválido
(`tool_use_failed`), o `route.ts` devolve o motivo pro modelo e tenta de novo
sozinho (auto-retry com feedback).

## Motor de IA

- **Groq** (grátis, sem cartão). Chave em `GROQ_API_KEY` — está no `.env.local`
  e na Vercel. Modelo: `GROQ_MODEL = "openai/gpt-oss-120b"` em
  `src/lib/ai/groq-client.ts` (essa conta Groq só tem `openai/gpt-oss-*`,
  `qwen/*` e `groq/compound*` — não tem os Llama).
- O código do Gemini (`@google/genai`) ainda está no `package.json` mas não é
  mais usado pelo chat. O Google Cloud da conta está bloqueado
  (403 PERMISSION_DENIED; desbloquear exige depósito pré-pago de R$200, que o
  usuário não quis fazer).

## Como rodar

```
npm install
npm run dev          # localhost:3000, Turbopack
npx tsc --noEmit     # checagem de tipos
npm run build
npm run lint
```

`.env.local` (gitignored, nunca commitar) precisa ter: `DATABASE_URL`
(pooler transaction mode, porta 6543, `pgbouncer=true`), `DIRECT_URL` (session
mode, porta 5432), as chaves do Supabase e `GROQ_API_KEY`.

As mesmas variáveis precisam estar na Vercel (mudou env → tem que
redeployar).

## Estado de qualidade

`tsc --noEmit`, `npm run build` e `npm run lint` estavam limpos no último
check. Um overlay de erro de parse do Turbopack apareceu com números de linha
que não batiam com o arquivo — era cache velho, o build passa limpo.

## Pendências / próximos passos

- **Testar em `/assistente`** (o usuário ia testar manualmente): as 5
  ferramentas de apagar; o fluxo onboarding → assistente com as perguntas de
  personalização; anexar um PDF e um `.xlsx` de dieta; "Limpar" mostrando a
  mensagem de boas-vindas.
- Depois de aprovado no teste, decidir **push / merge / deploy** dessa branch.
- **Não fazer push nem merge sem o usuário pedir.**
- **Não commitar `.agents/`** — é cópia de skills gerada por um cliente do
  Claude Code, não faz parte da feature (fica untracked de propósito).
- Roadmap que o usuário citou: landing page + sistema de pagamento.
  Recomendação de preço discutida: R$24,90–R$39,90/mês (ou R$49,90–R$59,90
  pra posicionamento premium).

## Armadilhas conhecidas

- **Não usar crase literal** dentro do template string do
  `ASSISTANT_SYSTEM_PROMPT` (`assistant-context.ts`) — quebra a compilação
  (`TS1127`). Já aconteceu; está escrito como texto puro ("sinais de # no
  início da linha").
- O `objectSchema` em `assistant-tools.ts` deriva `required` **só** dos campos
  com `type` string simples (não `["x","null"]`) — a validação estrita da Groq
  rejeita chamada sem uma chave anulável se ela estiver em `required`.
- PDF é só texto (`pdf-parse` + tabelas). PDF escaneado / imagem não tem OCR —
  a extração devolve um erro amigável se o texto vier com menos de ~20 chars.
- `useState(prop)` não re-sincroniza quando a prop muda — por isso a mensagem
  de boas-vindas é dirigida pelo cliente (`setMessages(buildWelcome())` no
  `clearAll`), não por `router.refresh()`.
