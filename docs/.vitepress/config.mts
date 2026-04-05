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
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fabriziosalmi/mixi-decks' }
    ]
  }
})
