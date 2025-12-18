export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface GarmentDetails {
  box: BoundingBox;
  textureBox: BoundingBox;
  texture: string;
  color: string;
}

export interface CropRect {
  x: number;
  y: number;
  size: number;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  CROPPING = 'CROPPING',
  EDITING = 'EDITING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
