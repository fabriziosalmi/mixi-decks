import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Mixi Decks",
  description: "Advanced Drop-In Plugins for Mixi",
  // The Pages artifact puts the deck ESM modules at the root and mounts these
  // docs under /docs/ (see "Merge deck builds + docs into single site" in
  // .github/workflows/build-publish.yml), so the base has to include /docs/.
  // Without it every asset and every internal link is emitted one level too
  // high and returns 404: the site was being served as unstyled HTML with no
  // working navigation.
  base: "/mixi-decks/docs/",
  head: [
    // Everything this site loads is first-party. 'unsafe-inline' is required
    // because VitePress emits an inline appearance script and inline styles.
    // Applied to the built site only: `vitepress dev` serves HMR over a
    // websocket, which a strict connect-src would block as soon as the dev
    // server is not same-origin (--host, or a custom server.hmr.port).
    ...(process.env.NODE_ENV === 'production'
      ? [
          [
            'meta',
            {
              'http-equiv': 'Content-Security-Policy',
              content:
                "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
                "font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'",
            },
          ] as [string, Record<string, string>],
        ]
      : []),
  ],
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
    ],
    footer: {
      message:
        '<a href="https://fabriziosalmi.github.io/privacy">Privacy &amp; legal</a>'
    }
  }
})
