import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    addDoc,
    onSnapshot,
    serverTimestamp
} from "firebase/firestore";

const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
    apiKey: API_KEY,
    authDomain: "studio-2206837454-ebce9.firebaseapp.com",
    projectId: "studio-2206837454-ebce9",
    storageBucket: "studio-2206837454-ebce9.firebasestorage.app",
    messagingSenderId: "946176022497",
    appId: "1:946176022497:web:9c6d3b1f779b9c09f064a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Google Sign-In Helper
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        return { success: false, error: error.code, message: error.message };
    }
};

// Email/Password Helpers
export const registerWithEmail = async (email, password) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        console.error("Email Registration Error:", error);
        return { success: false, error: error.code, message: error.message };
    }
};

export const loginWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        console.error("Email Login Error:", error);
        return { success: false, error: error.code, message: error.message };
    }
};

// Password Reset Helper
export const sendResetEmail = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error("Password Reset Error:", error);
        return { success: false, error: error.code, message: error.message };
    }
};

// Custom Sign Out Helper
export const logoutUser = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error);
        return { success: false, error: error.code, message: error.message };
    }
};

// Firestore User Helper
export const ensureUserInFirestore = async (user, role = 'patient') => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const userData = {
            uid: user.uid,
            name: user.displayName || 'Anonymous',
            email: user.email,
            photoURL: user.photoURL,
            role: role,
            createdAt: serverTimestamp()
        };
        await setDoc(userRef, userData);
        return userData;
    }
    return userSnap.data();
};

// Health Readings Helpers
export const addHealthReading = async (uid, readingData) => {
    try {
        const readingsRef = collection(db, "health_readings");
        await addDoc(readingsRef, {
            uid,
            ...readingData,
            timestamp: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding health reading:", error);
        return { success: false, error: error.message };
    }
};

export const subscribeToHealthReadings = (uid, callback) => {
    const q = query(
        collection(db, "health_readings"),
        where("uid", "==", uid)
    );
    return onSnapshot(q, (snapshot) => {
        const readings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        callback(readings);
    });
};

// Appointments Helpers
export const addAppointment = async (appointmentData) => {
    try {
        const appointmentsRef = collection(db, "appointments");
        await addDoc(appointmentsRef, {
            ...appointmentData,
            status: 'upcoming',
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding appointment:", error);
        return { success: false, error: error.message };
    }
};

export const subscribeToAppointments = (doctorId, callback) => {
    const q = query(
        collection(db, "appointments"),
        where("doctorId", "==", doctorId)
    );
    return onSnapshot(q, (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(appointments);
    }, (error) => {
        console.error("Firestore Subscription Error:", error);
    });
};

export const subscribeToPatientAppointments = (patientId, callback) => {
    const q = query(
        collection(db, "appointments"),
        where("patientId", "==", patientId)
    );
    return onSnapshot(q, (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(appointments);
    });
};

// Export primitives
export {
    onAuthStateChanged,
    signOut,
    getDoc,
    doc
};
