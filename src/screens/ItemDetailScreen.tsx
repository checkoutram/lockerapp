import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Calendar, Scale, Trash2, AlertTriangle, Receipt, Pencil, Camera, ImageIcon, X, Check } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useApp } from '@/context/AppContext';
import { getItems, deleteItem, updateItem } from '@/utils/storage';
import PhotoImage from '@/components/PhotoImage';
import type { LockerItem, WeightUnit } from '@/types';
import { CATEGORY_COLORS, APP_NAME, PIECE_COUNT_SUBTYPES } from '@/types';

const JEWEL_CATEGORIES = ['Gold', 'Silver', 'Platinum', 'Diamond'];

function isJewelCategory(c: string): boolean {
  return JEWEL_CATEGORIES.includes(c);
}

export default function ItemDetailScreen() {
  const { goBack, selectedItemId } = useApp();
  const [item, setItem] = useState<LockerItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editBillPhotos, setEditBillPhotos] = useState<string[]>([]);
  const [editWeightAmount, setEditWeightAmount] = useState('');
  const [editWeightUnit, setEditWeightUnit] = useState<WeightUnit>('g');
  const [editPieceCount, setEditPieceCount] = useState('');

  const loadItem = useCallback(async () => {
    if (!selectedItemId) return;
    const items = await getItems();
    const found = items.find((i) => i.id === selectedItemId);
    if (found) {
      setItem(found);
      // Pre-fill edit state
      setEditName(found.name);
      setEditDescription(found.description);
      setEditPhotos([...found.photos]);
      setEditBillPhotos(found.billPhotos ? [...found.billPhotos] : []);
      setEditWeightAmount(found.weightAmount);
      setEditWeightUnit(found.weightUnit);
      setEditPieceCount(found.pieceCount);
    }
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

  const handleSaveEdit = async () => {
    if (!item || !editName.trim()) return;
    setIsSaving(true);
    setSaveError('');

    const updated: LockerItem = {
      ...item,
      name: editName.trim(),
      description: editDescription.trim(),
      photos: editPhotos,
      billPhotos: editBillPhotos,
      weightAmount: editWeightAmount,
      weightUnit: editWeightUnit,
      pieceCount: editPieceCount,
    };

    const result = await updateItem(updated);
    setIsSaving(false);

    if (result.success) {
      setItem(updated);
      setIsEditing(false);
      setSaveError('');
    } else {
      setSaveError(result.error || 'Failed to save changes.');
    }
  };

  const handleCancelEdit = () => {
    if (!item) return;
    // Revert to original values
    setEditName(item.name);
    setEditDescription(item.description);
    setEditPhotos([...item.photos]);
    setEditBillPhotos(item.billPhotos ? [...item.billPhotos] : []);
    setEditWeightAmount(item.weightAmount);
    setEditWeightUnit(item.weightUnit);
    setEditPieceCount(item.pieceCount);
    setIsEditing(false);
  };

  // Native Capacitor Camera for edit mode
  const takeEditPhoto = async (isBill: boolean) => {
    const maxCount = isBill ? 3 : 5;
    const current = isBill ? editBillPhotos.length : editPhotos.length;
    if (current >= maxCount) { setSaveError(`Maximum ${maxCount} photos`); return; }

    try {
      const image = await CapCamera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1200,
        height: 1200,
      });
      if (!image.base64String) { setSaveError('No image data'); return; }
      const mimeType = image.format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${image.base64String}`;
      if (isBill) setEditBillPhotos((prev) => [...prev, dataUrl]);
      else setEditPhotos((prev) => [...prev, dataUrl]);
    } catch (err: any) {
      if (!err?.message?.includes('cancel') && !err?.message?.includes('dismiss')) {
        setSaveError(err?.message?.includes('permission') ? 'Camera permission denied. Check Settings > Apps > vlocker > Permissions' : 'Camera failed');
      }
    }
  };

  const pickEditPhotoFromGallery = async (isBill: boolean) => {
    const maxCount = isBill ? 3 : 5;
    const current = isBill ? editBillPhotos.length : editPhotos.length;
    if (current >= maxCount) { setSaveError(`Maximum ${maxCount} photos`); return; }

    try {
      const image = await CapCamera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 1200,
        height: 1200,
      });
      if (!image.base64String) { setSaveError('No image data'); return; }
      const mimeType = image.format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${image.base64String}`;
      if (isBill) setEditBillPhotos((prev) => [...prev, dataUrl]);
      else setEditPhotos((prev) => [...prev, dataUrl]);
    } catch (err: any) {
      if (!err?.message?.includes('cancel') && !err?.message?.includes('dismiss') && !err?.message?.includes('choose')) {
        setSaveError(err?.message?.includes('permission') ? 'Storage permission denied. Check Settings > Apps > vlocker > Permissions' : 'Gallery failed');
      }
    }
  };

  const handleRemoveEditPhoto = (index: number) => {
    setEditPhotos((prev) => prev.filter((_, i) => i !== index));
    if (currentPhotoIndex >= index && currentPhotoIndex > 0) {
      setCurrentPhotoIndex((p) => p - 1);
    }
  };

  const handleRemoveEditBillPhoto = (index: number) => {
    setEditBillPhotos((prev) => prev.filter((_, i) => i !== index));
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
  const showWeight = isJewelCategory(item.category);

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
          {isEditing ? 'Edit Item' : item.name}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Photo Carousel */}
        {editPhotos.length > 0 && (
          <div className="relative w-full aspect-square bg-[#0D1929]">
            <PhotoImage
              photoRef={editPhotos[currentPhotoIndex]}
              alt={editName || item?.name || 'Photo'}
              className="w-full h-full object-cover"
            />
            {editPhotos.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {editPhotos.map((_, i) => (
                    <button key={i} onClick={() => setCurrentPhotoIndex(i)}
                      className={`h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'w-6 bg-[#C9A84C]' : 'w-2 bg-white/40'}`}
                    />
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-xs text-white font-medium">{currentPhotoIndex + 1} / {editPhotos.length}</span>
                </div>
                {currentPhotoIndex > 0 && (
                  <button onClick={() => setCurrentPhotoIndex((p) => p - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
                {currentPhotoIndex < editPhotos.length - 1 && (
                  <button onClick={() => setCurrentPhotoIndex((p) => p + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60 rotate-180">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="px-5 py-6">
          {isEditing ? (
            /* ===== EDIT MODE ===== */
            <>
              {/* Edit Name */}
              <div className="mb-4">
                <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Item Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                />
              </div>

              {/* Edit Description */}
              <div className="mb-4">
                <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors resize-none"
                />
              </div>

              {/* Edit Weight */}
              {showWeight && (
                <div className="mb-4">
                  <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Weight / Quantity</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-[#8A94A6] mb-1 block">Amount</label>
                      <input type="text" inputMode="decimal" value={editWeightAmount}
                        onChange={(e) => setEditWeightAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 8))}
                        className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8A94A6] mb-1 block">Unit</label>
                      <div className="flex gap-1.5">
                        {['g', 'kg', 'mg', 'ct', 'pcs'].map((u) => (
                          <button key={u} onClick={() => setEditWeightUnit(u as WeightUnit)}
                            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
                              editWeightUnit === u ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628]' : 'bg-[#111D2E] border-[#1A3A5C] text-white'
                            }`}
                          >{u}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {PIECE_COUNT_SUBTYPES.includes(item.subType) && (
                    <div className="mt-3">
                      <label className="text-[10px] text-[#8A94A6] mb-1 block">No. of Pieces</label>
                      <input type="text" inputMode="numeric" value={editPieceCount}
                        onChange={(e) => setEditPieceCount(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Edit Photos */}
              <div className="mb-4">
                <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Photos ({editPhotos.length}/5)</label>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => takeEditPhoto(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium active:scale-95 transition-all">
                    <Camera className="w-4 h-4" />Add Photo
                  </button>
                  <button onClick={() => pickEditPhotoFromGallery(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium active:scale-95 transition-all">
                    <ImageIcon className="w-4 h-4" />Gallery
                  </button>
                </div>
                {editPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {editPhotos.map((photo, i) => (
                      <div key={i} className="relative">
                        <PhotoImage photoRef={photo} alt={`Photo ${i + 1}`} className="photo-thumbnail" />
                        <button onClick={() => handleRemoveEditPhoto(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        ><X className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Bill Photos */}
              <div className="mb-4">
                <label className="text-xs text-[#10B981] uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" />Bill / Certificate Photos ({editBillPhotos.length}/3)
                </label>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => takeEditPhoto(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#10B981] text-sm font-medium active:scale-95 transition-all">
                    <Camera className="w-4 h-4" />Add Bill Photo
                  </button>
                  <button onClick={() => pickEditPhotoFromGallery(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#10B981] text-sm font-medium active:scale-95 transition-all">
                    <ImageIcon className="w-4 h-4" />Gallery
                  </button>
                </div>
                {editBillPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {editBillPhotos.map((photo, i) => (
                      <div key={i} className="relative">
                        <PhotoImage photoRef={photo} alt={`Bill ${i + 1}`} className="photo-thumbnail border border-[#10B981]/30" />
                        <button onClick={() => handleRemoveEditBillPhoto(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        ><X className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Error */}
              {saveError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Save / Cancel Buttons */}
              <div className="flex gap-3 mt-2 mb-4">
                <button onClick={handleCancelEdit}
                  className="flex-1 py-4 rounded-2xl bg-[#1A3A5C] text-white text-sm font-semibold active:scale-[0.98] transition-all"
                >Cancel</button>
                <button onClick={handleSaveEdit}
                  disabled={!editName.trim() || isSaving}
                  className={`flex-1 py-4 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    editName.trim() && !isSaving ? 'bg-[#C9A84C] text-[#0A1628]' : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
                  }`}
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <><Check className="w-4 h-4" />Save Changes</>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ===== VIEW MODE ===== */
            <>
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
                        <PhotoImage photoRef={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bill / Certificate Photos */}
              {item.billPhotos && item.billPhotos.length > 0 && (
                <div className="mb-6 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-4 h-4 text-[#10B981]" />
                    <h3 className="text-xs text-[#10B981] uppercase tracking-wider">Bill / Certificate ({item.billPhotos.length})</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {item.billPhotos.map((photo, i) => (
                      <div key={i} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-[#10B981]/40 relative">
                        <PhotoImage photoRef={photo} alt={`Bill/Certificate ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center py-0.5">
                          <span className="text-[10px] text-[#10B981] font-medium">BILL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      {!isEditing && (
        <div className="px-5 py-5 border-t border-[#1A3A5C]/50 space-y-3">
          {/* Edit Button */}
          <button onClick={() => setIsEditing(true)}
            className="w-full py-4 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-sm font-semibold flex items-center justify-center gap-2 active:bg-[#C9A84C]/20 active:scale-[0.98] transition-all"
          >
            <Pencil className="w-4 h-4" />Edit Item
          </button>

          {/* Mark as Retrieved Button */}
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 active:bg-red-500/20 active:scale-[0.98] transition-all"
          >
            <Trash2 className="w-4 h-4" />Mark as Retrieved
          </button>
        </div>
      )}

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
