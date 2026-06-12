import type { Config } from 'tailwindcss';

/* var-ga asoslangan rangni alpha-qobiliyatli qilish (bg-xedu-primary/10 kabi
   opacity modifikatorlari ishlashi uchun) — faqat to'liq xira (opaque) hex
   saqlovchi var'lar uchun; alpha allaqachon ichida bo'lganlarga (masalan,
   --xedu-border) qo'llanmaydi. */
const xv = (name: string) => `rgb(from var(--${name}) r g b / <alpha-value>)`;
const xScale = (name: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [s, xv(`${name}-${s}`)]),
  );

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Font ── */
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      /* ── Typography scale (Inter Variable, rem-based) ── */
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        'xs':  ['11px', { lineHeight: '15px', letterSpacing: '0.01em' }],
        'sm':  ['12px', { lineHeight: '16px' }],
        'base':['13px', { lineHeight: '18px' }],
        'md':  ['14px', { lineHeight: '20px' }],
        'lg':  ['15px', { lineHeight: '22px' }],
        'xl':  ['16px', { lineHeight: '24px' }],
        '2xl': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        '3xl': ['22px', { lineHeight: '30px', letterSpacing: '-0.015em' }],
        '4xl': ['26px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
      },

      /* ── Colors (shadcn + Xedu tokens) ── */
      colors: {
        border:      'hsl(var(--border) / <alpha-value>)',
        input:       'hsl(var(--input) / <alpha-value>)',
        ring:        'hsl(var(--ring) / <alpha-value>)',
        background:  'hsl(var(--background) / <alpha-value>)',
        foreground:  'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT:    'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT:    'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        /* Landing page tokens */
        leaf: {
          DEFAULT: '#4FC47A',
          deep:    '#1E4532',
        },
        cream: '#FAFAF9',
        ink:   '#1B2620',

        /* Xedu brand system */
        'xedu-primary': {
          DEFAULT: xv('xedu-primary'),
          hover:   xv('xedu-primary-hover'),
          active:  xv('xedu-primary-active'),
          light:   xv('xedu-primary-light'),
          muted:   xv('xedu-primary-muted'),
        },
        'xedu-slate':   xScale('xedu-slate'),
        'xedu-ruby':    { DEFAULT: xv('xedu-ruby'),    ...xScale('xedu-ruby') },
        'xedu-amber':   { DEFAULT: xv('xedu-amber'),   ...xScale('xedu-amber') },
        'xedu-emerald': { DEFAULT: xv('xedu-emerald'), ...xScale('xedu-emerald') },
        'xedu-sky':     { DEFAULT: xv('xedu-sky'),     ...xScale('xedu-sky') },
        'xedu-violet':  { DEFAULT: xv('xedu-violet'),  ...xScale('xedu-violet') },
        'xedu-gold':    { DEFAULT: xv('xedu-gold'),    ...xScale('xedu-gold') },
        'xedu-bg': {
          DEFAULT:  xv('xedu-bg'),
          sidebar:  xv('xedu-bg-sidebar'),
          canvas:   xv('xedu-bg-canvas'),
          rail:     xv('xedu-bg-rail'),
          panel:    xv('xedu-bg-panel'),
          elevated: xv('xedu-bg-elevated'),
          subtle:   xv('xedu-bg-subtle'),
          floating: xv('xedu-bg-floating'),
        },
        'xedu-border': {
          DEFAULT: 'var(--xedu-border)',
          strong:  'var(--xedu-border-strong)',
          hover:   'var(--xedu-border-hover)',
        },
        'xedu-text': {
          DEFAULT: 'var(--xedu-text)',
        },
      },

      /* ── Border radius (4px step system) ── */
      borderRadius: {
        xs:   '6px',
        sm:   '8px',
        md:   '10px',
        lg:   '12px',
        xl:   '14px',
        '2xl':'16px',
        '3xl':'20px',
        '4xl':'24px',
      },

      /* ── Elevation shadows ── */
      boxShadow: {
        xs:       'var(--xedu-shadow-xs)',
        sm:       'var(--xedu-shadow-sm)',
        md:       'var(--xedu-shadow-md)',
        lg:       'var(--xedu-shadow-lg)',
        xl:       'var(--xedu-shadow-xl)',
        card:     'var(--shadow-card)',
        elevated: 'var(--xedu-shadow-lg)',
        dialog:   'var(--xedu-shadow-dialog)',
        floating: 'var(--xedu-shadow-floating)',
        pill:     'var(--xedu-shadow-pill)',
        'glow-primary': 'var(--xedu-shadow-glow-primary)',
        'glow-amber':   'var(--xedu-shadow-glow-amber)',
        'glow-ruby':    'var(--xedu-shadow-glow-ruby)',
        'glow-sky':     'var(--xedu-shadow-glow-sky)',
        'glow-violet':  'var(--xedu-shadow-glow-violet)',
      },

      /* ── Spacing (4px base grid) ── */
      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '1.5': '6px',
        '2':   '8px',
        '2.5': '10px',
        '3':   '12px',
        '3.5': '14px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '7':   '28px',
        '8':   '32px',
        '9':   '36px',
        '10':  '40px',
        '11':  '44px',
        '12':  '48px',
        'header': 'var(--header-height, 64px)',
        'sidebar': 'var(--sidebar-width, 272px)',
        'sidebar-collapsed': 'var(--sidebar-collapsed, 84px)',
      },

      /* ── Animations ── */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'fade-in':       'fade-in 150ms ease-out',
        'fade-up':       'fade-up 150ms ease-out',
        'slide-in-left': 'slide-in-left 150ms ease-out',
        'count-up':      'count-up 150ms ease-out',
        'accordion-down':'accordion-down 150ms ease-out',
        'accordion-up':  'accordion-up 150ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
  safelist: [
    'bg-xedu-slate-950',
    'bg-xedu-slate-900',
    'bg-xedu-slate-800',
    'border-xedu-slate-800',
    'text-xedu-slate-400',
    'text-xedu-slate-300',
    'hover:bg-xedu-slate-800',
    'bg-xedu-emerald/20',
    'text-xedu-emerald',
    'border-xedu-emerald',
  ],
};

export default config;
