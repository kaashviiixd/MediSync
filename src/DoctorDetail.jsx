import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Award, Clock, CreditCard, ArrowRight, MessageSquare, FileText, Plus, User, Users, ChevronRight, Check } from 'lucide-react';
import { appointmentApi, doctorApi, profileApi } from './lib/api';

console.log("MediSync v1.1.0: DoctorDetail Loaded");

export default function DoctorDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paying, setPaying] = useState(false);
   const [doctorAppointments, setDoctorAppointments] = useState([]);
   const [activeProfile, setActiveProfile] = useState(null);
   const [selectedDate, setSelectedDate] = useState(state?.selectedDate || new Date().toISOString().split('T')[0]);

  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [doctor, setDoctor] = useState(state?.doctor);

  // Fetch fresh doctor data on mount to get latest slots
  useEffect(() => {
    const refreshDoctor = async () => {
      try {
        const res = await doctorApi.getDoctors();
        const docId = state?.doctor?.id || state?.doctor?.userId;
        if (res.data && docId) {
          const freshDoc = res.data.find(d => d.id === docId || d.userId === docId);
          if (freshDoc) setDoctor(freshDoc);
        }
      } catch (err) {
        console.error("Failed to refresh doctor data:", err);
      }
    };
    refreshDoctor();
  }, []);

  useEffect(() => {
    // Load active profile and family list
    const savedUser = localStorage.getItem('medisync_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    
    if (!user?.id) return;

    const fetchProfiles = async () => {
      try {
        const response = await profileApi.getProfiles(user.id);
        const profiles = response.data;
        setFamilyProfiles(profiles);

        const activeProfileStr = localStorage.getItem('activeProfile');
        if (activeProfileStr) {
          const savedActive = JSON.parse(activeProfileStr);
          // Find matching profile in the fresh list
          const currentActive = profiles.find(p => p.id === savedActive.id || (p.name === savedActive.name && p.relation === savedActive.relation));
          if (currentActive) {
            setActiveProfile(currentActive);
            localStorage.setItem('activeProfile', JSON.stringify(currentActive));
          } else {
            setActiveProfile(profiles[0]);
          }
        } else if (profiles.length > 0) {
          setActiveProfile(profiles[0]);
        }
      } catch (err) {
        console.error("MediSync: Failed to load profiles in DoctorDetail:", err);
      }
    };

    fetchProfiles();

    if (!doctor?.id && !doctor?.userId) return;
    const fetchExistingAppointments = async () => {
      try {
        const response = await doctorApi.getAppointments(doctor.id || doctor.userId);
        setDoctorAppointments(response.data);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
      }
    };
    fetchExistingAppointments();
  }, [doctor?.id, doctor?.userId]);

  // razorpay script loading removed for now per user request

  // Filter out slots that are already booked for the SELECTED date
  const bookedSlots = doctorAppointments
    .filter(app => app.appointment_date === selectedDate)
    .map(app => app.appointment_time);

  const availableTimeSlots = typeof doctor?.doctorProfile?.available_time_slots === 'string'
    ? JSON.parse(doctor.doctorProfile.available_time_slots)
    : (doctor?.doctorProfile?.available_time_slots || doctor?.available_slots || []);
  
  const freeSlots = availableTimeSlots.filter(slot => {
    // Check if already booked
    if (bookedSlots.includes(slot)) return false;

    // Check if slot is in the past for TODAY
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    
    if (isToday) {
      try {
        const [time, ampm] = slot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hours, minutes, 0, 0);
        
        return slotDate > now;
      } catch (e) {
        return true; // Fallback to show if parsing fails
      }
    }

    // For future dates, all slots are free if not booked
    return true;
  });

  const handlePayment = async () => {
    if (!selectedSlot) {
      alert("Please select a time slot first!");
      return;
    }
    setPaying(true);
    try {
      const savedUser = localStorage.getItem('medisync_user');
      const user = savedUser ? JSON.parse(savedUser) : null;

      const patientId = user?.id || user?.uid;
      if (!patientId) {
        alert("Please login as a patient to book an appointment.");
        navigate('/auth/patient');
        return;
      }

      // Success callback to handle post-payment logic
      const successHandler = async (paymentResponse) => {
        console.log("MediSync: Finalizing booking data...");
        const aiSummary = localStorage.getItem('pending_medical_summary');
        const appointmentType = localStorage.getItem('pending_appointment_type') || 'Video Call';
        const medicalRecords = JSON.parse(localStorage.getItem('pending_medical_records') || '[]');
        
        // Use the confirmed activeProfile from state
        const patientName = activeProfile?.name || user?.name || "Unknown Patient";

        console.log("MediSync DEBUG: Booking for patient:", patientName, " (Account:", user?.name, ")");

        try {
          const bookingData = {
            doctorId: doctor.id || doctor.userId,
            patientId,
            profileId: activeProfile?.id,
            patient_name: patientName,
            appointmentDate: selectedDate,
            appointmentTime: selectedSlot,
            appointmentType: appointmentType,

            status: 'Scheduled',
            ai_summary: aiSummary,
            medical_records: medicalRecords,
            paymentId: paymentResponse.razorpay_payment_id
          };

          console.log("MediSync: Sending booking data to backend...", bookingData);
          const response = await appointmentApi.book(bookingData);

          if (!response.data.success) {
            throw new Error(response.data.error || "Server rejected booking");
          }

          // Clear data after booking
          localStorage.removeItem('pending_medical_summary');
          localStorage.removeItem('pending_medical_records');
          localStorage.removeItem('pending_appointment_type');
          localStorage.removeItem('medisync_chat_history');

          console.log("MediSync: Booking successful, redirecting...");
          navigate('/patient-dashboard', { 
              state: { 
                  doctor: {
                    ...doctor,
                    name: doctor.name,
                    profile_photo: doctor.profile_photo || doctor.profile_image,
                    specialization: doctor.specialization || doctor.doctorProfile?.specialization
                  }, 
                  slot: selectedSlot, 
                  bookingSuccess: true 
              } 
          });
        } catch (apiError) {
          console.error("MediSync API Error:", apiError);
          const errorMsg = apiError.response?.data?.error || apiError.message;
          alert("Booking Failed: " + errorMsg);
          setPaying(false); // Enable button again
        }
      };

      // Directly trigger success handler with dummy payment ID to skip Razorpay
      console.log("MediSync: Simulating payment success...");
      setTimeout(() => {
        successHandler({ razorpay_payment_id: "PAY-" + Math.random().toString(36).substr(2, 9).toUpperCase() });
      }, 1000);

    } catch (error) {
      console.error("MediSync Booking Logic Error:", error);
      alert("An unexpected error occurred. Please try again.");
      setPaying(false);
    }
  };

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">No doctor selected</h2>
        <button
          onClick={() => navigate('/doctor-recommendations')}
          className="mt-4 text-mediteal font-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Recommendations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Doctor Profile</h1>
            <p className="text-sm text-mediteal font-medium">Safe & Secure Booking</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-mediteal/10 rounded-full text-mediteal-dark text-sm font-bold">
          <ShieldCheck className="w-4 h-4" />
          Verified Provider
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto p-6 sm:p-10">
          {/* Profile Header Card */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-100 ring-8 ring-slate-50 shadow-inner shrink-0">
                <img src={doctor.profile_photo || doctor.profile_image} alt={doctor.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-mediteal/10 text-mediteal-dark text-xs font-bold rounded-full mb-3 uppercase tracking-widest">
                  <Award className="w-3 h-3" /> Top Rated Specialist
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-1">{doctor.name}</h2>
                <p className="text-mediteal font-bold text-lg">{doctor.degree || doctor.doctorProfile?.degree || 'MD'}</p>
                <p className="text-slate-500 mt-2 font-medium bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100 italic">
                  Specialization: {doctor.specialization || doctor.doctorProfile?.specialization || 'General Physician'}
                </p>
                <div className="mt-4 flex items-center justify-center sm:justify-start gap-2 text-slate-900 font-bold text-2xl">
                  <span className="text-slate-400 font-normal text-sm">Appointment Fee:</span>
                  ₹{doctor.fees || doctor.doctorProfile?.consultation_fee || 500}
                </div>
              </div>
            </div>

            {/* Slots Section */}
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Available Slots for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </h3>

                <div className="flex flex-wrap gap-3">
                  {freeSlots.length > 0 ? freeSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-sm border
                        ${selectedSlot === slot
                          ? 'bg-mediteal text-white border-mediteal ring-4 ring-mediteal/10'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-mediteal hover:text-mediteal'}
                      `}
                    >
                      {slot}
                    </button>
                  )) : (
                    <p className="text-slate-400 text-sm font-medium italic">No available slots for today.</p>
                  )}
                </div>
              </div>

              {/* Patient Confirmation Section */}
              <div className="bg-white rounded-3xl p-6 border-2 border-mediteal/10 shadow-sm relative overflow-hidden group hover:border-mediteal/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-mediteal" />
                    Appointment Recipient
                  </h3>
                  <button 
                    onClick={() => setShowProfileSelector(true)}
                    className="text-xs font-black text-mediteal hover:text-mediblue uppercase tracking-tight flex items-center gap-1 bg-mediteal/5 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Change Patient <ChevronRight size={14} />
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-mediteal/10 ${activeProfile?.color || 'bg-mediteal'}`}>
                    {activeProfile?.name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-lg leading-tight">{activeProfile?.name || 'Loading...'}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">{activeProfile?.relation || 'Self'} Profile</p>
                  </div>
                  <div className="ml-auto">
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 italic">
                      Confirmed
                    </div>
                  </div>
                </div>
                
                {/* Subtle reminder */}
                <p className="text-[10px] text-slate-400 font-bold mt-4 flex items-center gap-1.5 pt-4 border-t border-slate-50">
                   <ShieldCheck className="w-3 h-3 text-emerald-500" />
                   Medical records will be strictly associated with this profile.
                </p>
              </div>

              {/* Booking Button */}
              <button
                onClick={handlePayment}
                disabled={paying || !selectedSlot}
                className={`w-full py-5 rounded-3xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] group
                  ${paying || !selectedSlot
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-mediteal text-white shadow-mediteal/30 hover:bg-mediblue'}
                `}
              >
                {paying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Booking...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    Pay & Confirm Appointment
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 font-medium">
                Minimal verification fee to ensure genuine bookings.
              </p>
            </div>
          </div>


        </div>
      </main>

      {/* Mini Profile Selector Modal */}
      {showProfileSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Who is this for?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Select the profile receiving the consultation.</p>
            
            <div className="grid gap-4 max-h-[40vh] overflow-y-auto px-1 custom-scrollbar-mini">
              {familyProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    setActiveProfile(profile);
                    localStorage.setItem('activeProfile', JSON.stringify(profile));
                    setShowProfileSelector(false);
                  }}
                  className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all group active:scale-[0.98] ${
                    activeProfile?.id === profile.id
                      ? 'border-mediteal bg-mediteal/[0.03]'
                      : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${profile.color || 'bg-mediteal'}`}>
                    {profile.name?.charAt(0)}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-black text-slate-900">{profile.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profile.relation}</p>
                  </div>
                  {activeProfile?.id === profile.id && (
                    <div className="w-8 h-8 rounded-full bg-mediteal text-white flex items-center justify-center">
                      <Check size={16} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
              
              <button 
                onClick={() => navigate('/profile-selection')}
                className="flex items-center gap-4 p-5 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-mediteal hover:border-mediteal transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-mediteal/10">
                  <Plus size={24} />
                </div>
                <span className="font-extrabold text-sm">Add New Member</span>
              </button>
            </div>

            <button 
              onClick={() => setShowProfileSelector(false)}
              className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:shadow-slate-200 transition-all active:scale-[0.98]"
            >
              Continue with Selection
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-mini::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-mini::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-mini::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );
}
