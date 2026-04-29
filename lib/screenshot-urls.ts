import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SCREENSHOT_BUCKET = 'journal-screenshots';

const SIGNED_URL_TTL_SECONDS = 60 * 10;

function getScreenshotStoragePath(url: string) {
  const marker = `/${SCREENSHOT_BUCKET}/`;
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const pathStart = markerIndex + marker.length;
  const rawPath = url.slice(pathStart).split(/[?#]/)[0] ?? '';

  if (!rawPath) {
    return null;
  }

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

export function isJournalScreenshotUrl(url: string) {
  return getScreenshotStoragePath(url) !== null;
}

export function useSignedScreenshotUrls(
  supabase: SupabaseClient | null,
  urls: string[],
) {
  const urlsKey = urls.join('\n');
  const normalizedUrls = useMemo(
    () => urls.map((url) => url.trim()).filter(Boolean),
    // Keep effects stable when callers pass inline [] fallbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urlsKey],
  );
  const [signedUrls, setSignedUrls] = useState(normalizedUrls);

  useEffect(() => {
    let ignore = false;

    async function signUrls() {
      if (!supabase) {
        setSignedUrls(normalizedUrls);
        return;
      }

      const nextUrls = await Promise.all(
        normalizedUrls.map(async (url) => {
          const path = getScreenshotStoragePath(url);

          if (!path) {
            return url;
          }

          const { data, error } = await supabase.storage
            .from(SCREENSHOT_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

          return error || !data?.signedUrl ? url : data.signedUrl;
        }),
      );

      if (!ignore) {
        setSignedUrls(nextUrls);
      }
    }

    void signUrls();

    return () => {
      ignore = true;
    };
  }, [normalizedUrls, supabase]);

  return signedUrls;
}
