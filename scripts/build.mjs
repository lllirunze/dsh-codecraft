import { execFileSync } from 'node:child_process'
import { rm, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'

const CLIENT_ID = 'dsh-codecraft'

await rm('lib', { recursive: true, force: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
  // DSH and plugins must share the same Schemastery instance. Bundling it
  // creates incompatible schema symbols at the Host/plugin boundary.
  external: ['@deepseek-ai/schemastery'],
})

const client = await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: false,
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime'],
})

const code = client.outputFiles?.[0]?.text
if (code === undefined) throw new Error('client bundle produced no output')

// DSH loads browser plugins through its own lazy module loader. The entry
// registers a factory; module side effects run only when the plugin is
// materialized. `require` is the Host module table, which answers the external
// specifiers listed in package.json's dsh.client.external.
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(CLIENT_ID)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${code}
    return module.exports;
  }
});
`
await writeFile('lib/client.js', wrapped)

execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], {
  stdio: 'inherit',
})
