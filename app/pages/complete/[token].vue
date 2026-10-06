<script setup lang="ts">
import type { CompleteReservation } from '../../types/api'
import { completePayReady, declarationControl } from '../../utils/completeState'
import { engineErrorMessage, engineErrorStatus, fieldErrors } from '../../utils/engineError'
import { formatIsoDate } from '../../utils/engineFlow'
import { submitSessionId } from '../../utils/engineSession'

const { t } = useI18n()
const { format } = useMoney()
const { request } = useApi()
const route = useRoute()

const token = computed(() => String(route.params.token ?? ''))

useHead({
  title: t('complete.title'),
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})
useSeoMeta({
  robots: 'noindex'
})

const { data, error, refresh } = await useAsyncData(
  () => `engine-complete-${token.value}`,
  () => request(`/api/engine/complete/${token.value}`) as Promise<CompleteReservation>
)

const invalid = computed(() => {
  if (!error.value) {
    return false
  }

  const status = engineErrorStatus(error.value)

  return status === 404 || status === undefined
})

const billingName = ref('')
const billingAddress = ref('')
const billingEmail = ref('')
const billingPhone = ref('')
const billingSaving = ref(false)
const billingError = ref('')
const billingFields = ref<Record<string, string>>({})

const ticked = ref<Array<string>>([])
const declSaving = ref(false)
const declError = ref('')

const guestSaving = ref<number | null>(null)
const guestErrors = ref<Record<number, Record<string, string>>>({})
const guestMessage = ref('')

watch(data, (next) => {
  if (!next) {
    return
  }

  billingName.value = next.billing.billing_name ?? ''
  billingAddress.value = next.billing.billing_address ?? ''
  billingEmail.value = next.billing.billing_email ?? ''
  billingPhone.value = next.billing.billing_phone ?? ''
  ticked.value = []
}, { immediate: true })

const liveDeclarations = computed(() =>
  (data.value?.declarations ?? []).filter(row => declarationControl(row).kind === 'live')
)

const lockedDeclarations = computed(() =>
  (data.value?.declarations ?? []).filter(row => declarationControl(row).kind === 'locked')
)

function sessionField(): { session_id?: string } {
  const sessionId = submitSessionId()

  return sessionId ? { session_id: sessionId } : {}
}

function applyPage(next: CompleteReservation): void {
  data.value = next
}

async function saveBilling(): Promise<void> {
  billingSaving.value = true
  billingError.value = ''
  billingFields.value = {}

  try {
    const next = await request(`/api/engine/complete/${token.value}/billing`, {
      method: 'PUT',
      body: {
        billing_name: billingName.value.trim() || null,
        billing_address: billingAddress.value.trim() || null,
        billing_email: billingEmail.value.trim() || null,
        billing_phone: billingPhone.value.trim() || null,
        ...sessionField()
      }
    }) as CompleteReservation
    applyPage(next)
  } catch (caught) {
    billingFields.value = fieldErrors(caught)
    billingError.value = engineErrorMessage(caught)
  } finally {
    billingSaving.value = false
  }
}

function toggleDecl(document: string, checked: boolean): void {
  if (checked) {
    ticked.value = [...new Set([...ticked.value, document])]

    return
  }

  ticked.value = ticked.value.filter(item => item !== document)
}

async function saveDeclarations(): Promise<void> {
  const documents = liveDeclarations.value
    .filter(row => ticked.value.includes(row.document))
    .map(row => row.document)

  if (documents.length === 0) {
    return
  }

  declSaving.value = true
  declError.value = ''

  try {
    const next = await request(`/api/engine/complete/${token.value}/declarations`, {
      method: 'POST',
      body: { documents, ...sessionField() }
    }) as CompleteReservation
    applyPage(next)
    ticked.value = []
  } catch (caught) {
    declError.value = engineErrorMessage(caught)
  } finally {
    declSaving.value = false
  }
}

async function saveGuest(guestId: number, body: Record<string, unknown>): Promise<void> {
  guestSaving.value = guestId
  guestMessage.value = ''
  guestErrors.value = { ...guestErrors.value, [guestId]: {} }

  try {
    const next = await request(`/api/engine/complete/${token.value}/guests/${guestId}`, {
      method: 'PUT',
      body: { ...body, ...sessionField() }
    }) as CompleteReservation
    applyPage(next)
    await refresh()
  } catch (caught) {
    guestErrors.value = { ...guestErrors.value, [guestId]: fieldErrors(caught) }
    guestMessage.value = engineErrorMessage(caught)
  } finally {
    guestSaving.value = null
  }
}

