export type GateType = 'standard' | 'h-gate' | 'asymmetric' | 'dive' | 'double' | 'ladder' | 'start-finish' | 'flag';

export interface Gate {
  id: string;
  type: GateType;
  position: { x: number; y: number; z: number };
  rotation: number; // degrees, continuous (0-359)
  size: 0.75 | 1 | 1.5;
}