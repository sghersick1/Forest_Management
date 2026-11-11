/*
 * Measurements and right-angle snap for a polygon ring.
 * Feet, bearing, and acres feed the sketch tooltip.
 */

import area from "@turf/area";
import bearing from "@turf/bearing";
import destination from "@turf/destination";
import { convertArea, lineString, polygon } from "@turf/helpers";
import length from "@turf/length";

export type LngLat = [number, number];

const feetPerKilometer = 3280.839895;

// Degrees wrapped into 0..360.
export function normalizeBearing(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

// Signed turn from the previous bearing to the next, in -180..180.
export function deflectionDegrees(
  previousBearing: number,
  nextBearing: number,
): number {
  let turn = normalizeBearing(nextBearing) - normalizeBearing(previousBearing);
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;
  return turn;
}

// The point reached by traveling the given feet on a bearing.
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

// Geodesic length of a segment in feet.
export function segmentFeet(from: LngLat, to: LngLat): number {
  return length(lineString([from, to]), { units: "kilometers" }) * feetPerKilometer;
}

// Forward bearing from one point to the next, in 0..360.
export function bearingDegrees(from: LngLat, to: LngLat): number {
  return normalizeBearing(bearing(from, to));
}

// Area of a ring in acres. Fewer than three vertices is zero.
export function ringAcres(vertices: LngLat[]): number {
  if (vertices.length < 3) return 0;
  const closed = [...vertices, vertices[0]];
  return convertArea(area(polygon([closed])), "meters", "acres");
}

// A ring can close only after three committed vertices.
export function canClosePolygon(committedVertices: number): boolean {
  return committedVertices >= 3;
}

export const rightAngleTolerance = 3;

export type ScreenPoint = { x: number; y: number };

// The cursor snapped to straight or a right angle, or null outside the tolerance.
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

// Degrees wrapped into -180..180.
function signedDegrees(degrees: number): number {
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

// One decimal under 100 ft, whole feet from 100 ft up.
export function formatFeet(feet: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: feet < 100 ? 1 : 0,
  }).format(feet)} ft`;
}

// Acres with two decimal places.
export function formatAcres(acres: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(acres)} ac`;
}

// Bearing with one decimal and a degree sign.
export function formatDirection(degrees: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(degrees)}°`;
}
