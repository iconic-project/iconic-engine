import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

function isUiLayer(cwd: string): boolean {
  return existsSync(resolve(cwd, 'app/types/engine.ts'))
}

const localUi = resolve(import.meta.dirname, '../iconic-ui')
const uiLayer = existsSync(localUi)
  ? '../iconic-ui'
  : 'github:anakata-project/anakata-ui#v0.17.1'

export default defineNuxtConfig({
  extends: [uiLayer],

  modules: [
    (_options, nuxt) => {
      const layer = nuxt.options._layers.find(item =>
        item.cwd !== nuxt.options.rootDir && isUiLayer(item.cwd)
      )
      if (layer) {
        nuxt.options.alias['#anakata-ui'] = layer.cwd
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
    ? { '#anakata-ui': localUi }
    : {},

  routeRules: {
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
    '/charter-proposal/**': {
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
