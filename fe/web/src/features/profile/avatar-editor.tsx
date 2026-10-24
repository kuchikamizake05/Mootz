"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useApi, useProfile, type Profile } from "@/lib/api/use-api";
import { env } from "@/lib/env";

export function AvatarEditor() {
  const api = useApi();
  const profile = useProfile();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (file: File | null) => file
      ? api<{ avatarUrl: string | null }>("/v1/me/avatar", { method: "PUT", headers: { "content-type": file.type }, body: file })
      : api<void>("/v1/me/avatar", { method: "DELETE" }),
    onSuccess: response => {
      setError(null);
      client.setQueriesData<Profile>({ queryKey: ["me"] }, value => value && value.id === profile.data?.id ? { ...value, avatarUrl: response?.avatarUrl ?? null } : value);
      void client.invalidateQueries({ queryKey: ["me"] });
    },
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <input ref={input} type="file" accept="image/jpeg,image/png" aria-label="Choose profile avatar" className="sr-only" tabIndex={-1}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 8 * 1024 * 1024) {
            setError("Choose a JPEG or PNG image up to 8 MB.");
            return;
          }
          setError(null);
          mutation.mutate(file);
        }} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" disabled={env.demoFixtures || !profile.data || mutation.isPending} onClick={() => input.current?.click()}>
          {mutation.isPending ? "Saving avatar…" : "Change avatar"}
        </Button>
        {profile.data?.avatarUrl && <Button variant="secondary" disabled={mutation.isPending || env.demoFixtures} onClick={() => mutation.mutate(null)}>Remove avatar</Button>}
      </div>
      <p className="text-center text-xs text-mootz-muted">Your avatar appears on your shared location. JPEG or PNG, up to 8 MB.</p>
      {(error || mutation.isError) && <p role="alert" className="text-center text-sm text-mootz-ink">{error || "Could not save your avatar. Please retry."}</p>}
      {mutation.isSuccess && !error && <p role="status" className="text-xs text-mootz-deep">Avatar saved.</p>}
    </div>
  );
}
