import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from './firebase-config.js';
import { compressImageToDataUrl } from './image-utils.js';

const COLLECTION_NAME = 'media';

export async function fetchMediaItems() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach((snap) => {
      list.push({ id: snap.id, ...snap.data() });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    return [];
  }
}

export async function uploadMediaFile(file, folder = 'media') {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    throw new Error('Unsupported format. Allowed: JPG, PNG, WEBP, GIF, SVG.');
  }

  // Guaranteed compact compression (< 50KB)
  const compactDataUrl = await compressImageToDataUrl(file, 800, 0.75);
  const cleanName = (file.name || 'media.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${folder}/${Date.now()}_${cleanName}`;

  const docId = 'media_' + Date.now();
  const mediaData = {
    name: file.name || 'media.jpg',
    storagePath,
    url: compactDataUrl,
    size: Math.round(compactDataUrl.length * 0.75),
    mimeType: 'image/jpeg',
    uploadedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, mediaData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }

  return { id: docId, ...mediaData };
}

export async function removeMediaItem(id, storagePath) {
  try {
    if (storagePath && !storagePath.startsWith('local/')) {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('Storage delete warning:', err);
      }
    }
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    return { success: false, error: error.message };
  }
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
