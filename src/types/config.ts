import type { GateType } from './gate';
import type { ThemeId } from './theme';

export interface Config {
  gateQuantities: Record<GateType, number>;
  fieldSize: { width: number; height: number };
  snapGatesToGrid: boolean;
  showGrid: boolean;
  showFlightPath: boolean;
  showOpeningLabels: boolean;
  theme: ThemeId;
}
