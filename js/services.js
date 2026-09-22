import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase-config.js';
import { DEFAULT_SERVICES } from './seed-data.js';

const COLLECTION_NAME = 'services';

export async function fetchServices() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_SERVICES;
    }
    const list = [];
    snapshot.forEach((snap) => {
      list.push({ id: snap.id, ...snap.data() });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    return DEFAULT_SERVICES;
  }
}

export async function saveService(id, serviceData) {
  try {
    const docId = id || 'serv_' + Date.now();
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, serviceData, { merge: true });
    return { success: true, id: docId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    return { success: false, error: error.message };
  }
}

export async function removeService(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    return { success: false, error: error.message };
  }
}
