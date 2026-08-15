import { FuelLog } from '@/types/modules';

export type DateFilterOption = '7D' | '30D' | '6M' | '1Y' | 'ALL';

export interface MilestoneItem {
  id: string;
  odometer: number;
  label: string;
  sublabel: string;
  t: number; // Normalized position 0..1 along road path
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface PathPointWithTangent {
  point: Vector2D;
  angleDeg: number;
}

/**
 * Filters logs according to selected date range option
 */
export function filterLogsByDate(logs: FuelLog[], filter: DateFilterOption): FuelLog[] {
  if (filter === 'ALL' || !logs.length) return logs;

  const now = new Date();
  let cutoff = new Date();

  switch (filter) {
    case '7D':
      cutoff.setDate(now.getDate() - 7);
      break;
    case '30D':
      cutoff.setDate(now.getDate() - 30);
      break;
    case '6M':
      cutoff.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      cutoff.setFullYear(now.getFullYear() - 1);
      break;
  }

  const cutoffTime = cutoff.getTime();
  return logs.filter(l => new Date(l.date).getTime() >= cutoffTime);
}

/**
 * Calculates normalized t (0..1) along the roadway for each odometer value.
 * Handles edge cases safely (0 logs, 1 log, identical odometers, large gaps).
 */
export function calculateNormalizedProgress(
  odometer: number,
  minOdo: number,
  maxOdo: number
): number {
  if (!isFinite(odometer) || !isFinite(minOdo) || !isFinite(maxOdo)) return 0;
  const range = maxOdo - minOdo;
  if (range <= 0) return 0.5; // Center single log or equal odometers

  const t = (odometer - minOdo) / range;
  // Clamp between 0 and 1 safely
  return Math.max(0, Math.min(1, t));
}

/**
 * Generates dynamic milestone roadside signs based on actual vehicle odometer range.
 * E.g. 5,000 km, 10,000 km, 15,000 km, etc.
 */
export function generateDynamicMilestones(
  sortedLogsAsc: FuelLog[]
): MilestoneItem[] {
  if (sortedLogsAsc.length < 2) return [];

  const minOdo = sortedLogsAsc[0].odometer;
  const maxOdo = sortedLogsAsc[sortedLogsAsc.length - 1].odometer;
  const range = maxOdo - minOdo;

  if (range <= 0) return [];

  // Determine appropriate step size based on range
  let step = 1000;
  if (range > 50000) step = 10000;
  else if (range > 20000) step = 5000;
  else if (range > 5000) step = 2500;
  else if (range > 2000) step = 1000;
  else step = 500;

  const startOdo = Math.ceil(minOdo / step) * step;
  const milestones: MilestoneItem[] = [];

  for (let odo = startOdo; odo < maxOdo; odo += step) {
    if (odo > minOdo && odo < maxOdo) {
      const t = calculateNormalizedProgress(odo, minOdo, maxOdo);
      milestones.push({
        id: `milestone-${odo}`,
        odometer: odo,
        label: `${odo.toLocaleString()} KM`,
        sublabel: 'Odometer Milestone',
        t,
      });
    }
  }

  return milestones;
}

/**
 * Bezier Curve Mathematics:
 * Evaluates cubic Bezier point for parametric t in [0, 1]
 * P(t) = (1-t)^3 * P0 + 3*(1-t)^2*t * P1 + 3*(1-t)*t^2 * P2 + t^3 * P3
 */
export function getCubicBezierPoint(
  p0: Vector2D,
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  t: number
): Vector2D {
  const clampedT = Math.max(0, Math.min(1, t));
  const u = 1 - clampedT;
  const tt = clampedT * clampedT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * clampedT;

  const x = uuu * p0.x + 3 * uu * clampedT * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * clampedT * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  return { x, y };
}

/**
 * Calculates derivative / tangent vector for Cubic Bezier at parametric t
 * P'(t) = 3*(1-t)^2*(P1-P0) + 6*(1-t)*t*(P2-P1) + 3*t^2*(P3-P2)
 */
export function getCubicBezierTangent(
  p0: Vector2D,
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  t: number
): PathPointWithTangent {
  const clampedT = Math.max(0, Math.min(1, t));
  const point = getCubicBezierPoint(p0, p1, p2, p3, clampedT);

  const u = 1 - clampedT;
  const dx =
    3 * u * u * (p1.x - p0.x) +
    6 * u * clampedT * (p2.x - p1.x) +
    3 * clampedT * clampedT * (p3.x - p2.x);
  const dy =
    3 * u * u * (p1.y - p0.y) +
    6 * u * clampedT * (p2.y - p1.y) +
    3 * clampedT * clampedT * (p3.y - p2.y);

  // Convert tangent vector to angle in degrees (screen space y-down)
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;

  return { point, angleDeg };
}

/**
 * Road Path Definition in ViewBox coordinates (0..400 x 0..1000)
 * Road winds from bottom (t=0 -> y=920) to top (t=1 -> y=80)
 */
export const ROAD_CONTROL_POINTS = {
  p0: { x: 200, y: 920 }, // Bottom center
  p1: { x: 80,  y: 650 }, // Curve left
  p2: { x: 320, y: 350 }, // Curve right
  p3: { x: 200, y: 80 },  // Top center
};

/**
 * Helper to get point and orientation angle along the default road curve
 */
export function getRoadPointAtProgress(t: number): PathPointWithTangent {
  return getCubicBezierTangent(
    ROAD_CONTROL_POINTS.p0,
    ROAD_CONTROL_POINTS.p1,
    ROAD_CONTROL_POINTS.p2,
    ROAD_CONTROL_POINTS.p3,
    t
  );
}
