import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Calendar, Scale, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getItems, deleteItem } from '@/utils/storage';
import type { LockerItem } from '@/types';
import { CATEGORY_COLORS, APP_NAME } from '@/types';

export default function ItemDetailScreen() {
  const { goBack, selectedItemId } = useApp();
  const [item, setItem] = useState<LockerItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadItem = useCallback(async () => {
    if (!selectedItemId) return;
    const items = await getItems();
    const found = items.find((i) => i.id === selectedItemId);
    if (found) setItem(found);
    setLoaded(true);
  }, [selectedItemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem(item.id);
    goBack();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0A1628]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0A1628]">
        <p className="text-[#8A94A6]">Item not found</p>
        <button onClick={goBack} className="mt-4 text-[#C9A84C] text-sm">Go Back</button>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[item.category] || '#95A5A6';
  const showWeight = item.category === 'Gold' || item.category === 'Silver' || item.category === 'Platinum' || item.category === 'Diamond';

  const weightDisplay = [
    item.weightAmount,
    item.weightUnit,
    item.pieceCount ? `${item.pieceCount} pcs` : '',
  ].filter(Boolean).join(' \u00B7 ');

  const displaySubType = item.subType === 'Other (jewellery)' || item.subType === 'Other (document)'
    ? item.subTypeCustom || item.subType
    : item.subType;

  const displayCategory = item.category === 'Other'
    ? item.categoryCustom || 'Other'
    : item.category;

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-3 border-b border-[#1A3A5C]/50">
        <button onClick={goBack} className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#8A94A6]" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-white pr-8 truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
          {item.name}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Photo Carousel */}
        {item.photos.length > 0 && (
          <div className="relative w-full aspect-square bg-[#0D1929]">
            <img src={item.photos[currentPhotoIndex]} alt={item.name} className="w-full h-full object-cover" />
            {item.photos.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {item.photos.map((_, i) => (
                    <button key={i} onClick={() => setCurrentPhotoIndex(i)}
                      className={`h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'w-6 bg-[#C9A84C]' : 'w-2 bg-white/40'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-xs text-white font-medium">{currentPhotoIndex + 1} / {item.photos.length}</span>
                </div>
                {currentPhotoIndex > 0 && (
                  <button onClick={() => setCurrentPhotoIndex((p) => p - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
                {currentPhotoIndex < item.photos.length - 1 && (
                  <button onClick={() => setCurrentPhotoIndex((p) => p + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60 rotate-180">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Item Info */}
        <div className="px-5 py-6">
          {/* Name */}
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {item.name}
          </h2>

          {/* Category Badge + Sub-type */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#0A1628]" style={{ backgroundColor: catColor }}>
              {displayCategory}
            </span>
            {displaySubType && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#111D2E] border border-[#1A3A5C] text-[#8A94A6]">
                {displaySubType}
              </span>
            )}
          </div>

          {/* Weight / Quantity */}
          {showWeight && weightDisplay && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-[#111D2E] border border-[#1A3A5C]">
              <Scale className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-sm text-white font-medium">{weightDisplay}</span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-xl bg-[#111D2E] border border-[#1A3A5C]">
            <Calendar className="w-4 h-4 text-[#8A94A6]" />
            <span className="text-sm text-[#8A94A6]">{formatDate(item.dateAdded)}</span>
          </div>

          {/* Description */}
          {item.description && (
            <div className="mb-6">
              <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-white/80 leading-relaxed bg-[#111D2E] border border-[#1A3A5C] rounded-2xl p-4">{item.description}</p>
            </div>
          )}

          {/* Photo thumbnails */}
          {item.photos.length > 1 && (
            <div className="mb-6">
              <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2">All Photos ({item.photos.length})</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {item.photos.map((photo, i) => (
                  <button key={i} onClick={() => setCurrentPhotoIndex(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === currentPhotoIndex ? 'border-[#C9A84C]' : 'border-transparent'}`}
                  >
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mark as Retrieved Button */}
      <div className="px-5 py-5 border-t border-[#1A3A5C]/50">
        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 active:bg-red-500/20 active:scale-[0.98] transition-all"
        >
          <Trash2 className="w-4 h-4" />Mark as Retrieved
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-[#111D2E] border border-[#1A3A5C] rounded-3xl p-6 w-full max-w-[340px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Remove Item?</h3>
            </div>
            <p className="text-sm text-[#8A94A6] mb-2">Remove <span className="text-white font-medium">{item.name}</span> from your {APP_NAME}?</p>
            <p className="text-sm text-red-400 mb-6">This will delete all photos and information permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
