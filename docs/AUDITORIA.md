# Auditoria técnica — Auxiliar de Treino

Data: 8 de setembro de 2026. Branch: codex/auditoria-confiabilidade.
Primeiro conjunto de correções: commit 8b6b5ff. Base examinada: ebc4d5b.

## Escopo e estado da auditoria

Auditoria local de código e dependências, com correções e testes isolados. Não é uma certificação de segurança ou desempenho em produção. A conclusão integral solicitada depende dos testes autenticados em ambiente descartável e de medições do banco e do deploy. Nenhum dado real foi modificado para testes, nenhuma migration foi aplicada e não houve push ou deploy.

Cinco agentes fizeram revisões paralelas cobrindo arquitetura/qualidade, frontend/UX, banco/domínio, segurança/backend e testes/confiabilidade. O coordenador revisou o assistente, integrou as alterações e solicitou uma segunda revisão. Achados estáticos foram tratados como hipóteses até confirmação pelo código ou por testes; mocks não demonstram isolamento transacional real do PostgreSQL.

## Mapa da arquitetura

Navegador → Next.js App Router/React → Proxy de sessão Supabase → Server Components, Server Actions e Route Handlers → Prisma → PostgreSQL.

O armazenamento de documentos usa Supabase Storage. O chat usa Groq e ferramentas que gravam com o ID da sessão. As outras importações e estimativas ainda têm integração Gemini. PDFs e planilhas anexados ao chat são interpretados no servidor. Exportações usam CSV e React PDF. A publicação está ligada ao Git/Vercel, mas não foi acionada nesta auditoria.

Stack verificada: Next 16.3.4, React 19.2.8, Prisma 6.19.3, TypeScript, Tailwind 4, Base UI, Supabase Auth/Storage, Groq, pdf-parse e SheetJS. Não se trocou framework nem banco.

## Estado inicial e baseline

- Não havia script de testes nem suíte própria no package.json.
- Lint inicial passou.
- Build inicial bloqueado por DLL Prisma em uso pelo servidor de desenvolvimento. Portanto, não há tempo de build inicial comparável.
- npm audit reportou 4 entradas de vulnerabilidade alta: xlsx, deepmerge-ts, @prisma/config e prisma. As últimas três pertencem à mesma cadeia; não representam três explorações independentes demonstradas.
- A página de treinos fazia 2 chamadas Prisma para dados de treinos/exercícios já sobrepostos. O teste de comparação usa o código do commit base e fixtures sintéticas.
- LCP, INP, CLS, FCP, TTFB de produção, CPU/memória sob carga, planos EXPLAIN e bundle inicial por rota não foram medidos. Não se atribui ganho percentual a essas métricas.

## Descobertas e correções

### P0 — risco de perda de dados no assistente

**Problema/local:** src/lib/ai/coerce.ts e assistant-tools.ts. Datas futuras eram convertidas para hoje; criar várias divisões futuras podia substituir o mesmo treino repetidamente. A substituição apagava o registro anterior antes de tentar criar o novo.

**Causa/impacto:** coerção silenciosa de datas e duas operações sem atomicidade. Uma falha após o delete podia perder treino/refeição e seus filhos.

**Evidência:** leitura do fluxo; regressão de datas futuras e teste da substituição com transação simulada.

**Solução:** conservar datas válidas; recusar datas impossíveis; rejeitar peso/medidas futuros; atualizar o registro existente e seus filhos numa transação, serializando substituições do assistente por perfil.

**Risco/validação:** a transação pode introduzir espera sob concorrência. Os testes verificam a utilização da transação e filtro de proprietário; rollback e concorrência reais ainda precisam de PostgreSQL descartável. Não se afirma recuperação de dados que já tenham sido perdidos antes da correção.

### P1 — importação parcial e apagamento de medidas

**Local:** src/app/(app)/{treinos,alimentacao,medidas}/import-actions.ts.

**Causa/impacto:** validação apenas do array externo, gravações em loop e conversão de valores ausentes para null/zero. Falhas deixavam parte do lote salva; uma medida omitida apagava o valor existente. Séries ausentes podiam virar 1.

