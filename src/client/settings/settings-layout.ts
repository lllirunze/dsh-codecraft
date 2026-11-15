/** Stable visual order for the peer groups rendered by CodeCraft settings. */
export const SETTINGS_GROUP_ORDER = [
  'material-icons',
  'indentation',
  'programming-languages',
] as const

/** Stable visual order for the existing language-assistance master switches. */
export const PROGRAMMING_LANGUAGE_ORDER = [
  'python',
  'java',
  'html',
] as const

export type ProgrammingLanguageSetting = (typeof PROGRAMMING_LANGUAGE_ORDER)[number]

export const PROGRAMMING_LANGUAGE_DETAILS = {
  python: [
    'semantic-completion',
    'interpreter-path',
    'server-path',
  ],
  java: [],
  html: [],
} as const satisfies Record<ProgrammingLanguageSetting, readonly string[]>

export function languageHasDetails(language: ProgrammingLanguageSetting): boolean {
  return PROGRAMMING_LANGUAGE_DETAILS[language].length > 0
}

/** Toggle local disclosure state without creating a persistent setting. */
export function toggleExpandedLanguage(
  expanded: ReadonlySet<ProgrammingLanguageSetting>,
  language: ProgrammingLanguageSetting,
): ReadonlySet<ProgrammingLanguageSetting> {
  if (!languageHasDetails(language)) return expanded
  const next = new Set(expanded)
  if (next.has(language)) next.delete(language)
  else next.add(language)
  return next
}

