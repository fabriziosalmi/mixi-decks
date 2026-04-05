# Getting Started

Mixi Decks is a collection of esoteric, generative, and strictly typed plugins designed for the **MIXI** audio platform.

## Integration

Each Deck is totally self-contained. To integrate a deck:

1. Download the ZIP file for the deck you want from the [GitHub Releases](https://github.com/fabriziosalmi/mixi-decks/releases) page.
2. Unzip it and drop the folder into `src/decks/` of your Mixi Web Application.
3. If the plugin has an attached `<plugin>-wasm` folder (like `Turbo303` or `TurboFM`), drop that folder alongside it.
4. Open `src/decks/index.ts` in your MIXI project and register the Deck:

```typescript
import { lazy } from 'react';

export const HOUSE_DECKS = [
  // ... other decks
  {
    mode: 'turbo-pulsar',
    label: 'TURBO PULSAR',
    accentColor: '#ff00ff',
    component: lazy(() =>
      import('./TurboPulsar/TurboPulsarDeck').then((m) => ({ default: m.TurboPulsarDeck })),
    ),
  }
];
```

5. The plugin is now fully integrated into the master web audio graph.
