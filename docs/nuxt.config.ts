export default defineNuxtConfig({
  extends: '@nuxt-themes/docus',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
  ],
  css: [
    '~/assets/css/main.css',
  ],
  content: {
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark',
      },
      preload: ['json', 'js', 'ts', 'bash', 'sql', 'mermaid', 'yaml'],
    },
    navigation: {
      fields: ['icon', 'title', 'description'],
    },
  },
  tailwindcss: {
    viewer: false,
  },
});
