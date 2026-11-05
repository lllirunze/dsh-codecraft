import { access, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import vm from 'node:vm'

const ALLOWED_EXTERNALS = new Set([
  '@deepseek-ai/dsh-client-ui-primitives',
  'react',
  'react/jsx-runtime',
])

async function mustExist(path) {
  try {
    await access(path)
  } catch {
    throw new Error(`missing build output: ${path}`)
  }
}

await Promise.all([
  mustExist('lib/index.js'),
  mustExist('lib/index.d.ts'),
  mustExist('lib/client.js'),
  mustExist('lib/client/index.d.ts'),
  mustExist('lib/protocol.d.ts'),
])

const client = await readFile('lib/client.js', 'utf8')
if (!client.startsWith('window.__ModuleLoader__.load({')) {
  throw new Error('client bundle does not register through window.__ModuleLoader__.load')
}
if (!client.includes('id: "dsh-codecraft"')) {
  throw new Error('client bundle id does not match the package name')
}
if (!client.includes('factory: (require) =>')) {
  throw new Error('client bundle is missing the factory(require) wrapper')
}
const required = [...client.matchAll(/\brequire\("([^"]+)"\)/g)].map(match => match[1])
const unexpected = [...new Set(required)].filter(specifier => !ALLOWED_EXTERNALS.has(specifier))
if (unexpected.length > 0) {
  throw new Error(`client bundle requires modules outside dsh.client.external: ${unexpected.join(', ')}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function verifyClientRegistration(code, platform) {
  const moduleRows = []
  const appendedStyles = []
  const documentStub = {
    head: { appendChild: element => appendedStyles.push(element) },
    createElement: () => ({
      dataset: {},
      style: {},
      textContent: '',
      remove() {},
      appendChild() {},
      setAttribute() {},
    }),
    createTextNode: () => ({}),
    createRange: () => ({ setEnd() {}, setStart() {}, getClientRects: () => [] }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    documentElement: { style: { tabSize: '' }, dataset: { platform } },
    body: {
      style: {},
      dataset: {},
      hasAttribute: () => false,
      addEventListener() {},
      removeEventListener() {},
    },
    visibilityState: 'visible',
    baseURI: 'http://localhost/',
  }
  const sandbox = {
    console,
    document: documentStub,
    navigator: { userAgent: 'node', platform: platform === 'win32' ? 'Win32' : 'MacIntel' },
    setTimeout,
    clearTimeout,
    queueMicrotask,
    requestAnimationFrame: callback => setTimeout(callback, 0),
    cancelAnimationFrame: clearTimeout,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    window: {
      __ModuleLoader__: { load: row => moduleRows.push(row) },
      addEventListener() {},
      removeEventListener() {},
      setTimeout,
      clearTimeout,
      requestAnimationFrame: callback => setTimeout(callback, 0),
      cancelAnimationFrame: clearTimeout,
      localStorage: null,
      innerWidth: 1200,
      innerHeight: 800,
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    },
  }
  sandbox.globalThis = sandbox
  sandbox.window.window = sandbox.window
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox, { filename: 'lib/client.js' })

  assert(moduleRows.length === 1, `client bundle registered ${moduleRows.length} module rows`)
  const row = moduleRows[0]
  assert(row.id === 'dsh-codecraft', `client module row has unexpected id: ${String(row.id)}`)
  const react = {
    useState: value => [value, () => {}],
    useRef: value => ({ current: value }),
    useEffect() {},
    useCallback: callback => callback,
    useMemo: callback => callback(),
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    createElement: () => null,
    Fragment: Symbol('Fragment'),
  }
  const jsxRuntime = { jsx: () => null, jsxs: () => null, Fragment: Symbol('Fragment') }
  const plugin = row.factory(specifier => {
    if (specifier === 'react') return react
    if (specifier === 'react/jsx-runtime') return jsxRuntime
    if (specifier === '@deepseek-ai/dsh-client-ui-primitives') {
      return { Switch: () => null }
    }
    throw new Error(`client factory requested unexpected external: ${specifier}`)
  })
  assert(typeof plugin.apply === 'function', 'client bundle does not export apply()')
  assert(
    Array.isArray(plugin.inject) && ['documentPreviews', 'slots', 'locale', 'configForms'].every(name => plugin.inject.includes(name)),
    'client bundle is missing required service injections',
  )

  const previews = []
  const bodyRows = []
  const localeRows = []
  const context = {
    documentPreviews: { register: definition => { previews.push(definition); return () => {} } },
    slots: {
      inject: (_name, callback) => { callback(); return () => {} },
      register: (options, component) => { bodyRows.push({ options, component }); return () => {} },
    },
    locale: {
      register: (namespace, dictionaries) => { localeRows.push({ namespace, dictionaries }); return () => {} },
      bind: () => key => key,
    },
    configForms: {
      get: () => ({
        getSnapshot: () => ({ status: 'ready', value: {}, writable: true }),
        subscribe: () => () => {},
        mutate: async () => true,
      }),
      whileServed: (namespaces, register) => {
        const served = new Set(['codecraft'])
        return namespaces.some(namespace => served.has(namespace))
          ? register(served)
          : () => {}
      },
    },
    effect: callback => { callback() },
  }
  plugin.apply(context)

  assert(previews.length === 1, `client registered ${previews.length} document previews`)
  const preview = previews[0]
  assert(preview.id === 'dsh-codecraft', 'document preview id is not dsh-codecraft')
  assert(preview.priority === 'extension' && preview.loading === 'renderer', 'document preview uses the wrong priority or loading mode')
  assert(preview.extensions.includes('ts') && preview.extensions.includes('py'), 'document preview is missing source extensions')
  assert(!preview.extensions.includes('png') && !preview.extensions.includes('pdf'), 'document preview claims binary extensions')
  assert(bodyRows.length === 2, `client registered ${bodyRows.length} slot contributions`)
  const documentBody = bodyRows.find(row => row.options.name === 'sidebar.right.tab.document')
  const settingsCard = bodyRows.find(row => row.options.name === 'plugins.item')
  assert(
    documentBody?.options.key === 'dsh-codecraft',
    'client document body is registered in the wrong keyed slot',
  )
  assert(
    settingsCard?.options.id === 'dsh-codecraft',
    'client settings card is registered in the wrong slot',
  )
  assert(localeRows.length === 1 && localeRows[0].namespace === 'sidebarCodeCraft', 'client locale registration is missing')
  assert(appendedStyles.length === 1, `client appended ${appendedStyles.length} style elements`)
}

verifyClientRegistration(client, 'darwin')
verifyClientRegistration(client, 'win32')

const hostCode = await readFile('lib/index.js', 'utf8')
if (!/from\s+["']@deepseek-ai\/schemastery["']/.test(hostCode)) {
  throw new Error('host bundle must keep @deepseek-ai/schemastery external')
}

const host = await import(pathToFileURL(resolve('lib/index.js')).href)
if (host.name !== 'dsh-codecraft') throw new Error(`unexpected host plugin name: ${String(host.name)}`)
if (typeof host.apply !== 'function') throw new Error('host bundle does not export apply()')
if (!Array.isArray(host.inject) || !['webServer', 'subprocess'].every(name => host.inject.includes(name))) {
  throw new Error('host bundle does not declare the webServer and subprocess injections')
}

console.log(`verified: host exports + client registration (${required.length} external requires)`)
