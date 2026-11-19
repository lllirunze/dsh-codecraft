import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const languages = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ru', 'pt']
const domains = ['core', 'workspace', 'settings', 'html']
const entry = /^  '([^']+)': ('(?:\\.|[^'\\])*'),?$/gm
const placeholders = text => [...text.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]).sort()
const catalogs = new Map()

for (const language of languages) {
  const messages = new Map()
  for (const domain of domains) {
    const file = resolve(`src/client/i18n/messages/${language}/${domain}.ts`)
    const source = readFileSync(file, 'utf8')
    assert(!/[\uFEFF\u200B-\u200D]/u.test(source), `${file}: hidden control character`)
    for (const match of source.matchAll(entry)) {
      const key = match[1]
      assert(!messages.has(key), `${file}: duplicate ${key}`)
      const value = vm.runInNewContext(match[2])
      assert.equal(typeof value, 'string', `${file}: non-string ${key}`)
      assert(value.trim(), `${file}: blank ${key}`)
      assert(!/[\r\n]/u.test(value), `${file}: unexpected newline ${key}`)
      messages.set(key, value)
    }
  }
  catalogs.set(language, messages)
  const metadata = JSON.parse(readFileSync(resolve(`locale/${language}.json`), 'utf8'))
  assert.equal(metadata['meta.title'], 'CodeCraft')
  assert.equal(typeof metadata['meta.description'], 'string')
  assert(metadata['meta.description'].trim())
}

const baseline = catalogs.get('en')
for (const [language, messages] of catalogs) {
  assert.deepEqual([...messages.keys()].sort(), [...baseline.keys()].sort(), `${language}: key mismatch`)
  for (const [key, text] of messages) {
    assert.deepEqual(placeholders(text), placeholders(baseline.get(key)), `${language}: placeholder mismatch ${key}`)
  }
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
assert(manifest.files.includes('locale'))
assert.equal(manifest.exports['./locale/*.json'], './locale/*.json')

function checkJsx(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) checkJsx(path)
    else if (entry.name.endsWith('.tsx')) {
      const source = readFileSync(path, 'utf8')
      assert(!/<[A-Za-z][^>{]*>\s*[A-Za-z][^<{\n]*</u.test(source), `${path}: untranslated JSX text`)
      assert(!/\b(?:aria-label|title|placeholder)="[A-Za-z]/u.test(source), `${path}: untranslated JSX attribute`)
    }
  }
}
checkJsx(resolve('src/client'))
console.log(`Checked ${languages.length} locales and ${baseline.size} keys per locale.`)
