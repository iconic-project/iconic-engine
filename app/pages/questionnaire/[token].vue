<script setup lang="ts">
import type { QuestionnaireView } from '../../types/api'

type StayQuestionnaire = QuestionnaireView & {
  check_in: string
  check_out: string
  property_name: string
}
import { engineErrorMessage, engineErrorStatus, fieldErrors } from '../../utils/engineError'
import { formatIsoDate } from '../../utils/engineFlow'
import {
  questionnaireControlValue,
  questionnaireShowsReplace,
  questionnaireSubmitValue
} from '../../utils/questionnaireFields'

const { t } = useI18n()
const { request } = useApi()
const route = useRoute()

const token = computed(() => String(route.params.token ?? ''))

useHead({
  title: t('questionnaire.title'),
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})
useSeoMeta({
  robots: 'noindex'
})

const { data, error } = await useAsyncData(
  () => `engine-questionnaire-${token.value}`,
  () => request(`/api/engine/questionnaire/${token.value}`) as Promise<StayQuestionnaire>
)

const invalid = computed(() => {
  if (!error.value) {
    return false
  }

  const status = engineErrorStatus(error.value)

  return status === 404 || status === undefined
})

const drafts = ref<Record<number, Record<string, string>>>({})
const hydrated = ref(false)
const saving = ref<number | null>(null)
const saved = ref<Record<number, boolean>>({})
const guestErrors = ref<Record<number, Record<string, string>>>({})
const guestMessage = ref<Record<number, string>>({})

function syncDrafts(page: QuestionnaireView, onlyGuestId?: number): void {
  const next: Record<number, Record<string, string>> = onlyGuestId === undefined ? {} : { ...drafts.value }

  for (const guest of page.guests) {
    if (onlyGuestId !== undefined && guest.id !== onlyGuestId) {
      continue
    }

    const row: Record<string, string> = {}

    for (const question of page.questions) {
      row[question.key] = questionnaireControlValue(
        question.restricted,
        guest.answers[question.key] ?? ''
      )
    }

    next[guest.id] = row
  }

  drafts.value = next
}

watch(data, (page) => {
  if (page && !hydrated.value) {
    syncDrafts(page)
    hydrated.value = true
  }
}, { immediate: true })

function draft(guestId: number, key: string): string {
  return drafts.value[guestId]?.[key] ?? ''
}

function choiceItems(options: Array<string>): Array<{ label: string, value: string }> {
  return [
    { label: '\u00a0', value: '' },
    ...options.map(option => ({ label: option, value: option }))
  ]
}

function onChoice(guestId: number, key: string, value: string | number | null | undefined): void {
  setDraft(guestId, key, typeof value === 'string' ? value : '')
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

async function saveGuest(guestId: number): Promise<void> {
  const page = data.value

  if (!page) {
    return
  }

  saving.value = guestId
  saved.value = { ...saved.value, [guestId]: false }
  guestErrors.value = { ...guestErrors.value, [guestId]: {} }
  guestMessage.value = { ...guestMessage.value, [guestId]: '' }

  const answers: Record<string, string> = {}

  for (const question of page.questions) {
    answers[question.key] = questionnaireSubmitValue(
      question.restricted,
      draft(guestId, question.key)
    )
  }

  try {
    const next = await request(`/api/engine/questionnaire/${token.value}/guests/${guestId}`, {
      method: 'PUT',
      body: { answers }
    }) as QuestionnaireView
    data.value = next
    syncDrafts(next, guestId)
    saved.value = { ...saved.value, [guestId]: true }
  } catch (caught) {
    const fields = fieldErrors(caught)
    const scoped: Record<string, string> = {}

    for (const question of page.questions) {
      const message = fields[`answers.${question.key}`]

      if (message) {
        scoped[question.key] = message
      }
    }

    guestErrors.value = { ...guestErrors.value, [guestId]: scoped }
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
      <span class="mono klabel">{{ t('questionnaire.k') }}</span>
      <h1 class="disp">
        {{ t('questionnaire.title') }}
      </h1>
      <p class="sub">
        {{ data.reference }} · {{ data.property_name }} · {{ formatIsoDate(data.check_in) }} – {{ formatIsoDate(data.check_out) }}
      </p>

      <div
        v-for="guest in data.guests"
        :key="guest.id"
        class="fsec"
      >
        <h3>{{ t('questionnaire.guest', { name: guest.first_name, cabin: guest.cabin }) }}</h3>
        <div
          v-for="question in data.questions"
          :key="question.key"
          class="field"
          :class="{ bad: Boolean(guestErrors[guest.id]?.[question.key]) }"
        >
          <label :for="`q-${guest.id}-${question.key}`">{{ question.label }}</label>
          <p
            v-if="question.restricted"
            class="hint"
          >
            {{ t('questionnaire.restricted') }}
          </p>
          <p
            v-if="questionnaireShowsReplace(question.restricted, guest.answers[question.key] ?? '')"
            class="hint"
          >
            {{ t('questionnaire.replace') }}
          </p>
          <USelect
            v-if="question.type === 'choice'"
            :id="`q-${guest.id}-${question.key}`"
            class="w-full"
            :model-value="draft(guest.id, question.key)"
            :items="choiceItems(question.options)"
            @update:model-value="onChoice(guest.id, question.key, $event)"
          />
          <textarea
            v-else
            :id="`q-${guest.id}-${question.key}`"
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
        <p
          v-if="saved[guest.id]"
          class="hint"
        >
          {{ t('questionnaire.saved') }}
        </p>
        <button
          type="button"
          class="btn"
          :disabled="saving === guest.id"
          @click="saveGuest(guest.id)"
        >
          {{ t('questionnaire.save') }}
        </button>
      </div>
    </template>
  </div>
</template>
