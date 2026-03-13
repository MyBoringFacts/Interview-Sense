import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

let storage: any;
try {
  storage = getStorage(app);
} catch (error) {
  console.error("Storage initialization failed:", error);
}

export async function uploadAudio(file: Blob, path: string) {
  if (!storage) throw new Error("Storage not initialized");
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
