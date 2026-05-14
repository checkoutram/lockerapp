import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Calendar, Scale, Trash2, AlertTriangle, Receipt, Pencil, Camera, ImageIcon, X, CheckCircle2, AlertCircle, Shield, Archive, ArchiveX } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useApp } from '@/context/AppContext';
import { getItems, deleteItem, updateItem } from '@/utils/storage';
import PhotoImage from '@/components/PhotoImage';
import type { LockerItem, WeightUnit, MainCategory } from '@/types';
import {
  CATEGORY_COLORS, PIECE_COUNT_SUBTYPES,
  JEWELLERY_SUBTYPES, DOCUMENT_SUBTYPES, MAIN_CATEGORIES,
  WEIGHT_UNITS_JEWELLERY, WEIGHT_UNITS_DIAMOND, DEFAULT_WEIGHT_UNIT,
} from '@/types';

const JEWEL_CATEGORIES: MainCategory[] = ['Gold', 'Silver', 'Platinum', 'Diamond'];
function isJewelCategory(c: string): boolean {
  return JEWEL_CATEGORIES.includes(c as MainCategory);
}

export default function ItemDetailScreen() {
  const { goBack, selectedItemId } = useApp();
  const [item, setItem] = useState<LockerItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [viewerAlt, setViewerAlt] = useState('');

  // Edit state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<MainCategory | ''>('');
  const [editSubType, setEditSubType] = useState('');
  const [editSubTypeCustom, setEditSubTypeCustom] = useState('');
  const [editCategoryCustom, setEditCategoryCustom] = useState('');
  const [editWeightAmount, setEditWeightAmount] = useState('');
  const [editWeightUnit, setEditWeightUnit] = useState<WeightUnit>('g');
  const [editPieceCount, setEditPieceCount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editBillPhotos, setEditBillPhotos] = useState<string[]>([]);
  const [editInLocker, setEditInLocker] = useState(true);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const loadItem = useCallback(async () => {
    if (!selectedItemId) return;
    const items = await getItems();
    const found = items.find((i) => i.id === selectedItemId) || null;
    setItem(found);
  }, [selectedItemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const startEdit = () => {
    if (!item) return;
    setEditName(item.name);
    setEditDescription(item.description);
    setEditCategory(item.category);
    setEditSubType(item.subType);
    setEditSubTypeCustom(item.subTypeCustom || '');
    setEditCategoryCustom(item.categoryCustom || '');
    setEditWeightAmount(item.weightAmount);
    setEditWeightUnit(item.weightUnit);
    setEditPieceCount(item.pieceCount);
    setEditDate(new Date(item.dateAdded).toISOString().split('T')[0]);
    setEditPhotos([...item.photos]);
    setEditBillPhotos([...item.billPhotos]);
    setEditInLocker(item.inLocker !== false);
    setIsEditing(true);
    setSaveError('');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError('');
  };

  // Helper: read photo file and convert to data URL
  const readPhotoFile = async (path: string): Promise<string | null> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Filesystem } = await import('@capacitor/filesystem');
        const result = await Filesystem.readFile({ path, directory: undefined });
        if (typeof result.data === 'string') {
          const mime = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          return `data:${mime};base64,${result.data}`;
        }
        return null;
      }
      return path;
    } catch (err: any) {
      console.error('[readPhotoFile] Error:', err);
      return null;
    }
  };

  // Native Capacitor Camera for edit mode
  const takeEditPhoto = async (isBill: boolean) => {
    const maxCount = isBill ? 3 : 5;
    const current = isBill ? editBillPhotos.length : editPhotos.length;
    if (current >= maxCount) { setSaveError(`Maximum ${maxCount} photos`); return; }

    try {
      // Use Uri to bypass native OK/Retry preview
      const image = await CapCamera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1200,
      });
      if (!image.path) { setSaveError('No image data'); return; }
      const dataUrl = await readPhotoFile(image.path);
      if (!dataUrl) { setSaveError('Failed to read photo'); return; }
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
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: 1200,
        height: 1200,
      });
      if (!image.path) { setSaveError('No image data'); return; }
      const dataUrl = await readPhotoFile(image.path);
      if (!dataUrl) { setSaveError('Failed to read photo'); return; }
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

  // Category helpers
  const availableSubTypes =
    isJewelCategory(editCategory) ? JEWELLERY_SUBTYPES
    : editCategory === 'Documents' ? DOCUMENT_SUBTYPES
    : [];

  const availableWeightUnits =
    editCategory === 'Diamond' ? WEIGHT_UNITS_DIAMOND
    : isJewelCategory(editCategory) ? WEIGHT_UNITS_JEWELLERY
    : WEIGHT_UNITS_JEWELLERY;

  const showWeightSection = isJewelCategory(editCategory);
  const showPieceCount = isJewelCategory(editCategory) && PIECE_COUNT_SUBTYPES.includes(editSubType);
  const showSubTypeCustom = editSubType === 'Other (jewellery)' || editSubType === 'Other (document)';
  const showOtherInput = editCategory === 'Other';

  const handleCategorySelect = (cat: MainCategory) => {
    setEditCategory(cat);
    setEditSubType('');
    setEditSubTypeCustom('');
    setEditCategoryCustom('');
    if (isJewelCategory(cat)) {
      setEditWeightUnit(DEFAULT_WEIGHT_UNIT[cat] || 'g');
    }
  };

  const handleSubTypeSelect = (st: string) => {
    setEditSubType(st);
    setEditSubTypeCustom('');
  };

  const handleWeightAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
    setEditWeightAmount(final.slice(0, 8));
  };

  const handlePieceCountChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setEditPieceCount(clean);
  };

  const saveEdit = async () => {
    if (!item) return;
    if (!editName.trim()) { setSaveError('Item name is required'); return; }
    if (!editCategory) { setSaveError('Category is required'); return; }
    if ((isJewelCategory(editCategory) || editCategory === 'Documents') && !editSubType) {
      setSaveError('Item type is required'); return;
    }
    setIsSaving(true);
    setSaveError('');

    const updated: LockerItem = {
      ...item,
      name: editName.trim(),
      description: editDescription.trim(),
      category: editCategory as MainCategory,
      subType: editSubType,
      subTypeCustom: editSubTypeCustom,
      categoryCustom: editCategoryCustom,
      photos: editPhotos,
      billPhotos: editBillPhotos,
      weightAmount: editWeightAmount,
      weightUnit: editWeightUnit,
      pieceCount: editPieceCount,
      dateAdded: new Date(editDate).toISOString(),
      inLocker: editInLocker,
    };

    const result = await updateItem(updated);
    setIsSaving(false);

    if (result.success) {
      setItem(updated);
      setIsEditing(false);
      setSaveError('');
      addToast('Changes saved', 'success');
    } else {
      setSaveError(result.error || 'Failed to save changes.');
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem(item.id);
    addToast(`"${item.name}" deleted`, 'success');
    goBack();
  };

  if (!item) {
    return (
      <div className="h-full flex flex-col bg-[#0A1628]">
        <div className="flex items-center px-4 pt-6 pb-3 border-b border-[#1A3A5C]/50">
          <button onClick={goBack} className="p-2 -ml-2 rounded-full active:bg-white/5">
            <ChevronLeft className="w-5 h-5 text-[#8A94A6]" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#8A94A6]">Item not found.</p>
        </div>
      </div>
    );
  }

  const color = CATEGORY_COLORS[item.category] || '#C9A84C';
  const displayDate = new Date(item.dateAdded).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[90%] ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-3 border-b border-[#1A3A5C]/50">
        <button onClick={goBack} className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#8A94A6]" />
        </button>
        <div className="flex-1 flex flex-col items-center pr-8 min-w-0">
          <h1 className="text-lg font-bold text-white truncate w-full text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isEditing ? 'Edit Item' : item.name}
          </h1>
          {!isEditing && (
            <span className="text-[9px] text-[#C9A84C]/50 tracking-wide">Know What Your Locker Holds.</span>
          )}
        </div>
        {isEditing ? (
          <button onClick={cancelEdit} className="p-2 -mr-2 rounded-full active:bg-white/5">
            <X className="w-5 h-5 text-[#8A94A6]" />
          </button>
        ) : (
          <button onClick={() => setShowDeleteDialog(true)} className="p-2 -mr-2 rounded-full active:bg-white/5">
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Photo Carousel */}
        {item.photos.length > 0 && (
          <div className="relative w-full aspect-square bg-[#0D1929]">
            <PhotoImage
              photoRef={item.photos[currentPhotoIndex]}
              alt={item.name}
              className="w-full h-full object-cover"
              onClick={() => {
                setViewerImage(item.photos[currentPhotoIndex]);
                setViewerAlt(item.name);
              }}
            />
            {item.photos.length > 1 && (
              <>
                <button onClick={() => setCurrentPhotoIndex((p) => Math.max(0, p - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center active:bg-black/70 transition-colors"
                  style={{ opacity: currentPhotoIndex === 0 ? 0.3 : 1 }}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button onClick={() => setCurrentPhotoIndex((p) => Math.min(item.photos.length - 1, p + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center active:bg-black/70 transition-colors"
                  style={{ opacity: currentPhotoIndex === item.photos.length - 1 ? 0.3 : 1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {item.photos.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-[#C9A84C] w-4' : 'bg-white/50'}`} />
                  ))}
                </div>
                <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2.5 py-1">
                  <span className="text-xs text-white font-medium">{currentPhotoIndex + 1}/{item.photos.length}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnail Strip */}
        {item.photos.length > 1 && (
          <div className="flex gap-2 px-5 py-3 overflow-x-auto">
            {item.photos.map((photo, i) => (
              <button key={i} onClick={() => setCurrentPhotoIndex(i)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === currentPhotoIndex ? 'border-[#C9A84C]' : 'border-transparent'}`}
              >
                <PhotoImage photoRef={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"
                  onClick={() => {
                    setViewerImage(photo);
                    setViewerAlt(`${item.name} photo ${i + 1}`);
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {isEditing ? (
          <div className="px-5 pt-4 space-y-4">
            {saveError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs animate-fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Edit Name */}
            <div>
              <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Name *</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
              />
            </div>

            {/* Edit Category Level 1 */}
            <div>
              <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">Category *</label>
              <div className="flex flex-wrap gap-2">
                {MAIN_CATEGORIES.map((cat) => {
                  const catColor = CATEGORY_COLORS[cat];
                  const isSelected = editCategory === cat;
                  return (
                    <button key={cat} onClick={() => handleCategorySelect(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 border ${
                        isSelected ? 'border-transparent text-[#0A1628]' : 'bg-[#111D2E] border-[#1A3A5C] text-white hover:border-[#C9A84C]/30'
                      }`}
                      style={isSelected ? { backgroundColor: catColor, borderColor: catColor } : {}}
                    >{cat}</button>
                  );
                })}
              </div>
            </div>

            {/* Edit Category Level 2 */}
            {availableSubTypes.length > 0 && (
              <div className="animate-fade-in">
                <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">
                  {isJewelCategory(editCategory) ? 'Item Type' : 'Document Type'} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSubTypes.map((st) => (
                    <button key={st} onClick={() => handleSubTypeSelect(st)}
                      className={`px-3 py-2 rounded-xl text-xs transition-all active:scale-95 border ${
                        editSubType === st ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628] font-medium' : 'bg-[#111D2E] border-[#1A3A5C] text-white'
                      }`}
                    >{st}</button>
                  ))}
                </div>
                {showSubTypeCustom && (
                  <input type="text" value={editSubTypeCustom} onChange={(e) => setEditSubTypeCustom(e.target.value)}
                    placeholder="Describe the type..."
                    className="w-full mt-3 px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                  />
                )}
              </div>
            )}

            {/* Edit Other Category Custom */}
            {showOtherInput && (
              <div className="animate-fade-in">
                <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Describe Category *</label>
                <input type="text" value={editCategoryCustom} onChange={(e) => setEditCategoryCustom(e.target.value)}
                  placeholder="e.g., Watch, Coin..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                />
              </div>
            )}

            {/* Edit Weight */}
            {showWeightSection && (
              <div className="animate-fade-in">
                <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Weight / Quantity</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input type="text" inputMode="decimal" value={editWeightAmount}
                      onChange={(e) => handleWeightAmountChange(e.target.value)}
                      placeholder="e.g., 22.5" maxLength={8}
                      className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 content-start">
                    {availableWeightUnits.map((unit) => (
                      <button key={unit} onClick={() => setEditWeightUnit(unit as WeightUnit)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 border ${
                          editWeightUnit === unit ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628]' : 'bg-[#111D2E] border-[#1A3A5C] text-white'
                        }`}
                      >{unit}</button>
                    ))}
                  </div>
                </div>
                {showPieceCount && (
                  <input type="text" inputMode="numeric" value={editPieceCount}
                    onChange={(e) => handlePieceCountChange(e.target.value)} placeholder="No. of pieces"
                    className="w-full mt-3 px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors"
                  />
                )}
              </div>
            )}

            {/* Edit Date */}
            <div>
              <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Date Added</label>
              <div className="relative">
                <input type="date" value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors appearance-none"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A94A6] pointer-events-none" />
              </div>
            </div>

            {/* Edit Description */}
            <div>
              <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors resize-none"
              />
            </div>

            {/* Edit Photos */}
            <div>
              <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Photos ({editPhotos.length}/5)</label>
              <div className="flex gap-3 mb-3">
                <button onClick={() => takeEditPhoto(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium active:scale-95 transition-all">
                  <Camera className="w-4 h-4" />Take Photo
                </button>
                <button onClick={() => pickEditPhotoFromGallery(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2C] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium active:scale-95 transition-all">
                  <ImageIcon className="w-4 h-4" />Gallery
                </button>
              </div>
              {editPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {editPhotos.map((photo, i) => (
                    <button key={i}
                      onClick={() => { setViewerImage(photo); setViewerAlt(`Photo ${i + 1}`); }}
                      className="relative active:scale-95 transition-transform"
                    >
                      <PhotoImage photoRef={photo} alt={`Photo ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border-2 border-[#C9A84C]/30 bg-[#111D2E] cursor-pointer" />
                      <span
                        onClick={(e) => { e.stopPropagation(); handleRemoveEditPhoto(i); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center z-10"
                      >
                        <X className="w-3 h-3 text-white" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Bill Photos */}
            <div>
              <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Bill Photos ({editBillPhotos.length}/3)</label>
              <div className="flex gap-3 mb-3">
                <button onClick={() => takeEditPhoto(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#10B981] text-sm font-medium active:scale-95 transition-all">
                  <Camera className="w-4 h-4" />Take Photo
                </button>
                <button onClick={() => pickEditPhotoFromGallery(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#10B981] text-sm font-medium active:scale-95 transition-all">
                  <ImageIcon className="w-4 h-4" />Gallery
                </button>
              </div>
              {editBillPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {editBillPhotos.map((photo, i) => (
                    <button key={i}
                      onClick={() => { setViewerImage(photo); setViewerAlt(`Bill/Certificate ${i + 1}`); }}
                      className="relative active:scale-95 transition-transform"
                    >
                      <PhotoImage photoRef={photo} alt={`Bill ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border-2 border-[#10B981]/30 bg-[#111D2E] cursor-pointer" />
                      <span
                        onClick={(e) => { e.stopPropagation(); handleRemoveEditBillPhoto(i); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center z-10"
                      >
                        <X className="w-3 h-3 text-white" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit In/Out Toggle */}
            <button
              onClick={() => setEditInLocker((v) => !v)}
              className={`w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] border mt-4 ${
                editInLocker
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
              }`}
            >
              {editInLocker ? <Archive className="w-4 h-4" /> : <ArchiveX className="w-4 h-4" />}
              {editInLocker ? 'In Locker' : 'Out of Locker'}
              <span className={`ml-1 w-7 h-4 rounded-full relative ${editInLocker ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${editInLocker ? 'left-3.5' : 'left-0.5'}`} />
              </span>
            </button>

            {/* Save Button */}
            <button onClick={saveEdit} disabled={isSaving}
              className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] mt-4 ${
                !isSaving ? 'bg-[#C9A84C] text-[#0A1628]' : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="px-5 pt-4">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${color}20`, color }}>
                {item.category}
              </span>
              {item.subType && (
                <span className="px-3 py-1 rounded-full text-xs bg-[#1A3A5C] text-[#8A94A6]">
                  {item.subType}
                </span>
              )}
              {item.weightAmount && (
                <span className="px-3 py-1 rounded-full text-xs bg-[#1A3A5C] text-[#C9A84C] flex items-center gap-1">
                  <Scale className="w-3 h-3" />{item.weightAmount} {item.weightUnit}
                </span>
              )}
            </div>

            {/* Name */}
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {item.name}
            </h2>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-[#8A94A6] mb-4">{item.description}</p>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[#8A94A6]" />
              <span className="text-sm text-[#8A94A6]">{displayDate}</span>
            </div>

            {/* Bill Photos */}
            {item.billPhotos.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />Bill / Certificate
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {item.billPhotos.map((photo, i) => (
                    <button key={i}
                      onClick={() => {
                        setViewerImage(photo);
                        setViewerAlt(`Bill/Certificate ${i + 1}`);
                      }}
                      className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-[#10B981]/40 relative active:scale-95 transition-transform"
                    >
                      <PhotoImage photoRef={photo} alt={`Bill/Certificate ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center py-0.5">
                        <span className="text-[10px] text-white">{i + 1}/{item.billPhotos.length}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* In/Out of Locker Quick Toggle */}
            <button
              onClick={async () => {
                if (!item) return;
                const updated = { ...item, inLocker: !item.inLocker };
                const result = await updateItem(updated);
                if (result.success) {
                  setItem(updated);
                  addToast(updated.inLocker ? 'Item marked as In Locker' : 'Item marked as Out of Locker', 'success');
                }
              }}
              className={`w-full mt-3 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] border ${
                item.inLocker !== false
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
              }`}
            >
              {item.inLocker !== false ? <Archive className="w-4 h-4" /> : <ArchiveX className="w-4 h-4" />}
              {item.inLocker !== false ? 'In Locker' : 'Out of Locker'}
              <span className={`ml-1 w-7 h-4 rounded-full relative ${item.inLocker !== false ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.inLocker !== false ? 'left-3.5' : 'left-0.5'}`} />
              </span>
            </button>

            {/* Edit Button */}
            <button onClick={startEdit}
              className="w-full mt-3 py-3.5 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium flex items-center justify-center gap-2 active:bg-[#1A3A5C] active:scale-[0.98] transition-all"
            >
              <Pencil className="w-4 h-4" />Edit Item
            </button>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && !isEditing && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-[#111D2E] border-t border-[#1A3A5C] rounded-t-3xl p-6 w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Item?</h3>
            <p className="text-sm text-[#8A94A6] mb-6">
              "{item.name}" will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteDialog(false)}
                className="flex-1 py-3.5 rounded-2xl bg-[#1A3A5C] text-white text-sm font-medium active:scale-95 transition-transform"
              >Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Note */}
      <div className="shrink-0 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/70 bg-emerald-500/5 px-4 py-2 border-t border-emerald-500/10">
        <Shield className="w-3 h-3 flex-shrink-0" />
        <span>Your data stays on your device - completely private &amp; secure</span>
      </div>

      {/* Full-Screen Image Viewer */}
      {viewerImage && (
        <div
          className="absolute inset-0 bg-black/95 z-[60] flex flex-col animate-fade-in"
          onClick={() => setViewerImage(null)}
        >
          {/* Viewer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm text-[#8A94A6] truncate flex-1 mr-4">{viewerAlt}</span>
            <button
              onClick={() => setViewerImage(null)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Viewer Image */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <PhotoImage
              photoRef={viewerImage}
              alt={viewerAlt}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
          <div className="text-center pb-4 text-[11px] text-[#8A94A6]/50">Tap anywhere to close</div>
        </div>
      )}
    </div>
  );
}
