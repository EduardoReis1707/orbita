# Próximas etapas da auditoria

## Estado atual

Esta branch inclui duas proteções que dependem da migração
`20260909123000_ai_usage_and_import_idempotency`:

- O assistente aceita até 20 mensagens de texto e 4 anexos por pessoa a cada
  10 minutos. O contador fica no Postgres e é atualizado de forma atômica,
  portanto duas abas abertas não conseguem ultrapassar o mesmo limite.
- Cada confirmação de importação tem um identificador único. Se a rede cair e
  a pessoa confirmar de novo, o servidor devolve o resultado original sem
  criar treinos, refeições ou medidas em duplicidade.

Essas mudanças ainda não foram aplicadas ao Supabase nem publicadas na Vercel.
Aplicar o código antes da migração faria a rota do assistente e as importações
consultarem tabelas que ainda não existem.

## Ambiente de testes separado

Antes de testar cadastro, exclusões e isolamento entre duas pessoas, crie um
projeto Supabase de testes e use variáveis próprias nesse projeto. Nunca copie
dados reais para ele.

1. Crie um novo projeto Supabase chamado, por exemplo, `treinamento-staging`.
2. Configure no projeto local de testes `DATABASE_URL`, `DIRECT_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e as chaves de
   IA desse projeto. Use um arquivo local ignorado pelo Git.
3. Aplique as migrações nesse banco de testes e crie duas contas de teste.
4. Confirme que cada conta só vê, edita e remove seus próprios registros.
5. Só depois valide a migração no banco principal, com backup recente e em uma
   janela em que seja possível observar erros.

## Medição no ambiente publicado

Ao publicar a branch em uma prévia, registre estes dados por alguns dias:

- Vercel: tempo de resposta e erros 4xx/5xx da rota `/api/chat` e das rotas de
  importação.
- Groq: respostas 429 e tempo médio por modelo.
- Supabase: conexões, uso de CPU e consultas lentas; use `EXPLAIN ANALYZE`
  apenas contra consultas representativas no ambiente de testes.
- Produto: quantas pessoas recebem o limite local do assistente e quantas
  importações retornam como repetição. Isso mostra se os limites precisam ser
  ajustados antes de cobrar pelo serviço.

## Ordem segura para publicar esta etapa

1. Executar os testes e o build localmente.
2. Aplicar a migração primeiro no Supabase de testes.
3. Fazer um deploy de prévia com as variáveis do ambiente de testes.
4. Testar o chat, anexos, confirmação duplicada e duas contas diferentes.
5. Aplicar a migração no banco principal.
6. Fazer o deploy da branch e acompanhar os logs da Vercel e da Groq.
