package com.vlocker.app;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

@CapacitorPlugin(name = "PhotoEncryption")
public class PhotoEncryptionPlugin extends Plugin {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "vlocker_master_key_v1";
    private static final String AES_GCM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;
    private static final int AES_KEY_SIZE = 256;

    private static final String PREFS_NAME = "vlocker_enc_prefs";
    private static final String PREF_MIGRATION_DONE = "migration_done_v1";
    private static final String PREF_BACKUP_SALT = "backup_salt";
    private static final String PREF_WRAPPED_KEY = "wrapped_master_key";

    private Context context;

    @Override
    public void load() {
        context = getContext();
        ensureMasterKeyExists();
    }

    /**
     * Generate or retrieve the master AES-256 key from Android Keystore.
     */
    private synchronized void ensureMasterKeyExists() {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (!keyStore.containsAlias(KEY_ALIAS)) {
                KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                        KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(AES_KEY_SIZE)
                        .setRandomizedEncryptionRequired(true)
                        .build();

                KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
                keyGenerator.init(spec);
                keyGenerator.generateKey();
                Log.i("PhotoEncryption", "Master key generated in Android Keystore");
            }
        } catch (Exception e) {
            Log.e("PhotoEncryption", "Failed to ensure master key", e);
        }
    }

    private SecretKey getMasterKey() throws GeneralSecurityException, IOException {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        SecretKey key = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        if (key == null) {
            throw new GeneralSecurityException("Master key not found in Keystore");
        }
        return key;
    }

    /**
     * Encrypt photo bytes and save to .enc file.
     * Format: [12-byte IV][ciphertext + 128-bit GCM auth tag]
     */
    @PluginMethod
    public void encryptPhoto(PluginCall call) {
        try {
            String inputPath = call.getString("inputPath");
            String outputPath = call.getString("outputPath");
            if (inputPath == null || outputPath == null) {
                call.reject("Missing inputPath or outputPath");
                return;
            }

            // Read input file
            File inputFile = new File(context.getFilesDir(), inputPath);
            byte[] plainBytes = readFile(inputFile);

            // Encrypt
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_GCM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, getMasterKey(), spec);
            byte[] cipherBytes = cipher.doFinal(plainBytes);

            // Write: IV + ciphertext
            File outputFile = new File(context.getFilesDir(), outputPath);
            outputFile.getParentFile().mkdirs();
            try (FileOutputStream fos = new FileOutputStream(outputFile)) {
                fos.write(iv);
                fos.write(cipherBytes);
            }

            // Verify by decrypting immediately
            byte[] verifyBytes = decryptFile(outputFile);
            if (!Arrays.equals(plainBytes, verifyBytes)) {
                outputFile.delete();
                call.reject("Encryption verification failed");
                return;
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("outputPath", outputPath);
            call.resolve(result);

        } catch (Exception e) {
            Log.e("PhotoEncryption", "encryptPhoto failed", e);
            call.reject("Encryption failed: " + e.getMessage());
        }
    }

    /**
     * Decrypt .enc file and return base64 image data.
     */
    @PluginMethod
    public void decryptPhoto(PluginCall call) {
        try {
            String encPath = call.getString("encPath");
            if (encPath == null) {
                call.reject("Missing encPath");
                return;
            }

            File encFile = new File(context.getFilesDir(), encPath);
            byte[] plainBytes = decryptFile(encFile);

            String base64 = Base64.encodeToString(plainBytes, Base64.NO_WRAP);
            JSObject result = new JSObject();
            result.put("base64", "data:image/jpeg;base64," + base64);
            call.resolve(result);

        } catch (Exception e) {
            Log.e("PhotoEncryption", "decryptPhoto failed", e);
            call.reject("Decryption failed: " + e.getMessage());
        }
    }

    /**
     * Delete a file.
     */
    @PluginMethod
    public void deleteFile(PluginCall call) {
        try {
            String filePath = call.getString("filePath");
            if (filePath == null) {
                call.reject("Missing filePath");
                return;
            }
            File file = new File(context.getFilesDir(), filePath);
            boolean deleted = file.delete();
            JSObject result = new JSObject();
            result.put("deleted", deleted);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Delete failed: " + e.getMessage());
        }
    }

    /**
     * Migrate existing .jpg/.jpeg/.png files to .enc format.
     */
    @PluginMethod
    public void migrateExistingPhotos(PluginCall call) {
        new Thread(() -> {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                if (prefs.getBoolean(PREF_MIGRATION_DONE, false)) {
                    JSObject result = new JSObject();
                    result.put("migrated", 0);
                    result.put("alreadyDone", true);
                    call.resolve(result);
                    return;
                }

                File photosDir = new File(context.getFilesDir(), "photos");
                if (!photosDir.exists() || !photosDir.isDirectory()) {
                    prefs.edit().putBoolean(PREF_MIGRATION_DONE, true).apply();
                    JSObject result = new JSObject();
                    result.put("migrated", 0);
                    result.put("alreadyDone", true);
                    call.resolve(result);
                    return;
                }

                File[] files = photosDir.listFiles();
                if (files == null) {
                    prefs.edit().putBoolean(PREF_MIGRATION_DONE, true).apply();
                    JSObject result = new JSObject();
                    result.put("migrated", 0);
                    call.resolve(result);
                    return;
                }

                int migratedCount = 0;
                for (File file : files) {
                    String name = file.getName().toLowerCase();
                    if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")) {
                        String encName = file.getName().replaceAll("(?i)\\.(jpg|jpeg|png)$", ".enc");
                        File encFile = new File(photosDir, encName);

                        // Skip if .enc already exists
                        if (encFile.exists()) {
                            file.delete();
                            migratedCount++;
                            continue;
                        }

                        try {
                            byte[] plainBytes = readFile(file);
                            byte[] iv = new byte[GCM_IV_LENGTH];
                            new SecureRandom().nextBytes(iv);

                            Cipher cipher = Cipher.getInstance(AES_GCM);
                            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
                            cipher.init(Cipher.ENCRYPT_MODE, getMasterKey(), spec);
                            byte[] cipherBytes = cipher.doFinal(plainBytes);

                            try (FileOutputStream fos = new FileOutputStream(encFile)) {
                                fos.write(iv);
                                fos.write(cipherBytes);
                            }

                            // Verify
                            byte[] verify = decryptFile(encFile);
                            if (Arrays.equals(plainBytes, verify)) {
                                file.delete();
                                migratedCount++;
                            } else {
                                encFile.delete();
                            }
                        } catch (Exception e) {
                            Log.e("PhotoEncryption", "Migration failed for " + file.getName(), e);
                        }
                    }
                }

                prefs.edit().putBoolean(PREF_MIGRATION_DONE, true).apply();
                JSObject result = new JSObject();
                result.put("migrated", migratedCount);
                result.put("alreadyDone", false);
                call.resolve(result);

            } catch (Exception e) {
                Log.e("PhotoEncryption", "Migration failed", e);
                call.reject("Migration failed: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Check if migration is done.
     */
    @PluginMethod
    public void isMigrationDone(PluginCall call) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean done = prefs.getBoolean(PREF_MIGRATION_DONE, false);
        JSObject result = new JSObject();
        result.put("done", done);
        call.resolve(result);
    }

    /**
     * Create secure backup with password-derived key.
     * Returns: { salt, kdfParams, wrappedKey, encPhotos[] }
     */
    @PluginMethod
    public void createSecureBackup(PluginCall call) {
        new Thread(() -> {
            try {
                String password = call.getString("password");
                if (password == null || password.length() < 6) {
                    call.reject("Password must be at least 6 characters");
                    return;
                }

                // Generate salt
                byte[] salt = new byte[16];
                new SecureRandom().nextBytes(salt);

                // Derive key from password using PBKDF2
                byte[] derivedKey = deriveKey(password, salt, 100000);
                SecretKey wrapKey = new SecretKeySpec(derivedKey, "AES");

                // Get master key bytes (this only works for software keys; Keystore keys don't expose raw bytes)
                // For Keystore keys, we use the key itself to wrap data
                // Since Keystore keys can't be exported, we generate a random AES key, wrap it with password-derived key,
                // and encrypt photos with that random key
                byte[] randomKeyBytes = new byte[32];
                new SecureRandom().nextBytes(randomKeyBytes);
                SecretKey randomKey = new SecretKeySpec(randomKeyBytes, "AES");

                // Wrap the random key with password-derived key
                Cipher wrapCipher = Cipher.getInstance("AES/GCM/NoPadding");
                byte[] wrapIv = new byte[12];
                new SecureRandom().nextBytes(wrapIv);
                wrapCipher.init(Cipher.ENCRYPT_MODE, wrapKey, new GCMParameterSpec(128, wrapIv));
                byte[] wrappedKey = wrapCipher.doFinal(randomKeyBytes);

                // Collect encrypted photos
                File photosDir = new File(context.getFilesDir(), "photos");
                JSObject backupData = new JSObject();
                backupData.put("salt", Base64.encodeToString(salt, Base64.NO_WRAP));
                backupData.put("kdfIterations", 100000);
                backupData.put("wrapIv", Base64.encodeToString(wrapIv, Base64.NO_WRAP));
                backupData.put("wrappedKey", Base64.encodeToString(wrappedKey, Base64.NO_WRAP));

                // Encrypt photos with the random key
                org.json.JSONArray photoArray = new org.json.JSONArray();
                if (photosDir.exists() && photosDir.isDirectory()) {
                    File[] files = photosDir.listFiles((dir, name) -> name.endsWith(".enc"));
                    if (files != null) {
                        for (File file : files) {
                            byte[] fileBytes = readFile(file);
                            // Re-encrypt with backup key
                            byte[] bkIv = new byte[12];
                            new SecureRandom().nextBytes(bkIv);
                            Cipher bkCipher = Cipher.getInstance(AES_GCM);
                            bkCipher.init(Cipher.ENCRYPT_MODE, randomKey, new GCMParameterSpec(GCM_TAG_LENGTH, bkIv));
                            byte[] bkCipherBytes = bkCipher.doFinal(fileBytes);

                            JSObject photoObj = new JSObject();
                            photoObj.put("name", file.getName());
                            photoObj.put("iv", Base64.encodeToString(bkIv, Base64.NO_WRAP));
                            photoObj.put("data", Base64.encodeToString(bkCipherBytes, Base64.NO_WRAP));
                            photoArray.put(photoObj);
                        }
                    }
                }
                backupData.put("photos", photoArray.toString());

                // Also backup metadata
                android.content.SharedPreferences mainPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String itemsJson = mainPrefs.getString("vlocker_items", "[]");
                backupData.put("items", itemsJson);

                // Save backup data to file
                String backupJson = backupData.toString();
                File backupFile = new File(context.getFilesDir(), "vlocker_backup_enc.json");
                try (FileOutputStream fos = new FileOutputStream(backupFile)) {
                    fos.write(backupJson.getBytes("UTF-8"));
                }

                // Return backup as base64 string for export
                String backupBase64 = Base64.encodeToString(backupJson.getBytes("UTF-8"), Base64.NO_WRAP);
                JSObject result = new JSObject();
                result.put("backupBase64", backupBase64);
                result.put("photoCount", photoArray.length());
                call.resolve(result);

            } catch (Exception e) {
                Log.e("PhotoEncryption", "Backup failed", e);
                call.reject("Backup failed: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Restore from secure backup.
     */
    @PluginMethod
    public void restoreSecureBackup(PluginCall call) {
        new Thread(() -> {
            try {
                String password = call.getString("password");
                String backupBase64 = call.getString("backupBase64");
                if (password == null || backupBase64 == null) {
                    call.reject("Missing password or backup data");
                    return;
                }

                byte[] backupBytes = Base64.decode(backupBase64, Base64.DEFAULT);
                String backupJson = new String(backupBytes, "UTF-8");
                org.json.JSONObject backup = new org.json.JSONObject(backupJson);

                byte[] salt = Base64.decode(backup.getString("salt"), Base64.DEFAULT);
                int iterations = backup.getInt("kdfIterations");
                byte[] wrapIv = Base64.decode(backup.getString("wrapIv"), Base64.DEFAULT);
                byte[] wrappedKey = Base64.decode(backup.getString("wrappedKey"), Base64.DEFAULT);

                // Derive key
                byte[] derivedKey = deriveKey(password, salt, iterations);
                SecretKey wrapKey = new SecretKeySpec(derivedKey, "AES");

                // Unwrap key
                Cipher unwrapCipher = Cipher.getInstance("AES/GCM/NoPadding");
                unwrapCipher.init(Cipher.DECRYPT_MODE, wrapKey, new GCMParameterSpec(128, wrapIv));
                byte[] randomKeyBytes = unwrapCipher.doFinal(wrappedKey);
                SecretKey randomKey = new SecretKeySpec(randomKeyBytes, "AES");

                // Restore photos
                org.json.JSONArray photos = new org.json.JSONArray(backup.getString("photos"));
                File photosDir = new File(context.getFilesDir(), "photos");
                photosDir.mkdirs();

                for (int i = 0; i < photos.length(); i++) {
                    org.json.JSONObject photo = photos.getJSONObject(i);
                    String name = photo.getString("name");
                    byte[] bkIv = Base64.decode(photo.getString("iv"), Base64.DEFAULT);
                    byte[] bkData = Base64.decode(photo.getString("data"), Base64.DEFAULT);

                    Cipher bkCipher = Cipher.getInstance(AES_GCM);
                    bkCipher.init(Cipher.DECRYPT_MODE, randomKey, new GCMParameterSpec(GCM_TAG_LENGTH, bkIv));
                    byte[] encData = bkCipher.doFinal(bkData);

                    File outFile = new File(photosDir, name);
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        fos.write(encData);
                    }
                }

                // Restore items
                String itemsJson = backup.getString("items");
                android.content.SharedPreferences mainPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                mainPrefs.edit().putString("vlocker_items", itemsJson).apply();

                JSObject result = new JSObject();
                result.put("restored", photos.length());
                result.put("success", true);
                call.resolve(result);

            } catch (Exception e) {
                Log.e("PhotoEncryption", "Restore failed", e);
                call.reject("Restore failed: " + e.getMessage());
            }
        }).start();
    }

    // Helper methods

    private byte[] readFile(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = fis.read(buffer)) != -1) {
                baos.write(buffer, 0, read);
            }
            return baos.toByteArray();
        }
    }

    private byte[] decryptFile(File encFile) throws Exception {
        byte[] allBytes = readFile(encFile);
        if (allBytes.length < GCM_IV_LENGTH + 1) {
            throw new IOException("File too small to contain valid encrypted data");
        }
        byte[] iv = Arrays.copyOfRange(allBytes, 0, GCM_IV_LENGTH);
        byte[] cipherBytes = Arrays.copyOfRange(allBytes, GCM_IV_LENGTH, allBytes.length);

        Cipher cipher = Cipher.getInstance(AES_GCM);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, getMasterKey(), spec);
        return cipher.doFinal(cipherBytes);
    }

    private byte[] deriveKey(String password, byte[] salt, int iterations) throws Exception {
        javax.crypto.SecretKeyFactory factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
                password.toCharArray(), salt, iterations, 256);
        return factory.generateSecret(spec).getEncoded();
    }
}
