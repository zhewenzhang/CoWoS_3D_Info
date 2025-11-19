export interface LayerProps {
  exploded: number; // 0 to 1, determines the vertical separation
  opacity: number;
  showLabels: boolean;
  showThermal: boolean;
}

export interface HighlightState {
  substrate: boolean;
  interposer: boolean;
  logic: boolean;
  hbm: boolean;
  bumps: boolean;
}

export enum ComponentType {
  SUBSTRATE = 'Substrate (ABF)',
  INTERPOSER = 'Silicon Interposer',
  LOGIC = 'Logic Die (SoC)',
  HBM = 'HBM (Memory)',
  BUMPS = 'Interconnects (C4/Micro Bumps)'
}
