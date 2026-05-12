export interface LockerItem {
  id: string;
  name: string;
  description: string;
  category: MainCategory;
  subType: string;
  subTypeCustom: string;
  categoryCustom: string;
  weightAmount: string;
  weightUnit: WeightUnit;
  pieceCount: string;
  dateAdded: string;
  photos: string[];
  billPhotos: string[];
  inLocker: boolean;
}

export type ScreenName =
  | 'splash'
  | 'setup'
  | 'auth'
  | 'home'
  | 'addItem'
  | 'itemDetail'
  | 'settings';

export type MainCategory =
  | 'Gold'
  | 'Silver'
  | 'Platinum'
  | 'Diamond'
  | 'Documents'
  | 'Other';

export type WeightUnit = 'g' | 'kg' | 'mg' | 'ct' | 'pcs';

export const MAIN_CATEGORIES: MainCategory[] = [
  'Gold',
  'Silver',
  'Platinum',
  'Diamond',
  'Documents',
  'Other',
];

export const JEWELLERY_SUBTYPES = [
  'Necklace',
  'Chain',
  'Pendant',
  'Bangle',
  'Bracelet',
  'Ring',
  'Earring',
  'Nose Ring',
  'Gold Coin',
  'Gold Bar',
  'Anklet',
  'Waist Chain',
  'Haram',
  'Choker',
  'Other (jewellery)',
];

export const DOCUMENT_SUBTYPES = [
  'Property Document',
  'Will / Testament',
  'Insurance Policy',
  'Fixed Deposit',
  'Bond / Certificate',
  'Passport',
  'Agreement / Deed',
  'Other (document)',
];

export const WEIGHT_UNITS: WeightUnit[] = ['g', 'kg', 'mg', 'ct', 'pcs'];

export const WEIGHT_UNITS_JEWELLERY: WeightUnit[] = ['g', 'kg', 'mg', 'pcs'];
export const WEIGHT_UNITS_DIAMOND: WeightUnit[] = ['ct', 'g', 'mg', 'pcs'];

export const DEFAULT_WEIGHT_UNIT: Record<string, WeightUnit> = {
  Gold: 'g',
  Silver: 'g',
  Platinum: 'g',
  Diamond: 'ct',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Gold: '#C9A84C',
  Silver: '#A8A9AD',
  Platinum: '#B4C4D4',
  Diamond: '#A8D8EA',
  Documents: '#7FB3D3',
  Other: '#95A5A6',
};

// Validate that a photo is a valid base64 data URL (not an old key string)
export function isValidPhoto(photo: string): boolean {
  return typeof photo === 'string' && photo.startsWith('data:image/');
}

// Filter out broken photos (old key strings) and return only valid ones
export function getValidPhotos(photos: string[] | undefined): string[] {
  if (!photos || !Array.isArray(photos)) return [];
  return photos.filter(isValidPhoto);
}

export const PIECE_COUNT_SUBTYPES = [
  'Gold Coin',
  'Gold Bar',
  'Bangle',
  'Ring',
  'Earring',
  'Anklet',
  'Bracelet',
];

export const APP_NAME = 'vlocker';
