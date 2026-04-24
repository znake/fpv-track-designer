export type GateType = 'standard' | 'h-gate' | 'asymmetric' | 'dive' | 'double' | 'ladder' | 'start-finish' | 'flag';

export type GateSize = 0.75 | 1 | 1.5;

export interface GateOpening {
  id: string;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  rotation: number;
}

export interface Gate {
  id: string;
  type: GateType;
  position: { x: number; y: number; z: number };
  rotation: number; // degrees, continuous (0-359)
  size: GateSize;
  openings: GateOpening[];
}
