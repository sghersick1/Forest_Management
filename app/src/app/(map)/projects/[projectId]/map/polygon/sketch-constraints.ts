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
