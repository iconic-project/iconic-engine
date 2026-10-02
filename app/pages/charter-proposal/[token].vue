<script setup lang="ts">
import type { components } from '#iconic-ui/app/types/api'
import type { CharterProposalView } from '../../types/api'
import { acceptBlocked, proposalFormState } from '../../utils/charterProposal'
import { engineErrorMessage } from '../../utils/engineError'
import { formatIsoDate } from '../../utils/engineFlow'

type Accepted = components['schemas']['CharterProposalAcceptedResource']

const { t } = useI18n()
const { format } = useMoney()
const { request } = useApi()
const route = useRoute()

const token = computed(() => String(route.params.token ?? ''))

useHead({
  title: t('charterProposal.title'),
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})
useSeoMeta({
  robots: 'noindex'
})

const { data, error } = await useAsyncData(
  () => `engine-charter-proposal-${token.value}`,
  () => request(`/api/engine/charter-proposal/${token.value}`) as Promise<CharterProposalView>
)

const invalid = computed(() => Boolean(error.value) || data.value === null)

const name = ref('')
const terms = ref(false)
const reason = ref('')
const posting = ref(false)
const actionError = ref('')
const accepted = ref<Accepted | null>(null)
const declined = ref(false)

const formState = computed(() => {
  if (data.value === null || data.value === undefined) {
    return 'expired' as const
  }

  return proposalFormState(data.value)
})

const showForm = computed(() => formState.value === 'open' && accepted.value === null && !declined.value)

function moneyOrDash(value: number | null): string {
  if (value === null) {
    return t('charterProposal.dash')
  }

  return format(value)
}

async function accept(): Promise<void> {
  if (acceptBlocked(name.value, terms.value)) {
    return
  }

  posting.value = true
  actionError.value = ''

  try {
    accepted.value = await request(`/api/engine/charter-proposal/${token.value}/accept`, {
      method: 'POST',
      body: {
        name: name.value.trim(),
        terms: true
      }
    }) as Accepted
  } catch (caught: unknown) {
    actionError.value = engineErrorMessage(caught)
  } finally {
    posting.value = false
  }
}

async function decline(): Promise<void> {
  posting.value = true
  actionError.value = ''

  try {
    const body: { reason?: string } = {}
    const trimmed = reason.value.trim()

    if (trimmed !== '') {
      body.reason = trimmed
    }

    await request(`/api/engine/charter-proposal/${token.value}/decline`, {
      method: 'POST',
      body
    })
    declined.value = true
  } catch (caught: unknown) {
    actionError.value = engineErrorMessage(caught)
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <div class="complete-page">
    <template v-if="invalid">
      <span class="mono klabel">{{ t('complete.kInvalid') }}</span>
      <h1 class="disp">
        {{ t('complete.invalidTitle') }}
      </h1>
      <p class="sub">
        {{ t('complete.invalidBody', { email: t('search.contactEmail') }) }}
      </p>
    </template>
    <template v-else-if="data">
      <span class="mono klabel">{{ t('charterProposal.k') }}</span>
      <h1 class="disp">
        {{ t('charterProposal.title') }}
      </h1>
      <p class="sub">
        {{ t('charterProposal.version', { version: data.version }) }}
        <template v-if="data.number">
          · {{ data.number }}
        </template>
        <template v-if="data.valid_until">
          · {{ t('charterProposal.validUntil', { date: formatIsoDate(data.valid_until) }) }}
        </template>
      </p>

      <div class="fsec">
        <!-- eslint-disable-next-line vue/no-v-html -- the proposal document is the HTML the API rendered -->
        <div v-html="data.html" />
      </div>

      <div class="duebox">
        <div
          v-for="line in data.price.lines"
          :key="line.code"
          class="r"
        >
          <span>{{ line.label }}</span>
          <span>{{ format(line.amount) }}</span>
        </div>
        <div class="r">
          <span>{{ t('charterProposal.total') }}</span>
          <span>{{ moneyOrDash(data.price.total) }}</span>
        </div>
        <div class="r">
          <span>{{ t('charterProposal.deposit') }}</span>
          <span>{{ moneyOrDash(data.price.deposit) }}</span>
        </div>
      </div>

      <p
        v-if="formState === 'expired' && accepted === null"
        class="sub"
      >
        {{ t('charterProposal.expiredLead') }}
      </p>
      <div v-if="formState === 'accepted' || accepted">
        <h2>{{ t('charterProposal.acceptedTitle') }}</h2>
        <p v-if="accepted">
          {{
            accepted.deposit_due_on
              ? t('charterProposal.acceptedLead', {
                reference: accepted.booking_reference,
                date: formatIsoDate(accepted.deposit_due_on)
              })
              : t('charterProposal.acceptedNoDate', { reference: accepted.booking_reference })
          }}
        </p>
        <p v-else>
          {{ t('charterProposal.acceptedLoaded') }}
        </p>
        <p v-if="accepted && data.price.deposit !== null">
          {{ t('charterProposal.deposit') }} {{ format(data.price.deposit) }}
        </p>
      </div>
      <div v-else-if="formState === 'declined' || declined">
        <h2>{{ t('charterProposal.declinedTitle') }}</h2>
        <p>{{ t('charterProposal.declinedLead') }}</p>
      </div>

      <p
        v-if="actionError !== ''"
        class="sub"
      >
        {{ actionError }}
      </p>

      <form
        v-if="showForm"
        class="fsec"
        @submit.prevent="accept"
      >
        <div class="field">
          <label>{{ t('charterProposal.name') }}</label>
          <input
            v-model="name"
            type="text"
            autocomplete="name"
          >
        </div>
        <label class="field">
          <input
            v-model="terms"
            type="checkbox"
          >
          {{ t('charterProposal.terms') }}
        </label>
        <button
          type="submit"
          class="btn"
          :disabled="posting || acceptBlocked(name, terms)"
        >
          {{ t('charterProposal.accept') }}
        </button>
      </form>

      <form
        v-if="showForm"
        class="fsec"
        @submit.prevent="decline"
      >
        <div class="field">
          <label>{{ t('charterProposal.reason') }}</label>
          <textarea
            v-model="reason"
            rows="3"
          />
        </div>
        <button
          type="submit"
          class="btn"
          :disabled="posting"
        >
          {{ t('charterProposal.decline') }}
        </button>
      </form>
    </template>
  </div>
</template>
