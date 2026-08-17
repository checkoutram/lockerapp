import { registerPlugin } from '@capacitor/core';

export interface EncryptPhotoResult {
  success: boolean;
  outputPath: string;
}

export interface DecryptPhotoResult {
  base64: string;
}

export interface DeleteFileResult {
  deleted: boolean;
}

export interface MigrationResult {
  migrated: number;
  alreadyDone: boolean;
}

export interface BackupResult {
  backupBase64: string;
  photoCount: number;
}

export interface RestoreResult {
  restored: number;
  success: boolean;
}

export interface PhotoEncryptionPlugin {
  encryptPhoto(options: { base64Data: string; outputPath: string }): Promise<EncryptPhotoResult>;
  decryptPhoto(options: { encPath: string }): Promise<DecryptPhotoResult>;
  deleteFile(options: { filePath: string }): Promise<DeleteFileResult>;
  migrateExistingPhotos(): Promise<MigrationResult>;
  isMigrationDone(): Promise<{ done: boolean }>;
  createSecureBackup(options: { password: string }): Promise<BackupResult>;
  restoreSecureBackup(options: { password: string; backupBase64: string }): Promise<RestoreResult>;
}

const PhotoEncryption = registerPlugin<PhotoEncryptionPlugin>('PhotoEncryption');
export default PhotoEncryption;
