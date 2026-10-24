import type { MomentCard } from "./model";

/**
 * Labelled demo fixtures for UI work without a running backend (NEXT_PUBLIC_DEMO_FIXTURES=1).
 * Fictional people and photos from Mootz.pen; images live in the gitignored public/demo/.
 * Coordinates are illustrative points around UGM campus, not anyone's location.
 */
const img = (n: string) => `/demo/generated${n}.jpg`;

export const demoMoments: MomentCard[] = [
  {
    id: "00000000-0000-4000-8000-0000000000f1",
    authorId: "demo-faaid",
    source: "capture",
    own: true,
    eventId: null,
    author: { name: "You", avatarSrc: img("-4"), frame: "lilac" },
    postedLabel: "Just now · Demo moment N",
    // Today, so the Meet entry shows for the viewer's own demo moment.
    publishedAt: new Date().toISOString(),
    backSrc: img("-1"),
    frontSrc: img("-4"),
    caption: "Coffee before the next session.",
    place: null,
    location: null,
    commentCount: 0,
    dot: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000000a",
    authorId: "demo-a",
    source: "capture",
    own: false,
    eventId: "00000000-0000-4000-8000-0000000000e1",
    author: { name: "@demo_a", avatarSrc: img("-2"), frame: "lilac" },
    postedLabel: "12m ago · Demo moment",
    publishedAt: null,
    backSrc: img("-6"),
    frontSrc: img("-2"),
    caption: "Coffee before the next session.",
    place: "UGM campus",
    location: { latitude: -7.7713, longitude: 110.3775 },
    commentCount: 3,
    dot: { label: "@demo_a & @demo_b were here", savedOnchain: true },
  },
  {
    id: "00000000-0000-4000-8000-00000000000b",
    authorId: "demo-b",
    source: "capture",
    own: false,
    eventId: null,
    author: { name: "@demo_b", avatarSrc: img("-3"), frame: "lilac" },
    postedLabel: "35m ago · Demo moment",
    publishedAt: null,
    backSrc: img("-7"),
    frontSrc: img("-3"),
    caption: "Between classes.",
    place: "Campus green",
    location: { latitude: -7.7687, longitude: 110.3792 },
    commentCount: 1,
    dot: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000000c",
    authorId: "demo-c",
    source: "capture",
    own: false,
    eventId: null,
    author: { name: "@demo_c", avatarSrc: img("-5"), frame: "lilac" },
    postedLabel: "1h ago · Demo moment",
    publishedAt: null,
    backSrc: img("-8"),
    frontSrc: img("-5"),
    caption: "Campus stroll.",
    place: "Campus road",
    location: { latitude: -7.7741, longitude: 110.3751 },
    commentCount: 0,
    dot: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000000d",
    authorId: "demo-d",
    source: "upload",
    own: false,
    eventId: null,
    author: { name: "@demo_d", avatarSrc: img("-1"), frame: "lilac" },
    postedLabel: "3h ago · Demo moment",
    publishedAt: null,
    backSrc: img(""),
    frontSrc: img("-1"),
    caption: null,
    place: null,
    location: null,
    commentCount: 0,
    dot: null,
  },
];

export const demoViewer = { username: "faaid", avatarSrc: img("-4") };
