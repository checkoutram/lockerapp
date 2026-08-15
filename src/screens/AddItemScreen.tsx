import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, ImageIcon, X, Calendar, Save, Lock, Unlock, Package } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useApp } from '@/context/AppContext';
import { saveItem, updateItem } from '@/utils/storage';
import { generateUUID } from '@/utils/crypto';
import { type LockerItem, type MainCategory, MAIN_CATEGORIES, APP_NAME } from '@/types';
import PhotoImage from '@/components/PhotoImage';

const CATEGORY_ICONS: Record<string, string> = {
  Gold: '🥇',
  Silver: '🥈',
  Cash: '💵',
  Documents: '📄',
  Diamond: '💎',
  Platinum: 'Pt',
  Other: '⋯',
};

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

export default function AddItemScreen() {
  const { goBack, navigate, lockers, items, screenData } = useApp();
  const preselectedLockerId = screenData?.preselectedLockerId;
  const editItem = screenData?.editItem as LockerItem | undefined;
  const isEditMode = !!editItem;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MainCategory | ''>('');
  const [weightAmount, setWeightAmount] = useState('');
  const [sovereign, setSovereign] = useState('');
  const [pieceCount, setPieceCount] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [inLocker, setInLocker] = useState(true);

  const [selectedLockerId, setSelectedLockerId] = useState(preselectedLockerId || (lockers[0]?.id || 'default'));
  const [showLockerDropdown, setShowLockerDropdown] = useState(false);
  const lockerDropdownRef = useRef<HTMLDivElement>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && editItem) {
      setName(editItem.name || '');
      setDescription(editItem.description || '');
      setCategory(editItem.category || '');
      setWeightAmount(editItem.weightAmount || '');
      setSovereign(editItem.sovereign || '');
      setPieceCount(editItem.pieceCount || '');
      setAmount(editItem.amount || '');
      setDate(editItem.dateAdded ? editItem.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0]);
      setPhotos(editItem.photos || []);
      setBillPhotos(editItem.billPhotos || []);
      setInLocker(editItem.inLocker !== false);
      if (editItem.lockerId) {
        setSelectedLockerId(editItem.lockerId);
      }
    }
  }, [isEditMode, editItem]);

  // Close dropdown on outside click/tap
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (lockerDropdownRef.current && !lockerDropdownRef.current.contains(e.target as Node)) {
        setShowLockerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const newId = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: newId, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId));
    }, 5000);
  }, []);

  const handleCategorySelect = (cat: MainCategory) => {
    setCategory(cat);
    setErrors((prev) => ({ ...prev, category: '' }));
  };

  const handleWeightAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
    setWeightAmount(final.slice(0, 8));
  };

  const handleSovereignChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
    setSovereign(final.slice(0, 5));
  };

  const handlePieceCountChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setPieceCount(clean.slice(0, 4));
  };

  const handleAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setAmount(clean.slice(0, 10));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Item name is required';
    if (!selectedLockerId) errs.locker = 'Please select a locker';
    if (!category) errs.category = 'Category is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const takePhoto = async (isBill: boolean) => {
    const prefix = isBill ? 'Bill' : 'Photo';
    const maxCount = isBill ? 3 : 5;
    const currentCount = isBill ? billPhotos.length : photos.length;
    if (currentCount >= maxCount) {
      addToast(`${prefix}: Maximum ${maxCount} reached`, 'error');
      return;
    }
    setIsPickingPhoto(true);
    try {
      const image = await CapCamera.getPhoto({
        quality: 80, allowEditing: false, resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera, width: 1200, height: 1200,
      });
      if (!image.dataUrl) {
        addToast(`${prefix}: No image data`, 'error');
        setIsPickingPhoto(false);
        return;
      }
      if (isBill) setBillPhotos((prev) => [...prev, image.dataUrl!]);
      else setPhotos((prev) => [...prev, image.dataUrl!]);
      addToast(`${prefix} saved`, 'success');
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('cancel') && !msg.includes('dismiss')) {
        addToast(`${prefix}: ${msg.includes('permission') ? 'Permission denied' : msg}`, 'error');
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const pickFromGallery = async (isBill: boolean) => {
    const prefix = isBill ? 'Bill' : 'Photo';
    const maxCount = isBill ? 3 : 5;
    const currentCount = isBill ? billPhotos.length : photos.length;
    if (currentCount >= maxCount) {
      addToast(`${prefix}: Maximum ${maxCount} reached`, 'error');
      return;
    }
    setIsPickingPhoto(true);
    try {
      const image = await CapCamera.getPhoto({
        quality: 80, allowEditing: false, resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos, width: 1200, height: 1200,
      });
      if (!image.dataUrl) {
        addToast(`${prefix}: No image data`, 'error');
        setIsPickingPhoto(false);
        return;
      }
      if (isBill) setBillPhotos((prev) => [...prev, image.dataUrl!]);
      else setPhotos((prev) => [...prev, image.dataUrl!]);
      addToast(`${prefix} saved`, 'success');
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('choose')) {
        addToast(`${prefix}: ${msg.includes('permission') ? 'Permission denied' : msg}`, 'error');
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    addToast('Photo removed', 'info');
  };

  const removeBillPhoto = (index: number) => {
    setBillPhotos((prev) => prev.filter((_, i) => i !== index));
    addToast('Bill photo removed', 'info');
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError('');

    const item: LockerItem = {
      id: isEditMode ? editItem!.id : generateUUID(),
      lockerId: selectedLockerId,
      name: name.trim(),
      description: description.trim(),
      category: category as MainCategory,
      subType: '',
      subTypeCustom: '',
      categoryCustom: '',
      weightAmount,
      weightUnit: 'g',
      pieceCount,
      sovereign,
      amount,
      dateAdded: new Date(date).toISOString(),
      photos,
      billPhotos,
      inLocker,
    };

    const result = isEditMode ? await updateItem(item) : await saveItem(item);
    setIsSaving(false);
    if (result.success) {
      addToast(isEditMode ? 'Item updated!' : 'Item saved!', 'success');
      if (isEditMode) {
        navigate('itemDetail', { item });
      } else {
        goBack();
      }
    } else {
      setSaveError(result.error || 'Failed to save');
      addToast(result.error || 'Save failed', 'error');
    }
  };

  const selectedLocker = lockers.find(l => l.id === selectedLockerId);
  const lockerItemsCount = items.filter(i => i.lockerId === selectedLockerId).length;

  return (
    <div className="h-full flex flex-col bg-[#050A12] relative">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-fade-in max-w-[95%] ${
              toast.type === 'success' ? 'bg-[#36B37E] text-[#F7F5EF]' :
              toast.type === 'error' ? 'bg-[#D66A6A] text-[#F7F5EF]' :
              'bg-[#1D344D] text-[#F7F5EF]'
            }`}
          >
            <span className="truncate">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2 shrink-0">
        <button onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full active:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-[#D6B45C]" />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <h1 className="text-base font-bold text-[#F7F5EF]">
            {isEditMode ? 'Edit Item' : `${selectedLocker?.name || 'Locker'} — Add Item`}
          </h1>
          {selectedLocker && (selectedLocker.bankName || selectedLocker.branch) && (
            <p className="text-xs text-[#A6B2C2]/70 mt-0.5">
              {selectedLocker.bankName}{selectedLocker.bankName && selectedLocker.branch ? ' • ' : ''}{selectedLocker.branch}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-[#0B1525] border border-[#1D344D] rounded-xl px-3 py-1.5">
          <Package className="w-3.5 h-3.5 text-[#D6B45C]" />
          <span className="text-xs text-[#F7F5EF] font-medium">{lockerItemsCount} Items</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-36">
        {/* Locker Selector */}
        {!isEditMode && lockers.length > 1 && (
          <div className="mb-5" ref={lockerDropdownRef}>
            <label className="text-sm text-[#F7F5EF] font-medium mb-2 block">
              Select Locker <span className="text-[#E98B8B]">*</span>
            </label>
            <button
              onClick={() => setShowLockerDropdown(!showLockerDropdown)}
              className="w-full px-4 py-3.5 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] text-sm flex items-center justify-between focus:border-[#D6B45C]/50 transition-colors outline-none"
            >
              <span>{selectedLocker?.name || 'Select a locker'}</span>
              <svg className={`w-4 h-4 text-[#A6B2C2] transition-transform ${showLockerDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLockerDropdown && (
              <div className="mt-1 bg-[#0B1525] border border-[#1D344D] rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                {lockers.map((locker) => (
                  <button
                    key={locker.id}
                    onClick={() => { setSelectedLockerId(locker.id); setShowLockerDropdown(false); setErrors((p) => ({ ...p, locker: '' })); }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${selectedLockerId === locker.id ? 'bg-[#1D344D] text-[#D6B45C]' : 'text-[#F7F5EF] hover:bg-[#14263B]'}`}
                  >
                    <span>{locker.name}</span>
                    <span className="text-xs text-[#A6B2C2]">{items.filter(i => i.lockerId === locker.id).length} items</span>
                  </button>
                ))}
              </div>
            )}
            {errors.locker && <p className="text-xs text-[#E98B8B] mt-1">{errors.locker}</p>}
          </div>
        )}

        {/* Item Name */}
        <div className="mb-5">
          <label className="text-sm text-[#F7F5EF] font-medium mb-2 block">
            Item Name <span className="text-[#E98B8B]">*</span>
          </label>
          <input type="text" value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
            placeholder="e.g., Gold Necklace"
            className="w-full px-4 py-3.5 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/50 text-sm focus:border-[#D6B45C]/50 transition-colors outline-none"
          />
          {errors.name && <p className="text-xs text-[#E98B8B] mt-1">{errors.name}</p>}
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="text-sm text-[#F7F5EF] font-medium mb-3 block">
            Category <span className="text-[#E98B8B]">*</span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            {MAIN_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              const icon = CATEGORY_ICONS[cat];
              return (
                <button key={cat} onClick={() => handleCategorySelect(cat)}
                  className={`flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] rounded-2xl text-xs font-medium transition-all active:scale-95 border ${
                    isSelected
                      ? 'border-[#D6B45C] bg-[#0B1525] text-[#D6B45C]'
                      : 'border-[#1D344D] bg-[#0B1525] text-[#A6B2C2]'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-xs text-[#E98B8B] mt-1">{errors.category}</p>}
        </div>

        {/* Weight / Sovereign / Pcs / Amount Row */}
        <div className="mb-5">
          <div className="grid grid-cols-4 gap-2.5 items-start">
            <div className="flex flex-col">
              <label className="text-xs text-[#A6B2C2] mb-1.5 block leading-tight min-h-[2.2em] flex items-end">Weight (Gram)</label>
              <input type="text" inputMode="decimal" value={weightAmount}
                onChange={(e) => handleWeightAmountChange(e.target.value)}
                placeholder="e.g., 25"
                className="w-full px-3 py-3 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/40 text-xs focus:border-[#D6B45C]/50 transition-colors outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-[#A6B2C2] mb-1.5 block leading-tight min-h-[2.2em] flex items-end">Sovereign</label>
              <input type="text" inputMode="decimal" value={sovereign}
                onChange={(e) => handleSovereignChange(e.target.value)}
                placeholder="e.g., 2"
                className="w-full px-3 py-3 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/40 text-xs focus:border-[#D6B45C]/50 transition-colors outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-[#A6B2C2] mb-1.5 block leading-tight min-h-[2.2em] flex items-end">Pcs</label>
              <input type="text" inputMode="numeric" value={pieceCount}
                onChange={(e) => handlePieceCountChange(e.target.value)}
                placeholder="e.g., 1"
                className="w-full px-3 py-3 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/40 text-xs focus:border-[#D6B45C]/50 transition-colors outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-[#A6B2C2] mb-1.5 block leading-tight min-h-[2.2em] flex items-end">Amount (₹)</label>
              <input type="text" inputMode="numeric" value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-3 py-3 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/40 text-xs focus:border-[#D6B45C]/50 transition-colors outline-none"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="text-sm text-[#F7F5EF] font-medium mb-2 block">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 22K gold necklace with stones" rows={3} maxLength={200}
            className="w-full px-4 py-3 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] placeholder-[#667487]/40 text-sm focus:border-[#D6B45C]/50 transition-colors resize-none outline-none"
          />
          <p className="text-right text-xs text-[#A6B2C2]/50 mt-1">{description.length}/200</p>
        </div>

        {/* Date Added */}
        <div className="mb-5">
          <label className="text-sm text-[#F7F5EF] font-medium mb-2 block">Date Added</label>
          <div className="relative">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-[#0B1525] border border-[#1D344D] text-[#F7F5EF] text-sm focus:border-[#D6B45C]/50 transition-colors appearance-none outline-none"
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A6B2C2] pointer-events-none" />
          </div>
        </div>

        {/* Item Photo */}
        <div className="mb-5">
          <label className="text-sm text-[#F7F5EF] font-medium mb-2 block">Item Photo</label>
          <div className="flex gap-3 mb-3">
            <button onClick={() => takePhoto(false)} disabled={isPickingPhoto}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0B1525] border border-dashed border-[#1D344D] text-[#F7F5EF] text-sm font-medium active:bg-[#1D344D] transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-[#A6B2C2]" />
              Take Photo
            </button>
            <button onClick={() => pickFromGallery(false)} disabled={isPickingPhoto}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0B1525] border border-dashed border-[#1D344D] text-[#F7F5EF] text-sm font-medium active:bg-[#1D344D] transition-all disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-[#A6B2C2]" />
              Gallery
            </button>
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <PhotoImage photoRef={photo} alt={`Photo ${index + 1}`}
                    className="w-20 h-20 rounded-xl object-cover border border-[#1D344D] bg-[#0B1525]"
                  />
                  <button onClick={() => removePhoto(index)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E98B8B] flex items-center justify-center shadow"
                  ><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill / Certificate Photo */}
        <div className="mb-5">
          <label className="text-sm text-[#F7F5EF] font-medium mb-0.5 block">Bill / Certificate Photo (Optional)</label>
          <p className="text-xs text-[#A6B2C2]/50 mb-2">Add bill or certificate for this item</p>
          <div className="flex gap-3 mb-3">
            <button onClick={() => takePhoto(true)} disabled={isPickingPhoto}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0B1525] border border-dashed border-[#1D344D] text-[#F7F5EF] text-sm font-medium active:bg-[#1D344D] transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-[#A6B2C2]" />
              Take Photo
            </button>
            <button onClick={() => pickFromGallery(true)} disabled={isPickingPhoto}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0B1525] border border-dashed border-[#1D344D] text-[#F7F5EF] text-sm font-medium active:bg-[#1D344D] transition-all disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-[#A6B2C2]" />
              Gallery
            </button>
          </div>
          {billPhotos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {billPhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <PhotoImage photoRef={photo} alt={`Bill ${index + 1}`}
                    className="w-20 h-20 rounded-xl object-cover border border-[#1D344D] bg-[#0B1525]"
                  />
                  <button onClick={() => removeBillPhoto(index)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E98B8B] flex items-center justify-center shadow"
                  ><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item Location Toggle */}
        <div className="mb-2">
          <label className="text-sm text-[#F7F5EF] font-medium mb-2 block">
            Item Location
          </label>
          <div className="flex rounded-2xl overflow-hidden border border-[#1D344D]">
            <button
              onClick={() => setInLocker(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
                inLocker
                  ? 'bg-[#1D344D] text-[#D6B45C]'
                  : 'bg-[#0B1525] text-[#A6B2C2]'
              }`}
            >
              <Lock className="w-4 h-4" />
              In Locker
            </button>
            <button
              onClick={() => setInLocker(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
                !inLocker
                  ? 'bg-[#1D344D] text-[#E98B8B]'
                  : 'bg-[#0B1525] text-[#A6B2C2]'
              }`}
            >
              <Unlock className="w-4 h-4" />
              Out of Locker
            </button>
          </div>
        </div>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="shrink-0 px-5 pb-2">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#3A2427] border border-red-500/30 text-[#E98B8B] text-xs">
            <span>{saveError}</span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="shrink-0 p-5 bg-gradient-to-t from-[#050A12] via-[#050A12] to-transparent z-10">
        <button onClick={handleSave} disabled={isSaving}
          className={`w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            !isSaving
              ? 'bg-[#D6B45C] text-[#050A12] shadow-lg shadow-[#D6B45C]/20'
              : 'bg-[#1D344D] text-[#A6B2C2]'
          }`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#D6B45C] border-t-transparent rounded-full animate-spin" />
              {isEditMode ? 'Updating...' : 'Saving...'}
            </span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEditMode ? 'Update Item' : `Save to ${APP_NAME.charAt(0).toUpperCase() + APP_NAME.slice(1)}`}
            </>
          )}
        </button>
      </div>
      {/* Photo Capture Loading Overlay */}
      {isPickingPhoto && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#D6B45C] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#F7F5EF] font-medium">Opening camera...</span>
          </div>
        </div>
      )}
    </div>
  );
}
