// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: '../iconic-ui/app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', {
        ignore: [
          '^(engine|topbar|brand|brand-mark--dark|brand-mark--light|topnav|on|lang|wrap|stage|heroband|sky|coords|disp|sub|crumbs|crumb|cur|done|engine-footer|prowmark|placeholder-copy|engine-placeholder|engine-placeholder__header|engine-placeholder__title|engine-placeholder__body|btn|cta|o|lb|ico|mono|klabel|bbnote|bookwrap|bookbar|bb|open|pop|yr|mgrid|mn|dis|sel|inrange|hint|gpop|grow|gl|stepper|n|itins|itin|img|grad|tag|tagline|bd|chips|chip|dealbar|foot|price|f|v|depsList|dlInner|overview|depRow|full|deal-on|d|y|st-av|st-ur|st-fu|dep-actions|pr|deal|was|nowpr|waitlist-mask|waitlist-stub|waitlist-form|consent-bar|consent-actions|complete-page|scale-row|duebox|locked|guardian|detgrid|dt-head|badges|badge|hl|hero|tagg|facts|fact|fl|fv|desc|tabs|tab|tabbody|hlrow|spaced|dt-actions|dth|dtable|dhead|drow|selrow|dd|outside|dy|dcta|rail|railbox|from|amt|tick|railsel|rail-cta|railnote|route-map|eyebrow|days|railfoot|mapwrap|map|card|cday|sites|tags|w|dayrow|active|val|act|cabgrid|wgrid|selbox|partyline|cabtabs|cabtab|cabtab-row|t|s|deck|ori|hull|cabrow|owner|cabx|cn|ct|taken|cabwarn|side|line|hd|sand|info|tot|note|promo|pmsg|applied|paths|path|ph|pd|pay|perk|payzero|r|fsec|field|err|cols2|radio|opt|chkrow|guest-row|ver|confirm|bigid|next3|nx)$'
        ]
      }]
    }
  }
)
