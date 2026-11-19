import type { CompletionResult, CompletionSource } from '@codemirror/autocomplete'
import type { MessageKey, Translate } from './contract.js'

const OWNED_DETAILS = new Map<string, MessageKey>([
  ['main method', 'completion.detail.mainMethod'],
  ['print line', 'completion.detail.printLine'],
  ['print variable', 'completion.detail.printVariable'],
  ['class declaration', 'completion.detail.classDeclaration'],
  ['interface declaration', 'completion.detail.interfaceDeclaration'],
  ['enum declaration', 'completion.detail.enumDeclaration'],
  ['record declaration', 'completion.detail.recordDeclaration'],
  ['constructor', 'completion.detail.constructorSnippet'],
  ['method declaration', 'completion.detail.methodDeclaration'],
  ['if statement', 'completion.detail.ifStatement'],
  ['if/else statement', 'completion.detail.ifElseStatement'],
  ['for loop', 'completion.detail.forLoop'],
  ['enhanced for loop', 'completion.detail.enhancedForLoop'],
  ['while loop', 'completion.detail.whileLoop'],
  ['switch statement', 'completion.detail.switchStatement'],
  ['try/catch block', 'completion.detail.tryCatchBlock'],
  ['try/finally block', 'completion.detail.tryFinallyBlock'],
  ['structured Javadoc', 'completion.detail.structuredJavadoc'],
  ['common Java type', 'completion.detail.commonJavaType'],
  ['current file', 'completion.detail.currentFile'],
  ['ampersand', 'completion.detail.ampersand'],
  ['less-than sign', 'completion.detail.lessThanSign'],
  ['greater-than sign', 'completion.detail.greaterThanSign'],
  ['double quotation mark', 'completion.detail.doubleQuotationMark'],
  ['apostrophe', 'completion.detail.apostrophe'],
  ['non-breaking space', 'completion.detail.nonBreakingSpace'],
  ['copyright sign', 'completion.detail.copyrightSign'],
  ['registered sign', 'completion.detail.registeredSign'],
  ['HTML5 DOCTYPE', 'completion.detail.html5Doctype'],
  ['HTML5 page skeleton', 'completion.detail.html5PageSkeleton'],
  ['Character encoding metadata', 'completion.detail.characterEncodingMetadata'],
  ['Stylesheet link', 'completion.detail.stylesheetLink'],
  ['Basic form', 'completion.detail.basicForm'],
])

/** Translate CodeCraft's own completion descriptions; leave provider text alone. */
export function localizeCompletionSource(
  source: CompletionSource,
  getTranslate: () => Translate,
): CompletionSource {
  const localize = (result: CompletionResult | null): CompletionResult | null => {
    if (result === null) return null
    return {
      ...result,
      options: result.options.map(option => {
        const key = option.detail === undefined ? undefined : OWNED_DETAILS.get(option.detail)
        return key === undefined ? option : { ...option, detail: getTranslate()(key) }
      }),
    }
  }
  return context => {
    const result = source(context)
    return result instanceof Promise ? result.then(localize) : localize(result)
  }
}
