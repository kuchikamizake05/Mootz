export const MEET_LOCATION_POLICY = Object.freeze({
  version: 'meet-location-v1',
  earthRadiusMeters: 6371008.8,
  maximumDistanceMeters: 100,
  maximumAccuracyMeters: 50,
  maximumAgeMs: 15000,
  futureToleranceMs: 5000,
  nominalAreaMeters: 200,
  serverDayTimeZone: 'Asia/Jakarta',
});

export interface MeetLocationSample {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAtMs: number;
}

export type MeetLocationErrorCode = 'INVALID_LOCATION' | 'LOCATION_ACCURACY' | 'LOCATION_STALE' | 'MEET_DISTANCE';

export class MeetLocationError extends Error {
  constructor(public readonly code: MeetLocationErrorCode) {
    super(code);
    this.name = 'MeetLocationError';
  }
}

const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (angle: number) => angle * 180 / Math.PI;
const normalizeLongitude = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;

function validateSample(sample: MeetLocationSample, acceptedAtMs: number): void {
  if (!sample || !Number.isFinite(sample.latitude) || !Number.isFinite(sample.longitude)
    || Math.abs(sample.latitude) > 90 || Math.abs(sample.longitude) > 180
    || !Number.isFinite(sample.accuracyMeters) || !Number.isSafeInteger(sample.capturedAtMs)) {
    throw new MeetLocationError('INVALID_LOCATION');
  }
  if (sample.accuracyMeters <= 0 || sample.accuracyMeters > MEET_LOCATION_POLICY.maximumAccuracyMeters) {
    throw new MeetLocationError('LOCATION_ACCURACY');
  }
  const age = acceptedAtMs - sample.capturedAtMs;
  if (age < -MEET_LOCATION_POLICY.futureToleranceMs || age > MEET_LOCATION_POLICY.maximumAgeMs) {
    throw new MeetLocationError('LOCATION_STALE');
  }
}

function midpoint(a: MeetLocationSample, b: MeetLocationSample): [number, number] {
  const vector = (point: MeetLocationSample) => {
    const latitude = radians(point.latitude);
    const longitude = radians(normalizeLongitude(point.longitude));
    return [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)] as const;
  };
  const av = vector(a);
  const bv = vector(b);
  const x = av[0] + bv[0];
  const y = av[1] + bv[1];
  const z = av[2] + bv[2];
  return [degrees(Math.atan2(z, Math.hypot(x, y))), normalizeLongitude(degrees(Math.atan2(y, x)))];
}

function areaKey(latitude: number, longitude: number): string {
  const rows = Math.ceil(Math.PI * MEET_LOCATION_POLICY.earthRadiusMeters / MEET_LOCATION_POLICY.nominalAreaMeters);
  const row = Math.min(rows - 1, Math.max(0, Math.floor((latitude + 90) / 180 * rows)));
  const center = -90 + (row + 0.5) * 180 / rows;
  const columns = Math.max(1, Math.ceil(2 * Math.PI * MEET_LOCATION_POLICY.earthRadiusMeters * Math.cos(radians(center)) / MEET_LOCATION_POLICY.nominalAreaMeters));
  const column = Math.abs(latitude) === 90 ? 0 : Math.min(columns - 1, Math.max(0, Math.floor((normalizeLongitude(longitude) + 180) / 360 * columns)));
  return `meet-area-v1:${row}:${column}`;
}

export function meetAreaCenter(key:string):{latitude:number;longitude:number}{
  const match=/^meet-area-v1:(\d+):(\d+)$/.exec(key);if(!match)throw new MeetLocationError('INVALID_LOCATION');
  const row=Number(match[1]),column=Number(match[2]);
  const rows=Math.ceil(Math.PI*MEET_LOCATION_POLICY.earthRadiusMeters/MEET_LOCATION_POLICY.nominalAreaMeters);
  if(!Number.isSafeInteger(row)||row<0||row>=rows)throw new MeetLocationError('INVALID_LOCATION');
  const latitude=-90+(row+.5)*180/rows;
  const columns=Math.max(1,Math.ceil(2*Math.PI*MEET_LOCATION_POLICY.earthRadiusMeters*Math.cos(radians(latitude))/MEET_LOCATION_POLICY.nominalAreaMeters));
  if(!Number.isSafeInteger(column)||column<0||column>=columns)throw new MeetLocationError('INVALID_LOCATION');
  return{latitude,longitude:-180+(column+.5)*360/columns};
}

/** Evaluates foreground samples only. The returned grid is a pair-rate-limit key, not proof of presence or a display circle. */
export function assessMeetLocation(poster: MeetLocationSample, scanner: MeetLocationSample, acceptedAtMs: number): {
  distanceMeters: number;
  areaKey: string;
  serverDay: string;
} {
  if (!Number.isSafeInteger(acceptedAtMs) || !Number.isFinite(new Date(acceptedAtMs).getTime())) throw new MeetLocationError('INVALID_LOCATION');
  validateSample(poster, acceptedAtMs);
  validateSample(scanner, acceptedAtMs);
  const deltaLatitude = radians(scanner.latitude - poster.latitude);
  // Haversine is periodic; avoiding modulo here preserves precision and participant symmetry.
  const deltaLongitude = radians(scanner.longitude - poster.longitude);
  const haversine = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(poster.latitude)) * Math.cos(radians(scanner.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  const distanceMeters = 2 * MEET_LOCATION_POLICY.earthRadiusMeters * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
  if (distanceMeters > MEET_LOCATION_POLICY.maximumDistanceMeters) throw new MeetLocationError('MEET_DISTANCE');
  const [latitude, longitude] = midpoint(poster, scanner);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MEET_LOCATION_POLICY.serverDayTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(acceptedAtMs));
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return { distanceMeters, areaKey: areaKey(latitude, longitude), serverDay: `${part('year')}-${part('month')}-${part('day')}` };
}
