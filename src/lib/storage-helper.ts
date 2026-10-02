import { v4 as uuidv4 } from 'uuid';
import { firebaseConfig } from '@/firebase/config';

/**
 * Saves a file buffer to Firebase / Google Cloud Storage and returns
 * a permanent, secure download URL without requiring the 'iam.serviceAccounts.signBlob' permission.
 *
 * It uses the standard Firebase Storage token mechanism (firebaseStorageDownloadTokens),
 * which is the exact same mechanism used by the client-side Firebase SDK's getDownloadURL().
 */
export async function saveFileAndGetDownloadUrl(
  fileUpload: any,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  const downloadToken = uuidv4();
  const mimeType = contentType || 'application/octet-stream';

  // 1. Save buffer with firebaseStorageDownloadTokens in custom metadata
  await fileUpload.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  // 2. Resolve bucket name
  const bucketName =
    fileUpload.bucket?.name ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    firebaseConfig.storageBucket ||
    'studio-6533808029-72cdc.firebasestorage.app';

  // 3. Attempt makePublic in case bucket allows it (fail silently if Uniform Bucket Level Access is on)
  try {
    if (typeof fileUpload.makePublic === 'function') {
      await fileUpload.makePublic();
    }
  } catch {
    // Non-fatal if bucket has uniform bucket-level access
  }

  // 4. Return the canonical Firebase Storage media URL with the persistent token
  const encodedPath = encodeURIComponent(fileUpload.name);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
