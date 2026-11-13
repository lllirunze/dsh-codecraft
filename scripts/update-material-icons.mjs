import { execFileSync } from 'node:child_process'
import process from 'node:process'

import {
  MATERIAL_PACKAGE_NAME,
  assertExactVersion,
  readDependencyState,
  synchronizeMaterialIcons,
  verifyMaterialIcons,
} from './material-icons.mjs'

const packageJson = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8'))
const version = packageJson.devDependencies?.[MATERIAL_PACKAGE_NAME]
if (typeof version !== 'string') throw new Error(`${MATERIAL_PACKAGE_NAME} is not declared in devDependencies`)
assertExactVersion(version)

execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
  'install',
  '--save-dev',
  '--save-exact',
  '--ignore-scripts',
  `${MATERIAL_PACKAGE_NAME}@${version}`,
], { stdio: 'inherit' })

const state = await readDependencyState()
const synced = await synchronizeMaterialIcons(state)
const verified = await verifyMaterialIcons()
console.log(`updated Material Icon Theme ${verified.version}: ${Object.keys(synced.iconFiles).length} mappings`)
