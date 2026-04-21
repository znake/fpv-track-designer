export type GateType = 'standard' | 'h-gate' | 'huerdel' | 'doppelgate' | 'ladder' | 'start-finish' | 'flag';

export interface Gate {
  id: string;
  type: GateType;
  position: { x: number; y: number; z: number };
  rotation: number; // 0-330 in 30deg steps
  size: 0.75 | 1 | 1.5;
}