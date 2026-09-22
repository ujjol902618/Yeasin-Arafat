import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase-config.js';

const COLLECTION_NAME = 'messages';

export async function sendMessage(messageData) {
  try {
    const docId = 'msg_' + Date.now();
    const docRef = doc(db, COLLECTION_NAME, docId);
    const payload = {
      name: messageData.name.trim(),
      email: messageData.email.trim(),
      phone: messageData.phone ? messageData.phone.trim() : '',
      subject: messageData.subject ? messageData.subject.trim() : 'Portfolio Inquiry',
      message: messageData.message.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload);
    return { success: true, id: docId };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    return { success: false, error: error.message };
  }
}

export async function fetchMessages() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
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

export function subscribeToMessages(onUpdate, onError) {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() });
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    return () => {};
  }
}

export async function setMessageReadStatus(id, read = true) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, { read }, { merge: true });
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    return { success: false, error: error.message };
  }
}

export async function removeMessage(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    return { success: false, error: error.message };
  }
}
