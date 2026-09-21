import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxt/icon',
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  css: [
    '~/assets/css/main.css',
  ],
  icon: {
    serverBundle: 'local',
  },
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
          langs: ['json', 'js', 'ts', 'bash', 'sql', 'mermaid', 'yaml', 'http'],
        },
      },
    },
  },
})
