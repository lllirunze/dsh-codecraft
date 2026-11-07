import { snippetCompletion, type Completion } from '@codemirror/autocomplete'

interface JavaSnippet {
  label: string
  detail: string
  template: string
}

const DEFINITIONS: readonly JavaSnippet[] = [
  { label: 'psvm', detail: 'main method', template: 'public static void main(String[] args) {\n\t${}\n}' },
  { label: 'sout', detail: 'print line', template: 'System.out.println(${value});' },
  { label: 'soutv', detail: 'print variable', template: 'System.out.println("${name} = " + ${name});' },
  { label: 'class', detail: 'class declaration', template: 'public class ${Name} {\n\t${}\n}' },
  { label: 'interface', detail: 'interface declaration', template: 'public interface ${Name} {\n\t${}\n}' },
  { label: 'enum', detail: 'enum declaration', template: 'public enum ${Name} {\n\t${VALUE}\n}' },
  { label: 'record', detail: 'record declaration', template: 'public record ${Name}(${Type} ${value}) {\n\t${}\n}' },
  { label: 'constructor', detail: 'constructor', template: 'public ${ClassName}(${parameters}) {\n\t${}\n}' },
  { label: 'method', detail: 'method declaration', template: 'public ${void} ${methodName}(${parameters}) {\n\t${}\n}' },
  { label: 'if', detail: 'if statement', template: 'if (${condition}) {\n\t${}\n}' },
  { label: 'ifelse', detail: 'if/else statement', template: 'if (${condition}) {\n\t${}\n} else {\n\t${}\n}' },
  { label: 'for', detail: 'for loop', template: 'for (int ${i} = 0; ${i} < ${length}; ${i}++) {\n\t${}\n}' },
  { label: 'foreach', detail: 'enhanced for loop', template: 'for (${String} ${item} : ${items}) {\n\t${}\n}' },
  { label: 'while', detail: 'while loop', template: 'while (${condition}) {\n\t${}\n}' },
  { label: 'switch', detail: 'switch statement', template: 'switch (${value}) {\n\tcase ${caseValue}:\n\t\t${}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}' },
  { label: 'trycatch', detail: 'try/catch block', template: 'try {\n\t${}\n} catch (${Exception} ${exception}) {\n\t${}\n}' },
  { label: 'tryfinally', detail: 'try/finally block', template: 'try {\n\t${}\n} finally {\n\t${}\n}' },
]

/** Local Java snippets kept separate from keyword and type candidates. */
export const JAVA_SNIPPET_COMPLETIONS: readonly Completion[] = DEFINITIONS.map(definition => snippetCompletion(
  definition.template,
  {
    label: definition.label,
    detail: definition.detail,
    type: 'keyword',
    boost: 90,
  },
))

export const JAVA_SNIPPET_LABELS = new Set(DEFINITIONS.map(definition => definition.label))