function pay(): void {
  const url = data.value?.pay_url

  if (!data.value || !completePayReady(data.value.can_pay, url ?? null) || !url) {
    return
  }

  window.location.assign(url)
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
      <span class="mono klabel">{{ t('complete.k') }}</span>
      <h1 class="disp">
        {{ t('complete.title') }}
      </h1>
      <p class="sub">
        {{ t('complete.lead') }}
      </p>

      <div class="fsec">
        <h3>{{ t('complete.bookings') }}</h3>
        <div
          v-for="booking in data.bookings"
          :key="booking.id"
          class="line"
        >
          <span>{{ booking.reference }} · {{ booking.property }} · {{ formatIsoDate(booking.departure_date) }} · {{ booking.cabin_label }}</span>
          <span>{{ booking.itinerary_name }}</span>
        </div>
        <div class="duebox">
          <div class="r">
            <span>{{ data.amount_due_label }}</span>
            <span>{{ format(data.amount_due) }}</span>
          </div>
        </div>
      </div>

      <div class="fsec">
        <h3>{{ t('complete.billing') }}</h3>
        <div
          class="field"
          :class="{ bad: Boolean(billingFields.billing_name) }"
        >
          <label>{{ t('complete.billingName') }}</label>
          <input v-model="billingName">
          <div class="err">
            {{ billingFields.billing_name }}
          </div>
        </div>
        <div
          class="field"
          :class="{ bad: Boolean(billingFields.billing_address) }"
        >
          <label>{{ t('complete.billingAddress') }}</label>
          <textarea
            v-model="billingAddress"
            rows="3"
          />
          <div class="err">
            {{ billingFields.billing_address }}
          </div>
        </div>
        <div class="cols2">
          <div
            class="field"
            :class="{ bad: Boolean(billingFields.billing_email) }"
          >
            <label>{{ t('complete.billingEmail') }}</label>
            <input
              v-model="billingEmail"
              type="email"
            >
            <div class="err">
              {{ billingFields.billing_email }}
            </div>
          </div>
          <div
            class="field"
            :class="{ bad: Boolean(billingFields.billing_phone) }"
          >
            <label>{{ t('complete.billingPhone') }}</label>
            <input v-model="billingPhone">
            <div class="err">
              {{ billingFields.billing_phone }}
            </div>
          </div>
        </div>
        <div
          v-if="billingError"
          class="cabwarn"
        >
          ⚠ {{ billingError }}
        </div>
        <button
          type="button"
          class="btn"
          :disabled="billingSaving"
          @click="saveBilling"
        >
          {{ t('complete.saveBilling') }}
        </button>
      </div>

      <div class="fsec">
        <h3>{{ t('complete.declarations') }}</h3>
        <label
          v-for="row in lockedDeclarations"
          :key="row.document"
          class="chkrow locked"
        >
          <input
            type="checkbox"
            checked
            disabled
          >
          <span>
            {{ row.label }}
            <span class="ver">{{ row.version }}</span>
          </span>
        </label>
        <label
          v-for="row in liveDeclarations"
          :key="row.document"
          class="chkrow"
        >
          <input
            type="checkbox"
            :checked="ticked.includes(row.document)"
            @change="toggleDecl(row.document, ($event.target as HTMLInputElement).checked)"
          >
          <span>
            {{ row.label }}
            <span class="ver">{{ row.version }}</span>
          </span>
        </label>
        <div
          v-if="declError"
          class="cabwarn"
        >
          ⚠ {{ declError }}
        </div>
        <button
          type="button"
          class="btn"
          :disabled="declSaving || ticked.length === 0"
          @click="saveDeclarations"
        >
          {{ t('complete.saveDecls') }}
        </button>
      </div>

      <div
        v-for="booking in data.bookings"
        :key="`g-${booking.id}`"
      >
        <CompleteGuestForm
          v-for="guest in booking.guests"
          :key="guest.id"
          :guest="guest"
          :countries="data.countries"
          :errors="guestErrors[guest.id] ?? {}"
          :saving="guestSaving === guest.id"
          @save="saveGuest(guest.id, $event)"
        />
      </div>
      <div
        v-if="guestMessage"
        class="cabwarn"
      >
        ⚠ {{ guestMessage }}
      </div>

      <div class="dt-actions">
        <button
          type="button"
          class="btn cta"
          :disabled="!completePayReady(data.can_pay, data.pay_url ?? null)"
          @click="pay"
        >
          <span class="lb">{{ t('complete.pay') }}</span>
          <span class="ico">→</span>
        </button>
      </div>
      <p
        v-if="!data.pay_url"
        class="note"
      >
        {{ t('complete.noLink') }}
      </p>
    </template>
  </div>
</template>
