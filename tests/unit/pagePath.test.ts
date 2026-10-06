import { describe, expect, it } from 'vitest'
import { redactPagePath } from '../../app/utils/pagePath'

describe('page path redaction', () => {
  it('stores questionnaire and survey tokens as placeholders and strips the query', () => {
    expect(redactPagePath('/questionnaire/secret-token')).toBe('/questionnaire/[token]')
    expect(redactPagePath('/questionnaire/secret-token?utm_source=mail')).toBe('/questionnaire/[token]')
    expect(redactPagePath('/survey/secret-token')).toBe('/survey/[token]')
    expect(redactPagePath('/survey/secret-token?utm_source=mail#thanks')).toBe('/survey/[token]')
    expect(redactPagePath('/unsubscribe/secret-token')).toBe('/unsubscribe/[token]')
    expect(redactPagePath('/unsubscribe/secret-token?utm_source=mail#thanks')).toBe('/unsubscribe/[token]')
  })
})
