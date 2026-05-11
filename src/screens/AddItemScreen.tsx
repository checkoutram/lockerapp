import { useState, useCallback } from 'react';
import { ChevronLeft, Camera, ImageIcon, X, Calendar, Receipt, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { saveItem } from '@/utils/storage';
import { generateUUID } from '@/utils/crypto';
import {
  type LockerItem,
  type MainCategory,
  type WeightUnit,
  MAIN_CATEGORIES,
  JEWELLERY_SUBTYPES,
  DOCUMENT_SUBTYPES,
  WEIGHT_UNITS_JEWELLERY,
  WEIGHT_UNITS_DIAMOND,
  DEFAULT_WEIGHT_UNIT,
  PIECE_COUNT_SUBTYPES,
  CATEGORY_COLORS,
  APP_NAME,
} from '@/types';

const JEWEL_CATEGORIES: MainCategory[] = ['Gold', 'Silver', 'Platinum', 'Diamond'];

function isJewelCategory(c: string): boolean {
  return JEWEL_CATEGORIES.includes(c as MainCategory);
}

// Toast type
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

export default function AddItemScreen() {
  const { goBack } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MainCategory | ''>('');
  const [subType, setSubType] = useState('');
  const [subTypeCustom, setSubTypeCustom] = useState('');
  const [categoryCustom, setCategoryCustom] = useState('');
  const [weightAmount, setWeightAmount] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');
  const [pieceCount, setPieceCount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [showBillSection, setShowBillSection] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const newId = Date.now() + Math.random();
    const toast = { id: newId, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId));
    }, 4000);
  }, []);

  const availableSubTypes =
    isJewelCategory(category) ? JEWELLERY_SUBTYPES
    : category === 'Documents' ? DOCUMENT_SUBTYPES
    : [];

  const availableWeightUnits =
    category === 'Diamond' ? WEIGHT_UNITS_DIAMOND
    : isJewelCategory(category) ? WEIGHT_UNITS_JEWELLERY
    : WEIGHT_UNITS_JEWELLERY;

  const showWeightSection = isJewelCategory(category);
  const showPieceCount = isJewelCategory(category) && PIECE_COUNT_SUBTYPES.includes(subType);
  const showSubTypeCustom = subType === 'Other (jewellery)' || subType === 'Other (document)';
  const showOtherInput = category === 'Other';

  const handleCategorySelect = (cat: MainCategory) => {
    setCategory(cat);
    setSubType('');
    setSubTypeCustom('');
    setCategoryCustom('');
    setWeightAmount('');
    setPieceCount('');
    if (isJewelCategory(cat)) {
      setWeightUnit(DEFAULT_WEIGHT_UNIT[cat] || 'g');
    }
    setErrors({});
  };

  const handleSubTypeSelect = (st: string) => {
    setSubType(st);
    setSubTypeCustom('');
    setErrors((prev) => ({ ...prev, subType: '' }));
  };

  const handleWeightAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
    setWeightAmount(final.slice(0, 8));
  };

  const handlePieceCountChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setPieceCount(clean);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Item name is required';
    if (!category) errs.category = 'Category is required';
    if (category === 'Other' && !categoryCustom.trim()) errs.categoryCustom = 'Description is required';
    if ((isJewelCategory(category) || category === 'Documents') && !subType) errs.subType = 'Item type is required';
    if (showSubTypeCustom && !subTypeCustom.trim()) errs.subTypeCustom = 'Please describe the type';
    if (weightAmount && !weightUnit) errs.weight = 'Please select a unit';
    if (weightAmount && isNaN(parseFloat(weightAmount))) errs.weight = 'Enter a valid number';
    if (pieceCount && isNaN(parseInt(pieceCount))) errs.pieceCount = 'Enter a valid number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ===== CORE PHOTO PROCESSING - MULTI-FALLBACK =====
  const processImageFile = async (file: File): Promise<string> => {
    // Strategy 1: Read file as data URL
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && result.startsWith('data:')) resolve(result);
        else reject(new Error('Invalid file data'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });

    // Strategy 2: Try canvas compression
    try {
      const compressed = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            let w = img.width;
            let h = img.height;
            const MAX = 1000;
            if (w > MAX || h > MAX) {
              const ratio = Math.min(MAX / w, MAX / h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas context')); return; }
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const result = canvas.toDataURL('image/jpeg', 0.7);
            if (result && result.length > 100) resolve(result);
            else reject(new Error('Empty canvas output'));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Image load failed'));
        // Add crossOrigin to avoid tainting issues
        img.crossOrigin = 'anonymous';
        img.src = rawDataUrl;
      });
      return compressed;
    } catch {
      // Strategy 3: Fallback to raw data URL (no compression)
      return rawDataUrl;
    }
  };

  // ===== PHOTO INPUT HANDLER =====
  const handlePhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // CRITICAL: Reset input immediately so it can be reused
    e.target.value = '';

    if (!files || files.length === 0) {
      addToast('No photo selected', 'error');
      return;
    }

    addToast(`Selected ${files.length} file(s)`, 'info');

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      addToast('Maximum 5 photos reached', 'error');
      return;
    }

    const toProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < toProcess; i++) {
      const file = files[i];
      addToast(`Processing photo ${i + 1}...`, 'info');

      // Validate
      if (!file.type.startsWith('image/')) {
        addToast(`Not an image: ${file.name || 'file'}`, 'error');
        continue;
      }
      if (file.size === 0) {
        addToast('Empty file, skipped', 'error');
        continue;
      }

      try {
        const dataUrl = await processImageFile(file);

        // Validate result
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
          addToast('Photo processing failed', 'error');
          continue;
        }

        // Use functional update to ensure fresh state
        setPhotos((prevPhotos) => {
          if (prevPhotos.length >= 5) return prevPhotos;
          return [...prevPhotos, dataUrl];
        });
        addToast(`Photo ${i + 1} added (${(dataUrl.length / 1024).toFixed(0)}KB)`, 'success');

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed';
        addToast(`Photo ${i + 1} error: ${msg}`, 'error');
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    addToast('Photo removed', 'info');
  };

  // ===== BILL PHOTO INPUT HANDLER =====
  const handleBillInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';

    if (!files || files.length === 0) {
      addToast('No file selected', 'error');
      return;
    }

    const remainingSlots = 3 - billPhotos.length;
    if (remainingSlots <= 0) {
      addToast('Maximum 3 bill photos reached', 'error');
      return;
    }

    const toProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < toProcess; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        addToast(`Not an image: ${file.name || 'file'}`, 'error');
        continue;
      }

      try {
        const dataUrl = await processImageFile(file);
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
          addToast('Bill photo processing failed', 'error');
          continue;
        }
        setBillPhotos((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, dataUrl];
        });
        addToast(`Bill photo ${i + 1} added`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed';
        addToast(`Bill photo error: ${msg}`, 'error');
      }
    }
  };

  const removeBillPhoto = (index: number) => {
    setBillPhotos((prev) => prev.filter((_, i) => i !== index));
    addToast('Bill photo removed', 'info');
  };

  // ===== SAVE =====
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError('');

    const item: LockerItem = {
      id: generateUUID(),
      name: name.trim(),
      description: description.trim(),
      category: category as MainCategory,
      subType,
      subTypeCustom,
      categoryCustom,
      weightAmount,
      weightUnit,
      pieceCount,
      dateAdded: new Date(date).toISOString(),
      photos,
      billPhotos,
    };

    const result = await saveItem(item);
    setIsSaving(false);

    if (result.success) {
      addToast('Item saved!', 'success');
      goBack();
    } else {
      setSaveError(result.error || 'Failed to save. Storage may be full.');
      addToast(result.error || 'Save failed', 'error');
    }
  };

  // Test photo for debugging
  const addTestPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 200, 200);
    grad.addColorStop(0, '#C9A84C');
    grad.addColorStop(1, '#0A1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEST', 100, 110);
    setPhotos((prev) => [...prev, canvas.toDataURL('image/png')]);
    addToast('Test photo added', 'success');
  };

  const weightHint = [
    weightAmount,
    weightUnit,
    pieceCount ? `${pieceCount} pcs` : '',
  ].filter(Boolean).join(' \u00B7 ');

  const isValid = name.trim().length > 0 && category !== '' &&
    !(category === 'Other' && !categoryCustom.trim()) &&
    !((isJewelCategory(category) || category === 'Documents') && !subType);

  // ===== FILE INPUT BUTTON COMPONENT =====
  // Uses the transparent overlay pattern - input is inside label, opacity 0, covers full area
  // This is the most reliable pattern for ALL browsers including Chrome on Android
  const FileInputButton = ({
    onChange,
    acceptMultiple = false,
    capture = false,
    icon: Icon,
    label,
    colorClass,
  }: {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    acceptMultiple?: boolean;
    capture?: boolean;
    icon: React.ElementType;
    label: string;
    colorClass: string;
  }) => (
    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] ${colorClass} text-sm font-medium active:bg-[#1A3A5C] active:scale-95 transition-all select-none cursor-pointer relative overflow-hidden`}>
      <Icon className="w-4 h-4 pointer-events-none" />
      <span className="pointer-events-none">{label}</span>
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' } : {})}
        {...(acceptMultiple ? { multiple: true } : {})}
        onChange={onChange}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          fontSize: '100px', // ensures input is clickable on all devices
        }}
      />
    </label>
  );

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[90%] ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-[#1A3A5C] text-white border border-[#C9A84C]/30'
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
        <h1 className="flex-1 text-center text-lg font-bold text-white pr-8" style={{ fontFamily: "'Playfair Display', serif" }}>
          Add Item
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
        {/* Item Name */}
        <div className="mb-5">
          <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">
            Item Name <span className="text-red-400">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
            placeholder="e.g., Gold Chain with Pendant"
            className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </div>

        {/* CATEGORY Level 1 */}
        <div className="mb-5">
          <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">
            Category <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MAIN_CATEGORIES.map((cat) => {
              const color = CATEGORY_COLORS[cat];
              const isSelected = category === cat;
              return (
                <button key={cat} onClick={() => handleCategorySelect(cat)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
                    isSelected ? 'border-transparent text-[#0A1628]' : 'bg-[#111D2E] border-[#1A3A5C] text-white hover:border-[#C9A84C]/30'
                  }`}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {cat === 'Gold' && <span className="mr-1">🥇</span>}
                  {cat === 'Silver' && <span className="mr-1">🥈</span>}
                  {cat === 'Platinum' && <span className="mr-1">💎</span>}
                  {cat === 'Diamond' && <span className="mr-1">💍</span>}
                  {cat === 'Documents' && <span className="mr-1">📄</span>}
                  {cat === 'Other' && <span className="mr-1">📦</span>}
                  {cat}
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
        </div>

        {/* CATEGORY Level 2 */}
        {availableSubTypes.length > 0 && (
          <div className="mb-5 animate-fade-in">
            <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">
              {isJewelCategory(category) ? 'Item Type' : 'Document Type'} <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSubTypes.map((st) => {
                const isSelected = subType === st;
                return (
                  <button key={st} onClick={() => handleSubTypeSelect(st)}
                    className={`px-3.5 py-2 rounded-xl text-sm transition-all active:scale-95 border ${
                      isSelected ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628] font-medium' : 'bg-[#111D2E] border-[#1A3A5C] text-white hover:border-[#C9A84C]/30'
                    }`}
                  >{st}</button>
                );
              })}
            </div>
            {errors.subType && <p className="text-xs text-red-400 mt-1">{errors.subType}</p>}

            {showSubTypeCustom && (
              <div className="mt-3 animate-fade-in">
                <input type="text" value={subTypeCustom}
                  onChange={(e) => { setSubTypeCustom(e.target.value); setErrors((p) => ({ ...p, subTypeCustom: '' })); }}
                  placeholder={isJewelCategory(category) ? 'Describe the item type...' : 'Describe the document type...'}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
                />
                {errors.subTypeCustom && <p className="text-xs text-red-400 mt-1">{errors.subTypeCustom}</p>}
              </div>
            )}
          </div>
        )}

        {/* Other */}
        {showOtherInput && (
          <div className="mb-5 animate-fade-in">
            <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">
              Describe the category <span className="text-red-400">*</span>
            </label>
            <input type="text" value={categoryCustom}
              onChange={(e) => { setCategoryCustom(e.target.value); setErrors((p) => ({ ...p, categoryCustom: '' })); }}
              placeholder="e.g., Antique coin, Watch..." maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
            />
            {errors.categoryCustom && <p className="text-xs text-red-400 mt-1">{errors.categoryCustom}</p>}
          </div>
        )}

        {/* WEIGHT */}
        {showWeightSection && (
          <div className="mb-5 animate-fade-in">
            <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">Weight / Quantity</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-[#8A94A6] mb-1 block">Amount</label>
                <input type="text" inputMode="decimal" value={weightAmount}
                  onChange={(e) => handleWeightAmountChange(e.target.value)}
                  placeholder="e.g., 22.5" maxLength={8}
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] text-[#8A94A6] mb-1 block">Unit</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableWeightUnits.map((unit) => (
                    <button key={unit} onClick={() => setWeightUnit(unit as WeightUnit)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
                        weightUnit === unit ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628]' : 'bg-[#111D2E] border-[#1A3A5C] text-white'
                      }`}
                    >{unit}</button>
                  ))}
                </div>
              </div>
            </div>
            {weightHint && <p className="text-xs text-[#8A94A6]/60 mt-2">{weightHint}</p>}
            {!weightHint && <p className="text-xs text-[#8A94A6]/40 mt-2">e.g., 22.5 g &middot; 2 pcs</p>}

            {showPieceCount && (
              <div className="mt-3 animate-fade-in">
                <label className="text-[10px] text-[#8A94A6] mb-1 block">No. of Pieces</label>
                <input type="text" inputMode="numeric" value={pieceCount}
                  onChange={(e) => handlePieceCountChange(e.target.value)} placeholder="e.g., 2"
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
                />
                {errors.pieceCount && <p className="text-xs text-red-400 mt-1">{errors.pieceCount}</p>}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="mb-5">
          <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 22kt gold chain with pendant, 15g" rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors resize-none"
          />
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Date Added</label>
          <div className="relative">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white text-sm focus:border-[#C9A84C]/50 transition-colors appearance-none"
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A94A6] pointer-events-none" />
          </div>
        </div>

        {/* === PHOTOS - TRANSPARENT OVERLAY PATTERN === */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A94A6] uppercase tracking-wider">Photos ({photos.length}/5)</span>
            <button onClick={addTestPhoto} className="text-[10px] text-[#8A94A6]/50 underline">Debug: Test</button>
          </div>

          {/* Buttons use transparent overlay input pattern */}
          <div className="flex gap-3 mb-3">
            <FileInputButton
              onChange={handlePhotoInputChange}
              capture
              icon={Camera}
              label="Take Photo"
              colorClass="text-[#C9A84C]"
            />
            <FileInputButton
              onChange={handlePhotoInputChange}
              acceptMultiple
              icon={ImageIcon}
              label="Gallery"
              colorClass="text-[#C9A84C]"
            />
          </div>

          {errors.photo && <p className="text-xs text-red-400 mb-2">{errors.photo}</p>}

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((photo, index) => (
                <div key={index} className="relative animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-[#C9A84C]/40 bg-[#111D2E]"
                    onError={() => addToast(`Photo ${index + 1} display error`, 'error')}
                  />
                  <button onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  ><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === BILL PHOTOS - TRANSPARENT OVERLAY PATTERN === */}
        <div className="mb-5">
          <button onClick={() => setShowBillSection((v) => !v)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] active:bg-[#1A3A5C] active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Bill / Certificate Photo</p>
              <p className="text-xs text-[#8A94A6]">
                {billPhotos.length > 0 ? `${billPhotos.length} attached` : 'Optional — tap to expand'}
              </p>
            </div>
            {showBillSection ? <ChevronUp className="w-4 h-4 text-[#8A94A6]" /> : <ChevronDown className="w-4 h-4 text-[#8A94A6]" />}
          </button>

          {showBillSection && (
            <div className="mt-3 animate-fade-in">
              <div className="flex gap-3 mb-3">
                <FileInputButton
                  onChange={handleBillInputChange}
                  capture
                  icon={Camera}
                  label="Take Photo"
                  colorClass="text-[#10B981]"
                />
                <FileInputButton
                  onChange={handleBillInputChange}
                  acceptMultiple
                  icon={ImageIcon}
                  label="Gallery"
                  colorClass="text-[#10B981]"
                />
              </div>

              {errors.billPhoto && <p className="text-xs text-red-400 mb-2">{errors.billPhoto}</p>}

              {billPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {billPhotos.map((photo, index) => (
                    <div key={index} className="relative animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
                      <img src={photo} alt={`Bill ${index + 1}`}
                        className="w-20 h-20 rounded-xl object-cover border-2 border-[#10B981]/40 bg-[#111D2E]"
                        onError={() => addToast(`Bill photo ${index + 1} display error`, 'error')}
                      />
                      <button onClick={() => removeBillPhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                      ><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-[#8A94A6]/50 mt-2">{billPhotos.length}/3</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="absolute bottom-20 left-0 right-0 px-5 z-20">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#0A1628] via-[#0A1628] to-transparent z-10">
        <button onClick={handleSave} disabled={!isValid || isSaving}
          className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
            isValid && !isSaving
              ? 'bg-[#C9A84C] text-[#0A1628] shadow-lg shadow-[#C9A84C]/20'
              : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
          }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            `Save to ${APP_NAME}`
          )}
        </button>
      </div>
    </div>
  );
}
