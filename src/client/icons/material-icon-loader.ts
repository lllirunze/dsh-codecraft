import { readMaterialIcon } from '../api.js'

const MAX_SVG_CHARACTERS = 256 * 1024
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

/** Read one verified icon through CodeCraft's authenticated API and share concurrent requests. */
export function loadMaterialIconSvg(fileName: string): Promise<string> {
  const cached = cache.get(fileName)
  if (cached !== undefined) return Promise.resolve(cached)
  const existing = pending.get(fileName)
  if (existing !== undefined) return existing

  const request = readMaterialIcon(fileName).then(result => {
    const svg = result.fileName === fileName ? result.svg : ''
    if (svg.length === 0 || svg.length > MAX_SVG_CHARACTERS || !/^\s*<svg\b/i.test(svg)) {
      throw new Error('Material Icon response is invalid')
    }
    cache.set(fileName, svg)
    return svg
  }).finally(() => {
    pending.delete(fileName)
  })
  pending.set(fileName, request)
  return request
}

