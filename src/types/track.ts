import type { Gate } from './gate';

export interface Track {
  id: string;
  name: string;
  gates: Gate[];
  fieldSize: { width: number; height: number };
  gateSize: 0.75 | 1 | 1.5;
  createdAt: string;
  updatedAt: string;
}