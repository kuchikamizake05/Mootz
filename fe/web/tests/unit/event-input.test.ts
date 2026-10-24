import { describe, expect, it } from "vitest";
import { eventInput } from "../../src/features/organizer/event-input";

const requestId = "00000000-0000-4000-8000-000000000001";
const draft = { title: " Workshop ", description: " Friends ", locationLabel: " Jogja ", startsAt: "2026-10-24T08:00:00+07:00", endsAt: "2026-10-24T10:00:00+07:00" };
const now = Date.parse("2026-10-24T02:00:00Z");
describe("organizer event input", () => {
  it("normalizes times and trims public details while preserving retry identity", () => {
    expect(eventInput(draft, requestId, now)).toEqual({ clientRequestId: requestId, title: "Workshop", description: "Friends", locationLabel: "Jogja", startsAt: "2026-10-24T01:00:00.000Z", endsAt: "2026-10-24T03:00:00.000Z" });
    expect(eventInput({ ...draft, locationLabel: " " }, requestId, now).locationLabel).toBeNull();
  });
  it.each([{ title: " " }, { startsAt: "invalid" }, { endsAt: "2026-10-24T01:00:00Z" }, { endsAt: "2026-10-24T02:00:00Z" }, { title: "x".repeat(201) }, { description: "x".repeat(10001) }, { locationLabel: "x".repeat(201) }])("rejects invalid or expired form values %j", extra => {
    expect(() => eventInput({ ...draft, ...extra }, requestId, now)).toThrow();
  });
});