**Solução:** Zod valida o lote completo antes de qualquer escrita; transação do lote; preservação de nulls e atualização apenas das medidas informadas.

**Validação:** testes de entradas malformadas, campos nulos, patch parcial e falha simulada na segunda gravação. Risco residual: resposta perdida depois do commit ainda permite duplicação se o usuário repetir a importação; atomicidade não é idempotência.

### P1 — anexos podiam acionar ferramentas ao serem lidos

**Local:** src/app/api/chat/route.ts.

**Causa/impacto:** o pedido de apenas transcrever estava somente no prompt, enquanto ferramentas de escrita continuavam disponíveis.

**Solução:** requisições com anexo não oferecem ferramentas; chamada inesperada também é rejeitada no servidor. Argumentos das ferramentas são validados antes do banco. Há limite de tokens e de chamadas.

**Validação:** testes da requisição multipart, ausência de ferramentas e bloqueio de uma chamada inesperada. Limitação: isso não prova imunidade geral a prompt injection em conversas posteriores.

### P1/P2 — segurança de acesso e dados exportados

- Metadados de treino: autenticação, validação do ID e filtro de proprietário antes de consultar o nome. Antes, a consulta usava somente o ID global. Testes com dois proprietários simulados; exploração HTTP entre contas não testada.
- Confirmação de autenticação: destino limitado à mesma origem, evitando redirecionamento externo. Testes incluem URLs externas e inválidas.
- CSV: textos com prefixos de fórmula são neutralizados, preservando valores numéricos. Testes de escape e fórmulas.
- Exclusão de documentos: erro do Storage interrompe a exclusão dos metadados, preservando a possibilidade de tentar novamente. Ainda não há transação distribuída entre Storage e banco.
- Exclusão pelo assistente: título que coincide com várias metas pede esclarecimento; tipo de refeição desconhecido é rejeitado; filtro de tipo é preservado.
- Logs do chat e das ferramentas deixaram de imprimir o objeto completo de erro do provedor/banco. Isso reduz risco de registrar conteúdo sensível; não constitui auditoria de todos os logs históricos.

### P1/P2 — dependências e anexos

SheetJS foi atualizado de 0.18.5 para 0.20.3, pela distribuição oficial, preservando leitura XLS e XLSX. A auditoria passou de 4 para 3 entradas altas. Os avisos da cadeia Prisma permanecem: a correção sugerida automaticamente implicava downgrade e a versão principal nova de deepmerge-ts muda comportamento. Não se aplicou override incompatível sem validação.

A análise de anexos passou a limitar PDF a 30 páginas e planilhas a 20 abas, 500 linhas e 50 colunas por aba, com erro explícito. Isso limita a conversão posterior; não elimina todos os riscos de descompressão/parser de arquivos hostis.

Fontes: [instalação oficial SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), [mudanças incompatíveis de deepmerge-ts 8](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0).

### P2 — datas, métricas e nutrição

**Local:** src/lib/date.ts, metrics.ts, goals.ts, nutrition-targets.ts e consumidores revisados.

**Correções:** datas civis explicitamente em America/Sao_Paulo; rejeição de dias inexistentes; aniversário calculado a partir da data civil; prazo sem deslocamento por UTC; sinal de peso restante correto também para ganho de peso; limites de calorias/macros compartilhados entre Alimentação e Configurações.

**Validação:** dias bissextos, virada de ano/dia, aniversário, prazo e ganho/perda/ultrapassagem da meta. Fórmulas metabólicas não foram alteradas nem validadas clinicamente. O app continua apresentando estimativas. O fuso fixo do produto não substitui uma futura preferência por usuário.

### P2 — frontend, UX e acessibilidade

**Problemas:** modal sem rolagem em telas baixas; Voltar ignorado após reabrir; resposta antiga de extração substituindo um novo arquivo; menu mobile permanecendo aberto; rótulos faltantes; ausência de feedback nas navegações autenticadas.

**Correções:** altura máxima e rolagem; ciclo do histórico corrigido; AbortController e invalidação das requisições anteriores; erro recuperável na confirmação; fechamento do menu; rótulos e nomes acessíveis em controles revisados; loading.tsx no grupo autenticado. O chat exibe erro de conexão interrompida e impede limpar durante envio.

