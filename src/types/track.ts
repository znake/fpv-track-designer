import type { Gate } from './gate';

export interface GateSequenceItem {
  gateId: string;
  openingId: string;
  reverse?: boolean;
}

export interface Track {
  id: string;
  name: string;
  gates: Gate[];
  gateSequence: GateSequenceItem[];
  fieldSize: { width: number; height: number };
  gateSize: 0.75 | 1 | 1.5;
  createdAt: string;
  updatedAt: string;
}
