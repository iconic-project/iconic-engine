import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

function isUiLayer(cwd: string): boolean {
  return existsSync(resolve(cwd, 'app/types/engine.ts'))
}

const localUi = resolve(import.meta.dirname, '../iconic-ui')
const uiLayer = existsSync(localUi)
  ? '../iconic-ui'
  : 'github:iconic-project/iconic-ui#dev'

export default defineNuxtConfig({
  extends: [uiLayer],

  modules: [
    (_options, nuxt) => {
      const layer = nuxt.options._layers.find(item =>
        item.cwd !== nuxt.options.rootDir && isUiLayer(item.cwd)
      )
      if (layer) {
        nuxt.options.alias['#iconic-ui'] = layer.cwd
      }
    },
    '@nuxt/ui',
    '@nuxt/eslint'
  ],

  css: ['~/assets/css/engine.css'],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000',
      gaMeasurementId: ''
    }
  },

  alias: existsSync(localUi)
    ? { '#iconic-ui': localUi }
    : {},

  routeRules: {
    '/itineraries': { redirect: { to: '/rooms', statusCode: 301 } },
    '/itineraries/**': { redirect: { to: '/rooms', statusCode: 301 } },
    '/book/cabins': { redirect: { to: '/book/rooms', statusCode: 301 } },
    '/complete/**': {
      headers: {
        'cache-control': 'no-store, private'
      }
    },
    '/questionnaire/**': {
      headers: {
        'cache-control': 'no-store, private'
      }
    },
    '/survey/**': {
      headers: {
        'cache-control': 'no-store, private'
      }
    },
    '/unsubscribe/**': {
      headers: {
        'cache-control': 'no-store, private'
      }
    }
  },

  devServer: {
    port: 3000
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'en', language: 'en', file: 'en.json' }
    ]
  }
})
