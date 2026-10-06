<script setup lang="ts">
import type { SurveyInput, SurveyView } from '../../types/api'
import { engineErrorMessage, engineErrorStatus, fieldErrors } from '../../utils/engineError'
import { formatIsoDate } from '../../utils/formatIsoDate'
import { scaleValues } from '../../utils/scaleValues'

const { t } = useI18n()
const { request } = useApi()
const route = useRoute()

const token = computed(() => String(route.params.token ?? ''))

useHead({
  title: t('survey.title'),
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})
useSeoMeta({
  robots: 'noindex'
})

const { data, error } = await useAsyncData(
  () => `engine-survey-${token.value}`,
  () => request(`/api/engine/survey/${token.value}`) as Promise<SurveyView>
)

const invalid = computed(() => {
  if (!error.value) {
    return false
  }

  const status = engineErrorStatus(error.value)

  return status === 404 || status === undefined
})

const drafts = ref<Record<number, Record<string, string>>>({})
const received = ref<Record<number, boolean>>({})
const saving = ref<number | null>(null)
const guestErrors = ref<Record<number, Record<string, string>>>({})
const guestMessage = ref<Record<number, string>>({})

function draft(guestId: number, key: string): string {
  return drafts.value[guestId]?.[key] ?? ''
}

function setDraft(guestId: number, key: string, value: string): void {
  drafts.value = {
    ...drafts.value,
    [guestId]: {
      ...drafts.value[guestId],
      [key]: value
    }
  }
}

function answered(guestId: number, responded: boolean): boolean {
  return responded || received.value[guestId] === true
}

async function sendGuest(guestId: number): Promise<void> {
  const page = data.value

  if (!page) {
    return
  }

  saving.value = guestId
  guestErrors.value = { ...guestErrors.value, [guestId]: {} }
  guestMessage.value = { ...guestMessage.value, [guestId]: '' }

  const body: Record<string, string | number | null> = {}

  for (const question of page.questions) {
    const raw = draft(guestId, question.key)

    body[question.key] = question.type === 'scale'
      ? (raw === '' ? null : Number(raw))
      : raw
  }

  try {
    const next = await request(`/api/engine/survey/${token.value}/guests/${guestId}`, {
      method: 'POST',
      body: body as SurveyInput
    }) as SurveyView
    data.value = next
    received.value = { ...received.value, [guestId]: true }
  } catch (caught) {
    if (engineErrorStatus(caught) === 409) {
      received.value = { ...received.value, [guestId]: true }

      return
    }

    guestErrors.value = { ...guestErrors.value, [guestId]: fieldErrors(caught) }
    guestMessage.value = { ...guestMessage.value, [guestId]: engineErrorMessage(caught) }
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <div class="complete-page">
    <template v-if="invalid || (!data && error)">
      <span class="mono klabel">{{ t('complete.kInvalid') }}</span>
      <h1 class="disp">
        {{ t('complete.invalidTitle') }}
      </h1>
      <p class="sub">
        {{ t('complete.invalidBody', { email: t('search.contactEmail') }) }}
      </p>
    </template>
    <template v-else-if="data">
      <span class="mono klabel">{{ t('survey.k') }}</span>
      <h1 class="disp">
        {{ t('survey.title') }}
      </h1>
      <p class="sub">
        {{ data.reference }} · {{ data.property_name }} · {{ formatIsoDate(data.check_in) }}
      </p>

      <div
        v-for="guest in data.guests"
        :key="guest.id"
        class="fsec"
      >
        <h3>{{ t('survey.guest', { name: `${guest.first_name} ${guest.last_name}` }) }}</h3>
        <p
          v-if="answered(guest.id, guest.responded)"
          class="hint"
        >
          {{ t('survey.received') }}
        </p>
        <template v-else>
          <div
            v-for="question in data.questions"
            :key="question.key"
            class="field"
            :class="{ bad: Boolean(guestErrors[guest.id]?.[question.key]) }"
          >
            <label
              :id="`s-${guest.id}-${question.key}`"
              :for="question.type === 'text' ? `s-${guest.id}-${question.key}-input` : undefined"
            >{{ question.label }}</label>
            <div
              v-if="question.type === 'scale'"
              class="scale-row"
              role="group"
              :aria-labelledby="`s-${guest.id}-${question.key}`"
            >
              <button
                v-for="value in scaleValues(question.min, question.max)"
                :key="value"
                type="button"
                :class="{ on: draft(guest.id, question.key) === String(value) }"
                @click="setDraft(guest.id, question.key, String(value))"
              >
                {{ value }}
              </button>
            </div>
            <textarea
              v-else
              :id="`s-${guest.id}-${question.key}-input`"
              rows="3"
              :value="draft(guest.id, question.key)"
              @input="setDraft(guest.id, question.key, ($event.target as HTMLTextAreaElement).value)"
            />
            <div class="err">
              {{ guestErrors[guest.id]?.[question.key] }}
            </div>
          </div>
          <div
            v-if="guestMessage[guest.id]"
            class="cabwarn"
          >
            ⚠ {{ guestMessage[guest.id] }}
          </div>
          <button
            type="button"
            class="btn"
            :disabled="saving === guest.id"
            @click="sendGuest(guest.id)"
          >
            {{ t('survey.send') }}
          </button>
        </template>
      </div>
    </template>
  </div>
</template>
