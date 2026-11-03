import { describe, expect, it } from 'vitest'
import { differsFromSavedText } from '../src/client/editor.js'

describe('differsFromSavedText', () => {
  it('keeps edits made while an older snapshot is being saved dirty', () => {
    const submittedSnapshot = 'const value = 2\n'
    const liveTextAfterAnotherEdit = 'const value = 3\n'

    expect(differsFromSavedText(liveTextAfterAnotherEdit, submittedSnapshot)).toBe(true)
  })

  it('marks the editor clean only when it still matches the saved snapshot', () => {
    const submittedSnapshot = 'const value = 2\n'

    expect(differsFromSavedText(submittedSnapshot, submittedSnapshot)).toBe(false)
  })
})
