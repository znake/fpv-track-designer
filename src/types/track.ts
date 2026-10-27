import type { Gate } from './gate';

export interface GateSequenceItem {
  gateId: string;
  openingId: string;
  reverse?: boolean;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface IdealLineVisitRef {
  gateId: string;
  openingId: string;
}

/** A leg identity between two visits; reverse is deliberately excluded. */
export interface IdealLineLegRef {
  from: IdealLineVisitRef;
  to: IdealLineVisitRef;
}

export interface IdealLinePoint {
  id: string;
  leg: IdealLineLegRef;
  /** Base-leg arc fraction captured at insertion; never re-derived after dragging. */
  u: number;
  /** World-space point through which the displayed curve passes. */
  position: Point3;
}

export interface Track {
  id: string;
  name: string;
  gates: Gate[];
  gateSequence: GateSequenceItem[];
  fieldSize: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
  /** Custom control points that shape individual ideal-line legs. */
  idealLinePoints?: IdealLinePoint[];
}
