/**
 * Displays a photo from either a file path (native) or base64 data URL (web)
 * Automatically loads file content when given a file:// path
 */
import { useState, useEffect } from 'react';
import { getPhotoUrl } from '@/utils/photoStorage';

interface PhotoImageProps {
  photoRef: string;
  alt: string;
  className?: string;
  onError?: () => void;
}

export default function PhotoImage({ photoRef, alt, className = '', onError }: PhotoImageProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!photoRef) {
      setSrc('');
      setLoading(false);
      return;
    }

    // Direct data URL
    if (photoRef.startsWith('data:')) {
      setSrc(photoRef);
      setLoading(false);
      return;
    }

    // File path - load it
    getPhotoUrl(photoRef).then((url) => {
      if (!cancelled) {
        setSrc(url);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSrc('');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [photoRef]);

  if (loading) {
    return (
      <div className={`bg-[#111D2E] animate-pulse rounded-xl ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`bg-[#111D2E] rounded-xl flex items-center justify-center ${className}`}>
        <span className="text-[#8A94A6] text-xs">No image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setSrc('');
        onError?.();
      }}
    />
  );
}
