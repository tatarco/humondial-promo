/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hm: {
          bg:         '#060202',
          red:        '#D63A36',
          gold:       '#F4C15D',
          'gold-dim': 'rgba(244,193,93,0.55)',
          white:      '#F8F3EA',
          card:       'rgba(28,6,6,0.88)',
          dim:        'rgba(214,58,54,0.18)',
          muted:      '#9D8585',
          green:      '#35D26F',
          border:     'rgba(214,58,54,0.28)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        card: '22px',
        btn:  '18px',
      },
    },
  },
  plugins: [],
};