**Validação:** três testes com hooks simulados para histórico, cancelamento e retry. Página pública observada em 360px sem overflow horizontal (documento 345px, viewport 360px); formulário de login inspecionado nessa largura. Não se afirma teste completo de leitores de tela, contraste em ambos os temas ou todas as resoluções.

### P2 — consulta duplicada em Treinos

**Local:** src/app/(app)/treinos/page.tsx.

**Causa:** exercícios eram consultados novamente apesar de já carregados com os treinos.

**Solução:** reaproveitar os registros carregados, preservar ordem cronológica e usar chave estruturada para nomes que contenham o antigo separador.

**Validação:** comparação do commit base com o código atualizado: 2 chamadas Prisma → 1, com a mesma saída nas fixtures comuns; testes de histórico vazio e nome com separador. Não foi medida latência real do PostgreSQL.

## P3 e refatorações não realizadas

Índices comuns duplicam constraints únicas em peso/medidas. Não foram removidos sem observar planos e carga de escrita. Não se adicionaram índices indiscriminadamente, memoização generalizada ou novas bibliotecas de teste. A função kcalFromMacros sem uso não foi removida só para reduzir linhas de código.

## Pendências relevantes

1. **P1 — cotas de IA:** falta controle persistente por usuário e concorrência distribuída. Limites por requisição não impedem consumo repetido. Exige política de cotas e persistência confiável; limite em memória não é garantia na Vercel.
2. **P1 — idempotência:** importações e ações repetidas após resposta perdida precisam de chave persistida por usuário/operação. Não deduplicar por nome/data, pois registros legítimos podem coincidir.
3. **P2 — uploads:** documentos anunciam 10 MB, mas Server Actions usa padrão 1 MB e a plataforma possui limites próprios. Resolver com upload direto autorizado ao Storage ou alinhar contrato/infraestrutura; apenas aumentar o Next não garante funcionamento na Vercel.
4. **P2 — recursos:** exportações e resolver de metas ainda podem carregar históricos extensos; faltam benchmarks de cardinalidade e paginação adequada.
5. **P2 — concorrência manual:** edições em duas abas ainda podem sobrescrever uma à outra; ordenação de filhos usa max+1 sem unicidade.
6. **P2 — ambiente:** validar RLS implantado, isolamento entre duas contas, cookies, uploads/downloads, ações destrutivas e rollback em ambiente descartável. Não usar o banco real para testes destrutivos.
7. **P2 — chat:** histórico de anexo guarda a transcrição resumida, não o documento completo; reenvio não tem idempotência. Validar precisão dos planos com documentos sintéticos e provedor real em conta de testes.
8. **P2 — dependências:** três entradas altas da cadeia Prisma permanecem, sem exploração demonstrada neste app.

## Comparação consolidada

| Área | Antes | Depois verificado | Melhoria / limite |
|---|---|---|---|
| Frontend | Modais e requisições com falhas reproduzíveis por mocks | Testes de Voltar, cancelamento e retry passaram | Sem comparação de Web Vitals |
| Backend | Escritas parciais e ferramentas habilitadas em anexos | Validação e transações; anexos sem ferramentas | Testes isolados; banco real pendente |
| Banco | 2 chamadas Prisma no fluxo de Treinos | 1 chamada na fixture equivalente | Uma consulta eliminada; latência não medida |
| Bundle | Não medido por rota | Não medido por rota | Nenhum ganho alegado |
| Testes | Sem suíte própria | Suíte Node com fixtures sintéticas | Resultado final registrado na validação da entrega |
| Segurança | 4 entradas altas no npm audit | 3 entradas altas após SheetJS | Uma dependência com avisos removida; cadeia Prisma pendente |

## Critério de encerramento

As correções locais são uma entrega verificável, mas a auditoria integral permanece aberta até concluir os testes de ambiente e as pendências prioritárias. Build aprovado não equivale a certificação de confiabilidade. O relatório deve acompanhar futuras medições, em vez de substituir evidências por notas ou percentuais inventados.
