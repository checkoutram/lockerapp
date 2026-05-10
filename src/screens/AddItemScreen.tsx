import { useState } from 'react';
import { ChevronLeft, Camera, ImageIcon, X, Calendar } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { saveItem, FileSystem } from '@/utils/storage';
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
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) return;

    const toProcess = Math.min(files.length, remainingSlots);
    for (let i = 0; i < toProcess; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const photoId = `${FileSystem.documentDirectory}${generateUUID()}.jpg`;
          FileSystem.writeAsStringAsync(photoId, base64)
            .then(() => {
              setPhotos((prev) => [...prev, photoId]);
            })
            .catch(() => {
              console.error('Failed to save photo');
            });
        }
      };
      reader.onerror = () => {
        console.error('Failed to read file');
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    const photoUri = photos[index];
    FileSystem.deleteAsync(photoUri);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!validate()) return;
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
    };
    await saveItem(item);
    goBack();
  };

  const weightHint = [
    weightAmount,
    weightUnit,
    pieceCount ? `${pieceCount} pcs` : '',
  ].filter(Boolean).join(' \u00B7 ');

  const isValid = name.trim().length > 0 && category !== '' &&
    !(category === 'Other' && !categoryCustom.trim()) &&
    !((isJewelCategory(category) || category === 'Documents') && !subType);

  return (
    <div className="h-full flex flex-col bg-[#0A1628] relative">
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

        {/* CATEGORY — Level 1: Main Category */}
        <div className="mb-5">
          <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">
            Category <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MAIN_CATEGORIES.map((cat) => {
              const color = CATEGORY_COLORS[cat];
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
                    isSelected
                      ? 'border-transparent text-[#0A1628]'
                      : 'bg-[#111D2E] border-[#1A3A5C] text-white hover:border-[#C9A84C]/30'
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

        {/* CATEGORY — Level 2: Sub-type chips */}
        {availableSubTypes.length > 0 && (
          <div className="mb-5 animate-fade-in">
            <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">
              {isJewelCategory(category) ? 'Item Type' : 'Document Type'} <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSubTypes.map((st) => {
                const isSelected = subType === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleSubTypeSelect(st)}
                    className={`px-3.5 py-2 rounded-xl text-sm transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628] font-medium'
                        : 'bg-[#111D2E] border-[#1A3A5C] text-white hover:border-[#C9A84C]/30'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
            {errors.subType && <p className="text-xs text-red-400 mt-1">{errors.subType}</p>}

            {/* Custom sub-type input */}
            {showSubTypeCustom && (
              <div className="mt-3 animate-fade-in">
                <input
                  type="text"
                  value={subTypeCustom}
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

        {/* Other category custom input */}
        {showOtherInput && (
          <div className="mb-5 animate-fade-in">
            <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">
              Describe the category <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={categoryCustom}
              onChange={(e) => { setCategoryCustom(e.target.value); setErrors((p) => ({ ...p, categoryCustom: '' })); }}
              placeholder="e.g., Antique coin, Watch, USB drive..."
              maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
            />
            {errors.categoryCustom && <p className="text-xs text-red-400 mt-1">{errors.categoryCustom}</p>}
          </div>
        )}

        {/* WEIGHT / QUANTITY SECTION */}
        {showWeightSection && (
          <div className="mb-5 animate-fade-in">
            <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-3 block">
              Weight / Quantity
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-[#8A94A6] mb-1 block">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightAmount}
                  onChange={(e) => handleWeightAmountChange(e.target.value)}
                  placeholder="e.g., 22.5"
                  maxLength={8}
                  className="w-full px-4 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-white placeholder-[#8A94A6]/40 text-sm focus:border-[#C9A84C]/50 transition-colors"
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] text-[#8A94A6] mb-1 block">Unit</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableWeightUnits.map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setWeightUnit(unit)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
                        weightUnit === unit
                          ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A1628]'
                          : 'bg-[#111D2E] border-[#1A3A5C] text-white'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {weightHint && (
              <p className="text-xs text-[#8A94A6]/60 mt-2">{weightHint}</p>
            )}
            {!weightHint && (
              <p className="text-xs text-[#8A94A6]/40 mt-2">e.g., 22.5 g &middot; 2 pcs</p>
            )}
            {errors.weight && <p className="text-xs text-red-400 mt-1">{errors.weight}</p>}

            {/* Piece Count */}
            {showPieceCount && (
              <div className="mt-3 animate-fade-in">
                <label className="text-[10px] text-[#8A94A6] mb-1 block">No. of Pieces</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pieceCount}
                  onChange={(e) => handlePieceCountChange(e.target.value)}
                  placeholder="e.g., 2"
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

        {/* Photos */}
        <div className="mb-4">
          <label className="text-xs text-[#8A94A6] uppercase tracking-wider mb-2 block">Photos ({photos.length}/5)</label>
          <div className="flex gap-3 mb-3 relative">
            {/* Take Photo — file input overlays the button */}
            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium active:bg-[#1A3A5C] active:scale-95 transition-all relative cursor-pointer overflow-hidden">
              <Camera className="w-4 h-4" />Take Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhotoSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            {/* Gallery — file input overlays the button */}
            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#111D2E] border border-[#1A3A5C] text-[#C9A84C] text-sm font-medium active:bg-[#1A3A5C] active:scale-95 transition-all relative cursor-pointer overflow-hidden">
              <ImageIcon className="w-4 h-4" />Gallery
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((photo, index) => (
                <div key={index} className="relative animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <img src={photo} alt={`Photo ${index + 1}`} className="photo-thumbnail" />
                  <button onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#0A1628] via-[#0A1628] to-transparent z-10">
        <button onClick={handleSave}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
            isValid
              ? 'bg-[#C9A84C] text-[#0A1628] shadow-lg shadow-[#C9A84C]/20'
              : 'bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]'
          }`}
        >
          Save to {APP_NAME}
        </button>
      </div>
    </div>
  );
}
