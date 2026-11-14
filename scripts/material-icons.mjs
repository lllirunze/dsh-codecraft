import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const MATERIAL_PACKAGE_NAME = 'material-icon-theme'
export const GENERATED_CLIENT_MODULE = path.join(REPOSITORY_ROOT, 'src/client/icons/material-icons.generated.ts')
export const GENERATED_HOST_MODULE = path.join(REPOSITORY_ROOT, 'src/host/material-icon-package.generated.ts')

const ACTIVE_SVG = [
  /<script\b/i,
  /<foreignObject\b/i,
  /<!DOCTYPE\b/i,
  /<!ENTITY\b/i,
  /\son[a-z]+\s*=/i,
  /(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:|javascript:)/i,
  /url\(\s*["']?\s*(?:https?:|\/\/|data:|javascript:)/i,
]

export function stableJson(value) {
  return `${JSON.stringify(sortObject(value), null, 2)}\n`
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, child]) => [key, sortObject(child)]),
  )
}

export function generatedTextEquals(actual, expected) {
  return actual.replace(/\r\n/g, '\n') === expected.replace(/\r\n/g, '\n')
}

export function assertExactVersion(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`${MATERIAL_PACKAGE_NAME} must use an exact semantic version, received ${String(version)}`)
  }
  return version
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

export function assertSafeSvg(svg, label = 'SVG') {
  if (typeof svg !== 'string' || !/^\s*<svg\b/i.test(svg)) throw new Error(`${label} is not an SVG document`)
  for (const pattern of ACTIVE_SVG) {
    if (pattern.test(svg)) throw new Error(`${label} contains disallowed active or external content`)
  }
}

export async function readDependencyState(root = REPOSITORY_ROOT) {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
  const version = assertExactVersion(packageJson.devDependencies?.[MATERIAL_PACKAGE_NAME])
  const lockDeclared = lock.packages?.['']?.devDependencies?.[MATERIAL_PACKAGE_NAME]
  const locked = lock.packages?.[`node_modules/${MATERIAL_PACKAGE_NAME}`]
  const installedJson = JSON.parse(await readFile(
    path.join(root, 'node_modules', MATERIAL_PACKAGE_NAME, 'package.json'),
    'utf8',
  ))
  if (lockDeclared !== version || locked?.version !== version || installedJson.version !== version) {
    throw new Error(`${MATERIAL_PACKAGE_NAME} version drift between package, lockfile, and installation`)
  }
  if (typeof locked.integrity !== 'string' || !locked.integrity.startsWith('sha512-')) {
    throw new Error(`${MATERIAL_PACKAGE_NAME}@${version} has no pinned SHA-512 integrity`)
  }
  if (installedJson.license !== 'MIT') throw new Error('upstream package no longer declares MIT')
  return {
    version,
    integrity: locked.integrity,
    sourceDirectory: path.join(root, 'node_modules', MATERIAL_PACKAGE_NAME),
  }
}

function completeAssociationMap(source, label) {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(`upstream theme has no ${label} association map`)
  }
  const output = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'string' || value === '') throw new Error(`invalid ${label} association: ${key}`)
    output[key.toLocaleLowerCase('en-US')] = value
  }
  return output
}

function iconFileOf(theme, sourceDirectory, iconId) {
  const iconPath = theme.iconDefinitions?.[iconId]?.iconPath
  if (typeof iconPath !== 'string' || iconPath === '') throw new Error(`missing icon definition: ${iconId}`)
  const absolute = path.resolve(path.join(sourceDirectory, 'dist'), iconPath)
  const iconRoot = path.resolve(sourceDirectory, 'icons')
  const relative = path.relative(iconRoot, absolute)
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative) || path.extname(relative) !== '.svg') {
    throw new Error(`icon definition escapes the upstream icons directory: ${iconId}`)
  }
  return { absolute, fileName: path.basename(relative) }
}

