import type { Gate } from './gate';

export interface Track {
  id: string;
  name: string;
  gates: Gate[];
  gateSequence: string[];  // Ordered gate IDs defining fly-through order (can repeat, no consecutive duplicates)
  fieldSize: { width: number; height: number };
  gateSize: 0.75 | 1 | 1.5;
  createdAt: string;
  updatedAt: string;
}