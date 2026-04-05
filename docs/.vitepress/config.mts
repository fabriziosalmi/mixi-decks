import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Mixi Decks",
  description: "Advanced Drop-In Plugins for Mixi",
  base: "/mixi-decks/",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architecture & Engine', link: '/guide/architecture' }
        ]
      },
      {
        text: 'The Collections',
        items: [
          { text: 'I. Core Synthesis', link: '/decks/core' },
          { text: 'II. Generative Ambient', link: '/decks/generative' },
          { text: 'III. The Absurd Series', link: '/decks/absurd' },
          { text: 'IV. Avant-Garde Domain', link: '/decks/avant-garde' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fabriziosalmi/mixi-decks' }
    ]
  }
})