export async function buildMaterialIconData({ sourceDirectory, version, integrity }) {
  const installedJson = JSON.parse(await readFile(path.join(sourceDirectory, 'package.json'), 'utf8'))
  if (installedJson.name !== MATERIAL_PACKAGE_NAME || installedJson.version !== version || installedJson.license !== 'MIT') {
    throw new Error(`installed upstream package does not match ${MATERIAL_PACKAGE_NAME}@${version}`)
  }
  if (typeof integrity !== 'string' || !integrity.startsWith('sha512-')) throw new Error('missing package integrity')
  const theme = JSON.parse(await readFile(path.join(sourceDirectory, 'dist/material-icons.json'), 'utf8'))
  const manifest = {
    defaults: {
      file: theme.file,
      folder: theme.folder,
      folderExpanded: theme.folderExpanded,
      rootFolder: theme.rootFolder,
      rootFolderExpanded: theme.rootFolderExpanded,
    },
    fileNames: completeAssociationMap(theme.fileNames, 'filename'),
    fileExtensions: completeAssociationMap(theme.fileExtensions, 'extension'),
    folderNames: completeAssociationMap(theme.folderNames, 'folder'),
    folderNamesExpanded: completeAssociationMap(theme.folderNamesExpanded, 'expanded folder'),
    rootFolderNames: completeAssociationMap(theme.rootFolderNames, 'root folder'),
    rootFolderNamesExpanded: completeAssociationMap(theme.rootFolderNamesExpanded, 'expanded root folder'),
  }
  for (const [key, value] of Object.entries(manifest.defaults)) {
    if (typeof value !== 'string' || value === '') throw new Error(`upstream theme is missing default ${key}`)
  }
  const iconFiles = {}
  const fileHashes = {}
  for (const iconId of Object.keys(theme.iconDefinitions ?? {}).sort()) {
    const { absolute, fileName } = iconFileOf(theme, sourceDirectory, iconId)
    const content = await readFile(absolute, 'utf8')
    assertSafeSvg(content, `${iconId} (${fileName})`)
    if (fileHashes[fileName] !== undefined) throw new Error(`duplicate upstream icon filename: ${fileName}`)
    iconFiles[iconId] = fileName
    fileHashes[fileName] = sha256(content)
  }
  if (Object.keys(iconFiles).length === 0) throw new Error('upstream theme has no icon definitions')
  for (const iconId of [
    ...Object.values(manifest.defaults),
    ...Object.values(manifest.fileNames),
    ...Object.values(manifest.fileExtensions),
    ...Object.values(manifest.folderNames),
    ...Object.values(manifest.folderNamesExpanded),
    ...Object.values(manifest.rootFolderNames),
    ...Object.values(manifest.rootFolderNamesExpanded),
  ]) {
    if (iconFiles[iconId] === undefined) throw new Error(`association references missing icon: ${iconId}`)
  }
  return JSON.parse(stableJson({ version, integrity, manifest, iconFiles, fileHashes }))
}

export function generateClientModule(data) {
  return `/** Generated by scripts/sync-material-icons.mjs. Do not edit by hand. */\n` +
    `export const MATERIAL_ICON_VERSION = ${JSON.stringify(data.version)}\n` +
    `export const MATERIAL_ICON_MANIFEST = ${JSON.stringify(data.manifest, null, 2)} as const\n` +
    `export const MATERIAL_ICON_FILES: Readonly<Record<string, string>> = ${JSON.stringify(data.iconFiles, null, 2)}\n`
}

export function generateHostModule(data) {
  return `/** Generated by scripts/sync-material-icons.mjs. Do not edit by hand. */\n` +
    `export const MATERIAL_ICON_PACKAGE = ${JSON.stringify({
      name: MATERIAL_PACKAGE_NAME,
      version: data.version,
      integrity: data.integrity,
      fileHashes: data.fileHashes,
    }, null, 2)} as const\n`
}

export async function synchronizeMaterialIcons({
  sourceDirectory,
  version,
  integrity,
  clientModule = GENERATED_CLIENT_MODULE,
  hostModule = GENERATED_HOST_MODULE,
}) {
  const data = await buildMaterialIconData({ sourceDirectory, version, integrity })
  const outputs = [
    [clientModule, generateClientModule(data)],
    [hostModule, generateHostModule(data)],
  ]
  const suffix = randomUUID()
  const staged = outputs.map(([target]) => `${target}.stage-${suffix}`)
  const backups = outputs.map(([target]) => `${target}.backup-${suffix}`)
  const backedUp = [false, false]
  try {
    await Promise.all(outputs.map(async ([target, content], index) => {
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(staged[index], content)
    }))
    for (let index = 0; index < outputs.length; index += 1) {
      const [target] = outputs[index]
      try {
        await rename(target, backups[index])
        backedUp[index] = true
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      await rename(staged[index], target)
    }
    await Promise.all(backups.map(backup => rm(backup, { force: true })))
    return data
  } catch (error) {
    await Promise.all(staged.map(file => rm(file, { force: true }).catch(() => undefined)))
    for (let index = outputs.length - 1; index >= 0; index -= 1) {
      if (!backedUp[index]) continue
      const [target] = outputs[index]
      await rm(target, { force: true }).catch(() => undefined)
      await rename(backups[index], target).catch(() => undefined)
    }
    throw error
  } finally {
    await Promise.all(backups.map(file => rm(file, { force: true }).catch(() => undefined)))
  }
}

export async function verifyMaterialIcons({
  root = REPOSITORY_ROOT,
  clientModule = GENERATED_CLIENT_MODULE,
  hostModule = GENERATED_HOST_MODULE,
} = {}) {
  const state = await readDependencyState(root)
  const data = await buildMaterialIconData(state)
  const [client, host] = await Promise.all([
    readFile(clientModule, 'utf8'),
    readFile(hostModule, 'utf8'),
  ])
  if (!generatedTextEquals(client, generateClientModule(data))) {
    throw new Error('generated Material icon Client mapping is stale')
  }
  if (!generatedTextEquals(host, generateHostModule(data))) {
    throw new Error('generated Material icon Host package metadata is stale')
  }
  return { version: state.version, icons: Object.keys(data.iconFiles).length }
}
