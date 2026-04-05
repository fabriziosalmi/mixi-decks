export type FxKnobId = 'drywet';

export interface TurboTickerSnapshot {
  isActive: boolean;
  price: number;
  trend: 'up' | 'down' | 'flat';
  speedMultiplier: number;
  masterVolume: number;
}

export function defaultFx(): Record<FxKnobId, number> {
  return { drywet: 1.0 };
}
