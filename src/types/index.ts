export interface Locker {
  id: string;
  name: string;
  bankName?: string;
  branch?: string;
  location?: string;
  description?: string;
  createdAt: string;
}

export interface LockerItem {
  id: string;
  lockerId: string;
  name: string;
  description: string;
  category: MainCategory;
  subType: string;
  subTypeCustom: string;
  categoryCustom: string;
  weightAmount: string;
  weightUnit: WeightUnit;
  pieceCount: string;
  sovereign: string;
  amount: string;
  dateAdded: string;
  photos: string[];
  billPhotos: string[];
  inLocker: boolean;
}

export interface SecretQuestions {
  question1: string;
  answer1: string;
  question2: string;
  answer2: string;
  question3: string;
  answer3: string;
}

export type ScreenName =
  | 'splash'
  | 'setup'
  | 'auth'
  | 'home'
  | 'lockerList'
  | 'lockerDetail'
  | 'addItem'
  | 'itemDetail'
  | 'settings'
  | 'manageLockers'
  | 'migrating';

export type MainCategory =
  | 'Gold'
  | 'Silver'
  | 'Platinum'
  | 'Diamond'
  | 'Documents'
  | 'Other';

export type WeightUnit = 'g' | 'kg' | 'mg' | 'ct' | 'pcs';

export interface AppAlert {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

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

export function isValidPhoto(photo: string): boolean {
  return typeof photo === 'string' && photo.startsWith('data:image/');
}

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

export const SECRET_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What was the name of your first pet?',
  'What is your favorite childhood movie?',
  'What city were you born in?',
  'What was your childhood nickname?',
  'What is the name of your favorite teacher?',
  'What was the model of your first phone?',
  'What is your favorite book?',
  'What was the name of your childhood best friend?',
];
