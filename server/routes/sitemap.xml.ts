type PropertySitemap = {
  room_types: Array<{ slug: string }>
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const origin = getRequestURL(event).origin
  const feed = await $fetch<PropertySitemap>(`${config.public.apiBase}/api/engine/property`)
  const paths = ['/', ...feed.room_types.map(type => `/rooms/${encodeURIComponent(type.slug)}`)]
  const urls = paths
    .map(path => `  <url><loc>${escapeXml(origin + path)}</loc></url>`)
    .join('\n')
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>'
  ].join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return body
})
