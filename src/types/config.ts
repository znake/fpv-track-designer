import type { GateType } from './gate';

export interface Config {
  gateQuantities: Record<GateType, number>;
  fieldSize: { width: number; height: number };
  snapGatesToGrid: boolean;
  showGrid: boolean;
  showFlightPath: boolean;
  showOpeningLabels: boolean;
}
