/*
 * Fixtures for NEXT_PUBLIC_DEMO_FIXTURES=1 only. Nothing here is a real offer, signature
 * or person, and real code paths never import it for data.
 */

/** Deliberately not a Mootz Meet QR: scanners reject it. */
export const demoQrText = "Mootz demo QR - not scannable";

export const demoPhotos = { back: "/demo/generated-6.jpg", front: "/demo/generated-2.jpg" } as const;
export const demoCaption = "Coffee before the next session.";

/** Demo poster for the Meet preview and result. */
export const demoPartnerUsername = "demo_a";
