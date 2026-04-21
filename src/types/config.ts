import type { GateType } from './gate';

export interface Config {
  gateQuantities: Record<GateType, number>;
  fieldSize: { width: number; height: number };
  gateSize: 0.75 | 1 | 1.5;
}