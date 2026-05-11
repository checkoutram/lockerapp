/**
 * Displays a photo from either a file path (native) or base64 data URL (web)
 * Automatically loads file content when given a file:// path
 */
import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
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
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    if (!photoRef) {
      setSrc('');
      setLoading(false);
      setError(true);
      return;
    }

    // Direct data URL
    if (photoRef.startsWith('data:')) {
      setSrc(photoRef);
      setLoading(false);
      return;
    }

    // File path - load it asynchronously
    getPhotoUrl(photoRef)
      .then((url) => {
        if (cancelled) return;
        if (url && url.length > 0) {
          setSrc(url);
          setError(false);
        } else {
          setSrc('');
          setError(true);
          onError?.();
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[PhotoImage] Failed to load:', photoRef, err);
        setSrc('');
        setError(true);
        setLoading(false);
        onError?.();
      });

    return () => { cancelled = true; };
  }, [photoRef]);

  if (loading) {
    return (
      <div className={`bg-[#111D2E] rounded-xl flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`bg-[#111D2E] rounded-xl flex flex-col items-center justify-center gap-1 ${className}`}>
        <ImageIcon className="w-6 h-6 text-[#8A94A6]/30" />
        <span className="text-[10px] text-[#8A94A6]/40">No image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        console.error('[PhotoImage] img onError:', photoRef.substring(0, 50));
        setSrc('');
        setError(true);
        onError?.();
      }}
    />
  );
}
