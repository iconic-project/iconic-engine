export function mediaUrl(apiBase: string, path: string | null): string | null {
  if (!path) {
    return null
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const base = apiBase.replace(/\/$/, '')

  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
