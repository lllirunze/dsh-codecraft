import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readMaterialIcon } from '../src/client/api.js'
import { loadMaterialIconSvg } from '../src/client/icons/material-icon-loader.js'

vi.mock('../src/client/api.js', () => ({
  readMaterialIcon: vi.fn(),
}))

const readIcon = vi.mocked(readMaterialIcon)

describe('Material icon client loader', () => {
  beforeEach(() => {
    readIcon.mockReset()
  })

  it('shares verified SVG reads and caches the successful result', async () => {
    const svg = '<svg><path d="M0 0"/></svg>'
    readIcon.mockResolvedValue({ fileName: 'python.svg', svg })

    await expect(Promise.all([
      loadMaterialIconSvg('python.svg'),
      loadMaterialIconSvg('python.svg'),
    ])).resolves.toEqual([svg, svg])
    await expect(loadMaterialIconSvg('python.svg')).resolves.toBe(svg)
    expect(readIcon).toHaveBeenCalledOnce()
  })

  it('rejects a response for a different icon without caching it', async () => {
    readIcon.mockResolvedValue({ fileName: 'java.svg', svg: '<svg></svg>' })

    await expect(loadMaterialIconSvg('typescript.svg')).rejects.toThrow(/invalid/)
    await expect(loadMaterialIconSvg('typescript.svg')).rejects.toThrow(/invalid/)
    expect(readIcon).toHaveBeenCalledTimes(2)
  })

  it('rejects non-SVG content without caching it', async () => {
    readIcon.mockResolvedValue({ fileName: 'rust.svg', svg: '<script>alert(1)</script>' })

    await expect(loadMaterialIconSvg('rust.svg')).rejects.toThrow(/invalid/)
    expect(readIcon).toHaveBeenCalledOnce()
  })
})
