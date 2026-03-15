import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, signOut, getDoc, doc, db } from './lib/firebase';
import Dashboard from './Dashboard';
import PatientChat from './PatientChat';
import DoctorRecommendations from './DoctorRecommendations';
import DoctorDetail from './DoctorDetail';
import BookingSuccess from './BookingSuccess';
import DoctorLogin from './DoctorLogin';
import DoctorDashboard from './DoctorDashboard';
import AuthPage from './AuthPage';
import PatientDashboard from './components/PatientDashboard';
import ForgotPassword from './pages/ForgotPassword';
import FamilyProfileSelector from './components/FamilyProfileSelector';
import DoctorMeetingRoom from './DoctorMeetingRoom';
import PatientMeetingRoom from './PatientMeetingRoom';
import PatientMeetingInvite from './components/PatientMeetingInvite';
import { connectSocket, disconnectSocket } from './lib/socket';
import { authApi } from './lib/api';
import { useNavigate } from 'react-router-dom';

// Wrapper component to provide navigation to FamilyProfileSelector
const ProfileSelectionPage = ({ user }) => {
  const navigate = useNavigate();
  
  const handleProfileSelect = (profile) => {
    localStorage.setItem('activeProfile', JSON.stringify(profile));
    navigate('/patient-dashboard');
  };

  return <FamilyProfileSelector onSelectProfile={handleProfileSelect} user={user} />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local session first (for email/password users)
    const savedUser = localStorage.getItem('medisync_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoading(false);
    }

    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Sync with backend on every login/refresh
          const response = await authApi.googleAuth({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            profileImage: firebaseUser.photoURL
          });
          
          if (response.data.success) {
            const userData = response.data.user;
            setUser(userData);
            localStorage.setItem('medisync_user', JSON.stringify(userData));
            localStorage.setItem('token', response.data.token);
            connectSocket(userData.id);
          }
        } else {
          // If Firebase says no user, and we don't have a local session that we want to keep,
          // it's safer to clear it to avoid "Missing Permissions" errors.
          if (!localStorage.getItem('medisync_user_stay_logged_in')) { // Optional flag
             setUser(null);
             localStorage.removeItem('medisync_user');
             disconnectSocket();
          }
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    localStorage.removeItem('medisync_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mediteal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth/:mode" element={<AuthPage setUser={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Profile Selection Route */}
        <Route 
          path="/profile-selection" 
          element={user ? <ProfileSelectionPage user={user} /> : <Navigate to="/auth/patient" />} 
        />

        {/* Protected Patient Route */}
        <Route
          path="/patient-dashboard"
          element={user ? <PatientDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/auth/patient" />}
        />

        <Route path="/patient" element={<PatientChat />} />
        <Route path="/doctor-recommendations" element={<DoctorRecommendations />} />
        <Route path="/doctor-detail" element={<DoctorDetail />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        
        {/* Jitsi Routes */}
        <Route path="/doctor/meeting/:roomId" element={<DoctorMeetingRoom />} />
        <Route path="/meeting/:roomId" element={<PatientMeetingRoom />} />
      </Routes>
      
      {/* Global In-App Invite Listener */}
      <PatientMeetingInvite />
    </BrowserRouter>
  );
}

export default App;
