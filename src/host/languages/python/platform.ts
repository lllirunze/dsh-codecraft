/** Host platforms on which the bundled Python provider is supported. */
export function supportsPythonIntelligence(platform: NodeJS.Platform): boolean {
  return platform === 'darwin' || platform === 'win32'
}

export function unsupportedPythonPlatformMessage(platform: NodeJS.Platform): string {
  return `Python Intelligence is not supported on ${platform}. Supported platforms: macOS and Windows.`
}
