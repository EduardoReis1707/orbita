const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function fixture(options = {}) {
  const writes = [], calls = [], executions = [];
  let historyQuery;
  class APIError extends Error {}
  class BadRequestError extends APIError {}
  class APIConnectionError extends Error {}
  const route = loadTs('src/app/api/chat/route.ts', {
    'groq-sdk': { APIError, BadRequestError, APIConnectionError },
    '@/lib/auth': { requireUser: async () => ({ id: 'owner-a' }) },
    '@/lib/prisma': { prisma: {
      chatMessage: {
        findMany: async query => { historyQuery = query; return [...(options.history || [])]; },
        create: async ({ data }) => {
          if (data.role === 'ASSISTANT' && options.persist) await options.persist(data);
          writes.push(data);
          return data;
        },
      },
      profile: { findUnique: async () => ({ targetCalories: 2000 }) },
    } },
    '@/lib/ai/groq-client': {
      GROQ_MODEL: 'mock-model', isGroqConfigured: () => true,
      createGroqClient: () => ({ chat: { completions: { create: async params => {
        calls.push(structuredClone(params));
        return (async function* () {
          for (const delta of options.deltas || [{ content: 'Resposta' }]) yield { choices: [{ delta }] };
          if (options.streamError) throw new Error('mock stream failure');
        })();
      } } } }),
    },
    '@/lib/ai/assistant-context': { ASSISTANT_SYSTEM_PROMPT: 'system', buildAssistantContext: async () => 'context' },
    '@/lib/ai/assistant-tools': {
      buildToolDeclarations: () => [{ type: 'function', function: { name: 'mock_tool', parameters: { type: 'object' } } }],
      executeToolCall: async (...args) => { executions.push(args); return { ok: true, summary: 'mock action' }; },
    },
    '@/lib/ai/attachment-extract': {
      MAX_ATTACHMENT_BYTES: 4 * 1024 * 1024,
      isSupportedAttachment: () => true,
      extractAttachmentText: async () => ({ ok: true, text: 'MOCK_DOCUMENT_CONTENT' }),
    },
  });
  return { ...route, writes, calls, executions, historyQuery: () => historyQuery };
}
function jsonRequest(body) {
  return new Request('https://app.example/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
function attachmentRequest() {
  const form = new FormData();
  form.set('message', 'Resuma');
  form.set('file', new File(['mock'], 'plan.pdf', { type: 'application/pdf' }));
  return new Request('https://app.example/api/chat', { method: 'POST', body: form });
}
async function events(response) {
  return (await response.text()).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

test('chat: JSON null retorna 400 sem histórico ou provedor', async () => {
  const f = fixture();
  const response = await f.POST(jsonRequest(null));
  assert.equal(response.status, 400);
  assert.equal(typeof (await response.json()).error, 'string');
  assert.equal(f.historyQuery(), undefined);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.calls, []);
});

test('chat: anexo não oferece tools e não persiste texto extraído', async () => {
  const f = fixture();
  const response = await f.POST(attachmentRequest());
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await events(response);
  assert.equal(f.calls[0].tool_choice, 'none');
  assert.equal(Object.hasOwn(f.calls[0], 'tools'), false);
  assert.match(f.calls[0].messages.at(-1).content, /MOCK_DOCUMENT_CONTENT/);
  assert.equal(f.writes[0].content, '[Arquivo anexado: plan.pdf] Resuma');
  assert.equal(f.writes.some(row => row.content.includes('MOCK_DOCUMENT_CONTENT')), false);
  assert.deepEqual(f.executions, []);
  assert.equal(result.at(-1).type, 'done');
});

test('chat: tool call inesperada em anexo nunca executa mutação', async () => {
  const f = fixture({ deltas: [{ tool_calls: [{ index: 0, id: 'call-1', function: { name: 'mock_tool', arguments: '{}' } }] }] });
  const result = await events(await f.POST(attachmentRequest()));
  assert.deepEqual(f.executions, []);
  assert.deepEqual(result.map(event => event.type), ['error', 'done']);
});

test('chat: histórico limitado e isolado é enviado em ordem cronológica', async () => {
  const f = fixture({ history: [{ role: 'ASSISTANT', content: 'Segundo' }, { role: 'USER', content: 'Primeiro' }] });
  await events(await f.POST(jsonRequest({ message: 'Atual' })));
  assert.deepEqual(f.historyQuery(), { where: { profileId: 'owner-a' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20 });
  assert.deepEqual(f.calls[0].messages.slice(1), [{ role: 'user', content: 'Primeiro' }, { role: 'assistant', content: 'Segundo' }, { role: 'user', content: 'Atual' }]);
  assert.ok(f.calls[0].tools.length);
  assert.equal(f.calls[0].max_completion_tokens, 3000);
  assert.ok(f.writes.every(row => row.profileId === 'owner-a'));
});

test('chat: done aguarda conclusão da persistência', async () => {
  const entered = deferred(), release = deferred();
  const f = fixture({ persist: async () => { entered.resolve(); await release.promise; } });
  const response = await f.POST(jsonRequest({ message: 'Oi' }));
  const reader = response.body.getReader();
  await entered.promise;
  assert.equal(JSON.parse(new TextDecoder().decode((await reader.read()).value)).type, 'text');
  const next = reader.read();
  let delivered = false;
  next.then(() => { delivered = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(delivered, false, 'done não pode preceder a escrita');
  release.resolve();
  assert.equal(JSON.parse(new TextDecoder().decode((await next).value)).type, 'done');
  assert.equal(f.writes.at(-1).role, 'ASSISTANT');
  assert.equal((await reader.read()).done, true);
});

test('chat: falha de persistência emite erro antes de done', async () => {
  const f = fixture({ persist: async () => { throw new Error('mock database failure'); } });
  const result = await events(await f.POST(jsonRequest({ message: 'Oi' })));
  assert.deepEqual(result.map(event => event.type), ['text', 'error', 'done']);
  assert.match(result[1].message, /salvar o histórico/);
  assert.equal(f.writes.filter(row => row.role === 'ASSISTANT').length, 0);
});

test('chat: falha do stream emite erro e encerra sem expor detalhe interno', async () => {
  const f = fixture({ deltas: [], streamError: true });
  const result = await events(await f.POST(jsonRequest({ message: 'Oi' })));
  assert.deepEqual(result.map(event => event.type), ['error', 'done']);
  assert.doesNotMatch(result[0].message, /mock stream failure/);
  assert.equal(f.writes.filter(row => row.role === 'ASSISTANT').length, 0);
});
