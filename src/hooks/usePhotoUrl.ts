/**
 * Hook to convert photo references (file paths or base64) to displayable URLs
 */
import { useState, useEffect } from 'react';
import { getPhotoUrl } from '@/utils/photoStorage';

export function usePhotoUrl(photoRef: string | undefined): string {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (!photoRef) {
      setUrl('');
      return;
    }

    // If it's already a data URL, use it directly
    if (photoRef.startsWith('data:')) {
      setUrl(photoRef);
      return;
    }

    // If it's a file path, load it
    let cancelled = false;
    getPhotoUrl(photoRef).then((resolvedUrl) => {
      if (!cancelled) setUrl(resolvedUrl);
    });

    return () => { cancelled = true; };
  }, [photoRef]);

  return url;
}
