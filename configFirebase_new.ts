import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, addDoc, updateDoc, deleteDoc, collection, doc, query, where } from 'firebase/firestore';
import { getStorage, listAll, getDownloadURL, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBWOqUYZDc8ehFPUFS8p1JbABc_rts26lE",
    authDomain: "ppi-jabar.firebaseapp.com",
    projectId: "ppi-jabar",
    storageBucket: "ppi-jabar.appspot.com",
    messagingSenderId: "771885703085",
    appId: "1:771885703085:web:ffa8cc1b0702f86d3f8b24"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

module.exports = User;
