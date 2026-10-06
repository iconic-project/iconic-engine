/** Mirrors App\Support\Engine\PagePath. Token pages never leave the browser. */
export const COMPLETE_STORED = '/complete/[token]'
export const QUESTIONNAIRE_STORED = '/questionnaire/[token]'
export const SURVEY_STORED = '/survey/[token]'
export const UNSUBSCRIBE_STORED = '/unsubscribe/[token]'

export function redactPagePath(path: string): string | null {
  const trimmed = path.trim()

  if (trimmed === '') {
    return null
  }

  const withoutQuery = trimmed.split('?')[0] ?? ''
  const withoutHash = withoutQuery.split('#')[0] ?? ''

  if (withoutHash === '' || !withoutHash.startsWith('/')) {
    return null
  }

  if (withoutHash.startsWith('/complete/')) {
    return COMPLETE_STORED
  }

  if (withoutHash.startsWith('/questionnaire/')) {
    return QUESTIONNAIRE_STORED
  }

  if (withoutHash.startsWith('/survey/')) {
    return SURVEY_STORED
  }

  if (withoutHash.startsWith('/unsubscribe/')) {
    return UNSUBSCRIBE_STORED
  }

  if (withoutHash.length > 200) {
    return null
  }

  return withoutHash
}
