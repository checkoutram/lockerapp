import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Trash2, Calendar, Camera, Edit3, Lock, Unlock, ShieldCheck, Hash, Tag, ChevronRight, X, ZoomIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getItems, getLockers, deleteItem, updateItem } from '../utils/storage';
import PhotoImage from '../components/PhotoImage';
import type { LockerItem, Locker } from '../types';


export default function ItemDetailScreen() {
  const { goBack, navigate, screenData, setItems: setContextItems, screen } = useApp();
  // Capture itemId once on mount so it survives screenData overwrites
  const [currentItemId] = useState<string | undefined>(screenData?.itemId);
  const itemId = currentItemId;
  const [item, setItem] = useState<LockerItem | null>(null);
  const [locker, setLocker] = useState<Locker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Touch swipe state for carousel
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const loadedItems = await getItems();
    const foundItem = loadedItems.find((i: LockerItem) => i.id === itemId);
    if (!foundItem) { setIsLoading(false); return; }
    setItem(foundItem);
    const loadedLockers = await getLockers();
    setLocker(loadedLockers.find((l: Locker) => l.id === foundItem.lockerId) || null);
    setIsLoading(false);
  }, [itemId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload when screen becomes active again (e.g., after editing)
  useEffect(() => {
    if (screen === 'itemDetail') {
      loadData();
    }
  }, [screen, loadData]);

  const handleToggleInLocker = async () => {
    if (!item) return;
    const updatedItem = { ...item, inLocker: !item.inLocker };
    // Persist to storage first
    await updateItem(updatedItem);
    // Update context state so parent screens reflect the change
    const loadedItems = await getItems();
    setContextItems(loadedItems);
    // Update local state
    setItem(updatedItem);
  };

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem(item.id);
    const updated = await getItems();
    setContextItems(updated);
    goBack();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return ''; }
  };

  const handleEditItem = () => {
    if (!item) return;
    navigate('addItem', { editItem: item });
  };

  // Carousel swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left → next
        setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
      } else {
        // Swipe right → prev
        setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
      }
    }
  };

  const goToNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };
  const goToPrevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  // Full-screen viewer handlers
  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);
  const viewerNext = () => setViewerIndex((prev) => (prev + 1) % allPhotos.length);
  const viewerPrev = () => setViewerIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);

  // Viewer swipe
  const viewerTouchStart = useRef(0);
  const viewerTouchEnd = useRef(0);
  const handleViewerTouchStart = (e: React.TouchEvent) => {
    viewerTouchStart.current = e.changedTouches[0].screenX;
  };
  const handleViewerTouchMove = (e: React.TouchEvent) => {
    viewerTouchEnd.current = e.changedTouches[0].screenX;
  };
  const handleViewerTouchEnd = () => {
    const diff = viewerTouchStart.current - viewerTouchEnd.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) viewerNext();
      else viewerPrev();
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-[#050A12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D6B45C]/20 border-t-[#D6B45C] rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="h-full w-full bg-[#050A12] flex items-center justify-center text-[#A6B2C2]">
        <p className="text-sm">Item not found</p>
      </div>
    );
  }

  const allPhotos = [...(item.photos || []), ...(item.billPhotos || [])];
  const photoCount = (item.photos || []).length;
  const billCount = (item.billPhotos || []).length;

  return (
    <div className="h-full flex flex-col bg-[#050A12] relative">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#D6B45C]" />
        </button>
        <h1 className="text-base font-bold text-[#F7F5EF] truncate max-w-[200px]">{item.name}</h1>
        <button onClick={() => setShowDeleteConfirm(true)} aria-label="Delete"
          className="p-2 -mr-2 rounded-full active:bg-white/5"
        >
          <Trash2 className="w-5 h-5 text-[#E98B8B]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Photo Carousel */}
        {allPhotos.length > 0 && (
          <div
            ref={carouselRef}
            className="relative mx-4 mb-4 rounded-2xl overflow-hidden aspect-[4/3] bg-[#0B1525] select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <PhotoImage
              photoRef={allPhotos[currentPhotoIndex]}
              alt={item.name}
              className="w-full h-full object-cover"
              onClick={() => openViewer(currentPhotoIndex)}
            />

            {/* Tap hint overlay */}
            <div className="absolute top-2 right-2 bg-black/40 rounded-lg px-2 py-1 pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5 text-white/70" />
            </div>

            {/* Left Arrow */}
            {allPhotos.length > 1 && (
              <button
                onClick={goToPrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center active:bg-black/70 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Right Arrow */}
            {allPhotos.length > 1 && (
              <button
                onClick={goToNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center active:bg-black/70 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Dots — larger and more tappable */}
            {allPhotos.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {allPhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhotoIndex(i)}
                    className={`h-2.5 rounded-full transition-all active:scale-110 ${
                      i === currentPhotoIndex
                        ? 'bg-[#F7F5EF] w-6'
                        : 'bg-[#F7F5EF]/40 w-2.5'
                    }`}
                    aria-label={`Go to photo ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Photo counter */}
            {allPhotos.length > 1 && (
              <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-1 text-[10px] text-white/80 font-medium pointer-events-none">
                {currentPhotoIndex + 1} / {allPhotos.length}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="px-4 mb-4 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-[#1D344D]/60 border border-[#D6B45C]/30 text-xs text-[#D6B45C] font-medium">
            {item.category}
          </span>
          {item.subType && item.subType !== 'Other' && (
            <span className="px-3 py-1 rounded-full bg-[#1D344D]/60 border border-[#A6B2C2]/20 text-xs text-[#A6B2C2] font-medium">
              {item.subType}
            </span>
          )}
          {locker && (
            <span className="px-3 py-1 rounded-full bg-[#1D344D]/60 border border-[#A6B2C2]/20 text-xs text-[#A6B2C2] font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {locker.name}
            </span>
          )}
        </div>

        {/* Item Name & Date */}
        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-[#F7F5EF]">{item.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-[#A6B2C2]">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDate(item.dateAdded)}</span>
          </div>
        </div>

        {/* Item Location Toggle */}
        <div className="mx-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#F7F5EF]">Item Location</span>
          </div>
          <div className="flex rounded-2xl overflow-hidden border border-[#1D344D]">
            <button
              onClick={handleToggleInLocker}
              disabled={item.inLocker}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
                item.inLocker
                  ? 'bg-[#1D344D] text-[#5ED6A5] cursor-default'
                  : 'bg-[#0B1525] text-[#A6B2C2] active:bg-[#14263B]'
              }`}
            >
              <Lock className="w-4 h-4" />
              In Locker
            </button>
            <button
              onClick={handleToggleInLocker}
              disabled={!item.inLocker}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
                !item.inLocker
                  ? 'bg-[#1D344D] text-[#E98B8B] cursor-default'
                  : 'bg-[#0B1525] text-[#A6B2C2] active:bg-[#14263B]'
              }`}
            >
              <Unlock className="w-4 h-4" />
              Out of Locker
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="mx-4 mb-5">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#0B1525] border border-[#1D344D] rounded-2xl p-3 text-center">
              <Camera className="w-4 h-4 text-[#A6B2C2] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#A6B2C2]">Weight</p>
              <p className="text-xs text-[#F7F5EF] font-semibold mt-0.5">{item.weightAmount ? `${item.weightAmount} Gram` : '-'}</p>
            </div>
            <div className="bg-[#0B1525] border border-[#1D344D] rounded-2xl p-3 text-center">
              <Tag className="w-4 h-4 text-[#A6B2C2] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#A6B2C2]">Category</p>
              <p className="text-xs text-[#F7F5EF] font-semibold mt-0.5">{item.category}</p>
            </div>
            <div className="bg-[#0B1525] border border-[#1D344D] rounded-2xl p-3 text-center">
              <Hash className="w-4 h-4 text-[#A6B2C2] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#A6B2C2]">Pcs</p>
              <p className="text-xs text-[#F7F5EF] font-semibold mt-0.5">{item.pieceCount || '1'}</p>
            </div>
            <div className="bg-[#0B1525] border border-[#1D344D] rounded-2xl p-3 text-center">
              <Calendar className="w-4 h-4 text-[#A6B2C2] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#A6B2C2]">Date Added</p>
              <p className="text-xs text-[#F7F5EF] font-semibold mt-0.5">{formatDate(item.dateAdded)}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="mx-4 mb-5">
            <h3 className="text-xs text-[#A6B2C2] uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-[#F7F5EF]/80 leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Item Photos */}
        {photoCount > 0 && (
          <div className="mx-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#F7F5EF]">Item Photos</h3>
              <span className="text-xs text-[#D6B45C]">{photoCount} Photos</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {item.photos?.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => openViewer(i)}
                  className="relative shrink-0 rounded-xl overflow-hidden border border-[#1D344D] bg-[#0B1525] active:scale-95 transition-transform"
                >
                  <PhotoImage
                    photoRef={photo}
                    alt={`Item ${i + 1}`}
                    className="w-28 h-20 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bill / Certificate */}
        {billCount > 0 && (
          <div className="mx-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#F7F5EF]">Bill / Certificate</h3>
              <span className="text-xs text-[#D6B45C]">{billCount} Documents</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {item.billPhotos?.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => openViewer(photoCount + i)}
                  className="relative shrink-0 rounded-xl overflow-hidden border border-[#1D344D] bg-[#0B1525] active:scale-95 transition-transform"
                >
                  <PhotoImage
                    photoRef={photo}
                    alt={`Bill ${i + 1}`}
                    className="w-28 h-20 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Edit Item Button */}
        <div className="mx-4 mb-4">
          <button
            onClick={handleEditItem}
            className="w-full py-3.5 rounded-2xl border border-[#D6B45C]/30 bg-[#D6B45C]/10 text-[#D6B45C] text-sm font-semibold flex items-center justify-center gap-2 active:bg-[#D6B45C]/20 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Item
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-2">
          <div className="flex items-center justify-center gap-2 text-xs text-[#5ED6A5]">
            <ShieldCheck className="w-4 h-4" />
            <span>Your data stays on your device — private and secure</span>
          </div>
        </div>
      </div>

      {/* Full-Screen Image Viewer */}
      {viewerOpen && allPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 flex flex-col"
          onTouchStart={handleViewerTouchStart}
          onTouchMove={handleViewerTouchMove}
          onTouchEnd={handleViewerTouchEnd}
        >
          {/* Viewer Header */}
          <div className="shrink-0 flex items-center justify-between px-4 pt-5 pb-3">
            <button
              onClick={closeViewer}
              className="p-2 -ml-2 rounded-full active:bg-white/10"
              aria-label="Close viewer"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <span className="text-sm text-white/80 font-medium">
              {viewerIndex + 1} / {allPhotos.length}
            </span>
            <div className="w-10" />
          </div>

          {/* Viewer Image */}
          <div className="flex-1 flex items-center justify-center relative px-2">
            <PhotoImage
              photoRef={allPhotos[viewerIndex]}
              alt={`Photo ${viewerIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Viewer Navigation Arrows */}
          {allPhotos.length > 1 && (
            <>
              <button
                onClick={viewerPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={viewerNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Viewer Dots */}
          {allPhotos.length > 1 && (
            <div className="shrink-0 flex justify-center gap-2 pb-6 pt-2">
              {allPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setViewerIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === viewerIndex
                      ? 'bg-white w-6'
                      : 'bg-white/40 w-2'
                  }`}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
          <div className="bg-[#101F32] rounded-2xl p-6 w-full max-w-sm border border-[#1D344D]/50">
            <h3 className="text-lg font-bold text-[#F7F5EF] mb-2">Delete Item?</h3>
            <p className="text-sm text-[#A6B2C2] mb-6">
              This will permanently remove "{item.name}" from your locker.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-[#14263B] text-[#F7F5EF] font-medium text-sm"
              >Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-[#E98B8B]/20 text-[#E98B8B] font-medium text-sm border border-[#E98B8B]/30"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
