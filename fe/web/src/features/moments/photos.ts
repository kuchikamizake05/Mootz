export async function loadMomentPhotos(
  api: <T>(path: string, init?: RequestInit) => Promise<T>,
  momentId: string,
  signal?: AbortSignal,
) {
  const [back, front] = await Promise.all(
    (["back", "front"] as const).map((side) =>
      api<{ url: string; expiresIn: number }>(`/v1/moments/${encodeURIComponent(momentId)}/media/${side}`, { signal }),
    ),
  );
  return { back: back.url, front: front.url };
}
