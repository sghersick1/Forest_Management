import area from "@turf/area";
import bearing from "@turf/bearing";
import destination from "@turf/destination";
import { convertArea, lineString, polygon } from "@turf/helpers";
import length from "@turf/length";

export type LngLat = [number, number];

const feetPerKilometer = 3280.839895;

export function normalizeBearing(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function deflectionDegrees(
  previousBearing: number,
  nextBearing: number,
): number {
  let turn = normalizeBearing(nextBearing) - normalizeBearing(previousBearing);
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;
  return turn;
}

export function destinationFeet(
  origin: LngLat,
  bearingDegrees: number,
  feet: number,
): LngLat {
  const point = destination(origin, feet / feetPerKilometer, bearingDegrees, {
    units: "kilometers",
  });
  const [lng, lat] = point.geometry.coordinates;
  return [lng, lat];
}

export function segmentFeet(from: LngLat, to: LngLat): number {
  return length(lineString([from, to]), { units: "kilometers" }) * feetPerKilometer;
}

export function bearingDegrees(from: LngLat, to: LngLat): number {
  return normalizeBearing(bearing(from, to));
}

export function ringAcres(vertices: LngLat[]): number {
  if (vertices.length < 3) return 0;
  const closed = [...vertices, vertices[0]];
  return convertArea(area(polygon([closed])), "meters", "acres");
}

export function canClosePolygon(committedVertices: number): boolean {
  return committedVertices >= 3;
}

export const rightAngleTolerance = 3;

export type ScreenPoint = { x: number; y: number };

export function snapRightAngle(
  previous: ScreenPoint,
  origin: ScreenPoint,
  cursor: ScreenPoint,
  tolerance = rightAngleTolerance,
): ScreenPoint | null {
  const previousX = origin.x - previous.x;
  const previousY = origin.y - previous.y;
  const nextX = cursor.x - origin.x;
  const nextY = cursor.y - origin.y;
  const previousLength = Math.hypot(previousX, previousY);
  const nextLength = Math.hypot(nextX, nextY);
  if (previousLength < 1e-6 || nextLength < 1e-6) return null;

  const turn = signedDegrees(
    (Math.atan2(nextY, nextX) - Math.atan2(previousY, previousX)) * (180 / Math.PI),
  );
  const target = [0, 90, -90].find((candidate) => Math.abs(turn - candidate) <= tolerance);
  if (target === undefined) return null;

  const angle = Math.atan2(previousY, previousX) + (target * Math.PI) / 180;
  return {
    x: origin.x + Math.cos(angle) * nextLength,
    y: origin.y + Math.sin(angle) * nextLength,
  };
}

function signedDegrees(degrees: number): number {
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export function formatFeet(feet: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: feet < 100 ? 1 : 0,
  }).format(feet)} ft`;
}

export function formatAcres(acres: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(acres)} ac`;
}

export function formatDirection(degrees: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(degrees)}°`;
}
