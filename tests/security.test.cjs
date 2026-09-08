const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

const pagePath = 'src/app/(app)/treinos/[id]/page.tsx';
function metadataHarness(requireUser, findFirst) {
  return loadTs(pagePath, {
    'next/link': { default: () => null },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    'lucide-react': { ArrowLeftIcon: () => null },
    './workout-detail': { WorkoutDetail: () => null },
    '@/lib/auth': { requireUser },
    '@/lib/prisma': { prisma: { workout: { findFirst } } },
  });
}

test('metadata exige sessão antes de consultar dados', async () => {
  const page = metadataHarness(async () => { throw new Error('UNAUTHORIZED'); }, () => assert.fail('consulta sem sessão'));
  await assert.rejects(page.generateMetadata({ params: Promise.resolve({ id: '1' }) }), /UNAUTHORIZED/);
});

test('metadata restringe posse e não revela nome de outro usuário', async () => {
  const page = metadataHarness(async () => ({ id: 'owner-a' }), async ({ where }) => {
    assert.deepEqual(where, { id: 7, profileId: 'owner-a' });
    return null;
  });
  assert.deepEqual(await page.generateMetadata({ params: Promise.resolve({ id: '7' }) }), { title: 'Treino' });
  const own = metadataHarness(async () => ({ id: 'owner-a' }), async () => ({ name: 'Meu treino' }));
  assert.deepEqual(await own.generateMetadata({ params: Promise.resolve({ id: '7' }) }), { title: 'Meu treino' });
});

test('metadata rejeita IDs inválidos antes do banco', async () => {
  const page = metadataHarness(async () => ({ id: 'owner-a' }), () => assert.fail('ID inválido no banco'));
  for (const id of ['', ' ', '-1', '0', '1.5', '1e2', 'abc', '2147483648', '9007199254740993']) {
    await assert.rejects(page.generateMetadata({ params: Promise.resolve({ id }) }), /NOT_FOUND/);
  }
});

test('callback só redireciona para a mesma origem e tolera URL inválida', async () => {
  const { GET } = loadTs('src/app/auth/confirm/route.ts', {
    'next/server': { NextResponse: { redirect: (url) => url.href } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { verifyOtp: async () => ({ error: null }) } }) },
  });
  for (const next of ['https://evil.example/x', '//evil.example', 'https://app.example@evil.example', 'javascript:alert(1)', 'http://[', '/\\evil.example']) {
    const url = new URL('https://app.example/auth/confirm');
    url.search = new URLSearchParams({ token_hash: 'test-token', type: 'email', next });
    assert.equal(await GET({ url: url.href, nextUrl: url }), 'https://app.example/painel');
  }
  for (const next of ['/redefinir-senha?ok=1', 'https://app.example/onboarding']) {
    const url = new URL('https://app.example/auth/confirm');
    url.search = new URLSearchParams({ token_hash: 'test-token', type: 'email', next });
    assert.equal(await GET({ url: url.href, nextUrl: url }), new URL(next, url).href);
  }
});

test('CSV neutraliza fórmulas textuais e preserva números e escape RFC', () => {
  const { toCsv } = loadTs('src/lib/export.ts');
  for (const value of ['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '  =1', '\t=1']) {
    assert.equal(toCsv([{ value }], [['value', 'Valor']]), "\ufeffValor\n'" + value + "\n");
  }
  assert.equal(toCsv([{ value: -12.5 }, { value: 0 }, { value: 42 }], [['value', 'Valor']]), '\ufeffValor\n-12.5\n0\n42\n');
  assert.equal(toCsv([{ value: 'a,"b"' }], [['value', 'Valor']]), '\ufeffValor\n"a,""b"""\n');
});

test('exclusão mantém metadados em falha do storage e só apaga após sucesso', async () => {
  for (const fail of [true, false]) {
    const calls = [];
    const { deleteDocumentAction } = loadTs('src/app/(app)/arquivos/actions.ts', {
      'next/cache': { revalidatePath: () => calls.push('revalidate') },
      '@/lib/auth': { requireUser: async () => ({ id: 'owner-a' }) },
      '@/lib/prisma': { prisma: { fileDocument: {
        findFirst: async ({ where }) => { assert.deepEqual(where, { id: 7, profileId: 'owner-a' }); return { id: 7, storagePath: 'owner-a/file.pdf' }; },
        delete: async () => calls.push('delete'),
      } } },
      '@/lib/supabase/admin': { STORAGE_BUCKET: 'documentos', createAdminClient: () => ({ storage: { from: () => ({ remove: async () => { calls.push('remove'); return { error: fail ? { message: 'internal detail' } : null }; } }) } }) },
    });
    const data = new FormData(); data.set('id', '7');
    if (fail) {
      await assert.rejects(deleteDocumentAction(data), /Não foi possível excluir/);
      assert.deepEqual(calls, ['remove']);
    } else {
      await deleteDocumentAction(data);
      assert.deepEqual(calls, ['remove', 'delete', 'revalidate']);
    }
  }
});
