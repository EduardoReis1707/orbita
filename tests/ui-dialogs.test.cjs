const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

// Isolated hook runner: no DOM, service, network, or compiled files.
function harness(file, globals = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const tasks = [];
  const react = {
    __esModule: true,
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [slots[i].value, (value) => {
        slots[i].value = typeof value === 'function' ? value(slots[i].value) : value;
      }];
    },
    useRef(initial) {
      const i = cursor++;
      return slots[i] ??= { current: initial };
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const old = slots[i];
      if (!old || !deps || deps.some((d, n) => d !== old.deps[n])) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
    useTransition: () => [false, (fn) => tasks.push(fn())],
  };
  const jsx = (type, props) => ({ type, props });
  const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, globalThis[key]]));
  Object.assign(globalThis, globals);
  const components = new Proxy({}, { get: (_, key) => key });
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    sonner: { toast: { success() {} } },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@base-ui/react/dialog': { Dialog: components },
  };
  for (const id of ['lucide-react', '@/components/ui/dialog', '@/components/ui/button', '@/components/ui/input', '@/components/ui/label']) mocks[id] = components;
  const exports = loadTs(file, mocks);
  return {
    tasks,
    render(name, props) {
      cursor = 0;
      effects = [];
      const tree = exports[name](props);
      effects.forEach((fn) => fn());
      return tree;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
      Object.assign(globalThis, originals);
    },
  };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

test('Voltar closes a reopened dialog after an explicit close', () => {
  const listeners = new Set();
  const history = { state: null, pushState(state) { this.state = state; }, back() {
    this.state = null;
    for (const listener of listeners) listener();
  } };
  const h = harness('src/components/ui/dialog.tsx', { window: {
    history, addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  } });
  let closed = 0;
  const props = { open: true, onOpenChange: () => closed++ };
  h.render('Dialog', props);
  h.render('Dialog', { ...props, open: false });
  h.render('Dialog', props);
  history.back();
  assert.equal(closed, 1);
  h.unmount();
});

for (const photo of [false, true]) {
  const name = photo ? 'PhotoEstimateDialog' : 'PdfImportDialog';
  const file = 'src/components/ai/' + (photo ? 'photo-estimate-dialog' : 'pdf-import-dialog') + '.tsx';
  test(name + ': abort, ignore late result, recover apply failure and retry', async () => {
    const requests = [];
    let attempts = 0;
    let submitted;
    const h = harness(file, { fetch: (_, options) => {
      const request = { ...deferred(), signal: options.signal };
      requests.push(request);
      return request.promise;
    } });
    const props = { open: true, onOpenChange() {}, resultKey: 'items',
      renderCard: () => null, renderReview: () => null,
      apply: async (value) => {
        submitted = value;
        if (++attempts === 1) throw Error('connection lost');
        return { status: 'success' };
      },
    };
    const render = () => h.render(name, props);
    const upload = (tree) => find(tree, (n) => n.type === 'Input').props.onChange({
      target: { files: [new Blob(['file'])], value: 'file' },
    });
    const first = upload(render());
    render().props.onOpenChange(false);
    assert.equal(requests[0].signal.aborted, true);
    const second = upload(render());
    const response = (id) => ({ ok: true, json: async () => photo ? { id } : { items: [{ id }] } });
    requests[1].resolve(response('B'));
    await second;
    requests[0].resolve(response('A'));
    await first;
    const confirm = () => find(render(), (n) => n.type === 'Button' && n.props.disabled === false).props.onClick();
    confirm();
    await h.tasks.at(-1);
    assert.equal(photo ? submitted.id : submitted[0].id, 'B');
    assert.ok(find(render(), (n) => n.props?.role === 'alert'));
    confirm();
    await h.tasks.at(-1);
    assert.equal(attempts, 2);
    assert.ok(find(render(), (n) => n.type === 'Input'));
    const third = upload(render());
    h.unmount();
    assert.equal(requests[2].signal.aborted, true);
    requests[2].resolve(response('C'));
    await third;
  });
}
