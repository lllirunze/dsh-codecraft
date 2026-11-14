export const REPOSITORY_ROOT: string
export const MATERIAL_PACKAGE_NAME: string
export const GENERATED_CLIENT_MODULE: string
export const GENERATED_HOST_MODULE: string

export interface MaterialIconData {
  version: string
  integrity: string
  manifest: Record<string, unknown>
  iconFiles: Record<string, string>
  fileHashes: Record<string, string>
}

export function stableJson(value: unknown): string
export function generatedTextEquals(actual: string, expected: string): boolean
export function assertExactVersion(version: unknown): string
export function sha256(content: string | Buffer): string
export function assertSafeSvg(svg: unknown, label?: string): void
export function readDependencyState(root?: string): Promise<{
  version: string
  integrity: string
  sourceDirectory: string
}>
export function buildMaterialIconData(options: {
  sourceDirectory: string
  version: string
  integrity: string
}): Promise<MaterialIconData>
export function generateClientModule(data: MaterialIconData): string
export function generateHostModule(data: MaterialIconData): string
export function synchronizeMaterialIcons(options: {
  sourceDirectory: string
  version: string
  integrity: string
  clientModule?: string
  hostModule?: string
}): Promise<MaterialIconData>
export function verifyMaterialIcons(options?: {
  root?: string
  clientModule?: string
  hostModule?: string
}): Promise<{ version: string, icons: number }>
