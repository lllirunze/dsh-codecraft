import { describe, expect, it } from 'vitest'
import { fileNameOf, parseSessionFileAddress } from '../src/client/address.js'

describe('parseSessionFileAddress', () => {
  it('decodes a session-scoped relative path segment by segment', () => {
    expect(parseSessionFileAddress('dsh-resource://file/session/s1/src/a%20b.ts')).toEqual({
      sessionId: 's1',
      path: 'src/a b.ts',
    })
  })

  it('preserves an absolute path spelling and drops query/fragment suffixes', () => {
    expect(parseSessionFileAddress('dsh-resource://file/session/s1//tmp/x.ts?line=4#L4')).toEqual({
      sessionId: 's1',
      path: '/tmp/x.ts',
    })
  })

  it('accepts encoded session ids', () => {
    expect(parseSessionFileAddress('dsh-resource://file/session/a%2Fb/x.ts')).toEqual({
      sessionId: 'a/b',
      path: 'x.ts',
    })
  })

  it('rejects non-session scopes and malformed addresses', () => {
    expect(parseSessionFileAddress('dsh-resource://file/absolute/tmp/x.ts')).toBeUndefined()
    expect(parseSessionFileAddress('dsh-resource://file/session/s1')).toBeUndefined()
    expect(parseSessionFileAddress('dsh-resource://file/session//x.ts')).toBeUndefined()
    expect(parseSessionFileAddress('dsh-resource://file/session/s1/%E0%A4%A')).toBeUndefined()
    expect(parseSessionFileAddress('https://example.com/x.ts')).toBeUndefined()
  })
})

describe('fileNameOf', () => {
  it('uses the final segment in both separator spellings', () => {
    expect(fileNameOf('src/main.py')).toBe('main.py')
    expect(fileNameOf('C:\\project\\main.py')).toBe('main.py')
    expect(fileNameOf('main.py')).toBe('main.py')
  })
})
