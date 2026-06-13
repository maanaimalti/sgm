import { api } from "@/services/api";

export const GetPushPublicKeyFetcher = async (): Promise<string | null> => {
  // Prefer the build-time key; fall back to the API at runtime.
  const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  try {
    const response = await api.get<{ publicKey: string | null }>(
      "/push/public-key",
    );
    return response.data.publicKey ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
