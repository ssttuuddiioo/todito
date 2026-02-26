/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // M3 Primary
        primary: {
          DEFAULT: 'var(--md-sys-color-primary)',
          on: 'var(--md-sys-color-on-primary)',
          container: 'var(--md-sys-color-primary-container)',
          'on-container': 'var(--md-sys-color-on-primary-container)',
        },
        // M3 Secondary
        secondary: {
          DEFAULT: 'var(--md-sys-color-secondary)',
          on: 'var(--md-sys-color-on-secondary)',
          container: 'var(--md-sys-color-secondary-container)',
          'on-container': 'var(--md-sys-color-on-secondary-container)',
        },
        // M3 Tertiary
        tertiary: {
          DEFAULT: 'var(--md-sys-color-tertiary)',
          on: 'var(--md-sys-color-on-tertiary)',
          container: 'var(--md-sys-color-tertiary-container)',
          'on-container': 'var(--md-sys-color-on-tertiary-container)',
        },
        // M3 Error
        error: {
          DEFAULT: 'var(--md-sys-color-error)',
          on: 'var(--md-sys-color-on-error)',
          container: 'var(--md-sys-color-error-container)',
          'on-container': 'var(--md-sys-color-on-error-container)',
        },
        // M3 Surface
        surface: {
          DEFAULT: 'var(--md-sys-color-surface)',
          dim: 'var(--md-sys-color-surface-dim)',
          bright: 'var(--md-sys-color-surface-bright)',
          'container-lowest': 'var(--md-sys-color-surface-container-lowest)',
          'container-low': 'var(--md-sys-color-surface-container-low)',
          container: 'var(--md-sys-color-surface-container)',
          'container-high': 'var(--md-sys-color-surface-container-high)',
          'container-highest': 'var(--md-sys-color-surface-container-highest)',
          on: 'var(--md-sys-color-on-surface)',
          'on-variant': 'var(--md-sys-color-on-surface-variant)',
          tint: 'var(--md-sys-color-surface-tint)',
        },
        // M3 Outline
        outline: {
          DEFAULT: 'var(--md-sys-color-outline)',
          variant: 'var(--md-sys-color-outline-variant)',
        },
        // M3 Inverse
        inverse: {
          surface: 'var(--md-sys-color-inverse-surface)',
          'on-surface': 'var(--md-sys-color-inverse-on-surface)',
          primary: 'var(--md-sys-color-inverse-primary)',
        },
        // M3 Scrim
        scrim: 'var(--md-sys-color-scrim)',
      },

      fontFamily: {
        sans: ['"Roboto Flex"', 'Roboto', '"Noto Sans"', 'system-ui', 'sans-serif'],
      },

      // M3 Typography scale
      fontSize: {
        // Standard Tailwind sizes (+5px)
        'xs':   ['17px', { lineHeight: '22px' }],
        'sm':   ['19px', { lineHeight: '26px' }],
        'base': ['21px', { lineHeight: '28px' }],
        'lg':   ['23px', { lineHeight: '30px' }],
        'xl':   ['25px', { lineHeight: '34px' }],
        '2xl':  ['29px', { lineHeight: '38px' }],
        '3xl':  ['35px', { lineHeight: '44px' }],
        '4xl':  ['41px', { lineHeight: '50px' }],
        // M3 Typography scale (+5px)
        'display-lg':  ['62px', { lineHeight: '70px', letterSpacing: '-0.25px' }],
        'display-md':  ['50px', { lineHeight: '58px', letterSpacing: '0px' }],
        'display-sm':  ['41px', { lineHeight: '50px', letterSpacing: '0px' }],
        'headline-lg': ['37px', { lineHeight: '46px', letterSpacing: '0px' }],
        'headline-md': ['33px', { lineHeight: '42px', letterSpacing: '0px' }],
        'headline-sm': ['29px', { lineHeight: '38px', letterSpacing: '0px' }],
        'title-lg':    ['27px', { lineHeight: '34px', letterSpacing: '0px' }],
        'title-md':    ['21px', { lineHeight: '28px', letterSpacing: '0.15px' }],
        'title-sm':    ['19px', { lineHeight: '26px', letterSpacing: '0.1px' }],
        'body-lg':     ['21px', { lineHeight: '28px', letterSpacing: '0.5px' }],
        'body-md':     ['19px', { lineHeight: '26px', letterSpacing: '0.25px' }],
        'body-sm':     ['17px', { lineHeight: '22px', letterSpacing: '0.4px' }],
        'label-lg':    ['19px', { lineHeight: '26px', letterSpacing: '0.1px' }],
        'label-md':    ['17px', { lineHeight: '22px', letterSpacing: '0.5px' }],
        'label-sm':    ['16px', { lineHeight: '22px', letterSpacing: '0.5px' }],
      },

      // M3 Shape scale
      borderRadius: {
        'none': '0px',
        'xs': 'var(--md-sys-shape-extra-small)',
        'sm': 'var(--md-sys-shape-small)',
        'md': 'var(--md-sys-shape-medium)',
        'lg': 'var(--md-sys-shape-large)',
        'xl': 'var(--md-sys-shape-extra-large)',
        'full': 'var(--md-sys-shape-full)',
      },

      // M3 Elevation shadows (dark theme)
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
        'elevation-2': '0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
        'elevation-3': '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.3)',
        'elevation-4': '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px 0 rgba(0,0,0,0.3)',
        'elevation-5': '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3)',
        // Accent glow shadows for hover states
        'glow-primary': '0 0 12px 2px rgba(96, 165, 250, 0.15)',
        'glow-green':   '0 0 10px 1px rgba(74, 222, 128, 0.12)',
        'glow-amber':   '0 0 10px 1px rgba(251, 191, 36, 0.12)',
        'glow-orange':  '0 0 10px 1px rgba(251, 146, 60, 0.12)',
        'glow-cyan':    '0 0 10px 1px rgba(34, 211, 238, 0.12)',
      },
    },
  },
  plugins: [],
}
