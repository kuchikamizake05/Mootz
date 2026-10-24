export const MAX_SIDE = 2048;
export const MAX_BYTES = 8 * 1024 * 1024;

export type Shot = { blob: Blob; url: string };

type Drawable = { source: CanvasImageSource; width: number; height: number; close?: () => void };

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Scales the longest side to MAX_SIDE and encodes JPEG, lowering quality until under 8 MiB. */
async function encode({ source, width, height }: Drawable): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.9, 0.75, 0.6, 0.45]) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("IMAGE_TOO_LARGE");
}

/** Frame is drawn unmirrored; only the on-screen selfie preview is flipped. */
export function shotFromVideo(video: HTMLVideoElement) {
  return encode({ source: video, width: video.videoWidth, height: video.videoHeight });
}

export async function shotFromFile(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return await encode({ source: bitmap, width: bitmap.width, height: bitmap.height });
  } finally {
    bitmap.close();
  }
}

export function makeShot(blob: Blob): Shot {
  return { blob, url: URL.createObjectURL(blob) };
}
