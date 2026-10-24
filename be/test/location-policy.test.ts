import { describe, expect, it } from 'vitest';
import { assessMeetLocation, MEET_LOCATION_POLICY } from '../src/meet/location-policy.ts';

const now = Date.parse('2026-10-23T17:00:00Z');
const sample = (latitude = 0, longitude = 0) => ({ latitude, longitude, accuracyMeters: 50, capturedAtMs: now });
const longitudeAtMeters = (meters: number) => meters / 6371008.8 * 180 / Math.PI;

describe('foreground Meet location policy v1', () => {
  it('accepts the inclusive 100 m boundary without rounding distance', () => {
    const result = assessMeetLocation(sample(), sample(0, longitudeAtMeters(100)), now);
    expect(result.distanceMeters).toBeCloseTo(100, 10);
    expect(() => assessMeetLocation(sample(), sample(0, longitudeAtMeters(100.00001)), now)).toThrow(expect.objectContaining({ code: 'MEET_DISTANCE' }));
    expect(MEET_LOCATION_POLICY.version).toBe('meet-location-v1');
  });

  it('enforces both accuracy limits', () => {
    expect(assessMeetLocation(sample(), sample(), now).distanceMeters).toBe(0);
    for (const accuracyMeters of [0, -1, 50.001]) {
      for (const reverse of [false, true]) {
        const invalid = { ...sample(), accuracyMeters };
        expect(() => assessMeetLocation(reverse ? sample() : invalid, reverse ? invalid : sample(), now)).toThrow(expect.objectContaining({ code: 'LOCATION_ACCURACY' }));
      }
    }
  });

  it('enforces inclusive freshness and future clock tolerance', () => {
    for (const age of [15000, -5000]) expect(assessMeetLocation({ ...sample(), capturedAtMs: now - age }, sample(), now).distanceMeters).toBe(0);
    for (const age of [15001, -5001]) expect(() => assessMeetLocation(sample(), { ...sample(), capturedAtMs: now - age }, now)).toThrow(expect.objectContaining({ code: 'LOCATION_STALE' }));
  });

  it('rejects malformed coordinates, accuracy and timestamps', () => {
    for (const patch of [{ latitude: NaN }, { latitude: 90.01 }, { longitude: Infinity }, { longitude: -180.01 }, { accuracyMeters: NaN }, { capturedAtMs: 1.5 }]) {
      expect(() => assessMeetLocation({ ...sample(), ...patch }, sample(), now)).toThrow(expect.objectContaining({ code: 'INVALID_LOCATION' }));
    }
    expect(() => assessMeetLocation(sample(), sample(), NaN)).toThrow(expect.objectContaining({ code: 'INVALID_LOCATION' }));
  });

  it('uses the spherical midpoint across the dateline and is participant symmetric', () => {
    const a = sample(0, 179.9999);
    const b = sample(0, -179.9999);
    const result = assessMeetLocation(a, b, now);
    expect(result).toEqual(assessMeetLocation(b, a, now));
    expect(result.distanceMeters).toBeLessThan(100);
    expect(result.areaKey).toMatch(/^meet-area-v1:\d+:0$/);
    expect(result.serverDay).toBe('2026-10-24');
    expect(Object.keys(result).sort()).toEqual(['areaKey', 'distanceMeters', 'serverDay']);
  });

  it('handles poles, equivalent dateline endpoints and rejects antipodes', () => {
    expect(assessMeetLocation(sample(90, 0), sample(90, 0), now).areaKey).toBe(assessMeetLocation(sample(90, 180), sample(90, 180), now).areaKey);
    expect(assessMeetLocation(sample(90, 180), sample(90, -180), now).areaKey).toMatch(/^meet-area-v1:\d+:0$/);
    expect(assessMeetLocation(sample(-90, 0), sample(-90, 0), now).areaKey).toMatch(/^meet-area-v1:0:\d+$/);
    expect(assessMeetLocation(sample(0, 180), sample(0, 180), now).areaKey).toEqual(assessMeetLocation(sample(0, -180), sample(0, -180), now).areaKey);
    expect(() => assessMeetLocation(sample(), sample(0, 180), now)).toThrow(expect.objectContaining({ code: 'MEET_DISTANCE' }));
  });
});
