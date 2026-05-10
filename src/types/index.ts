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
