import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { appointmentApi, recordApi, doctorApi } from '../lib/api';
import { socket, connectSocket } from '../lib/socket';
import {
    LayoutDashboard, Calendar, FileText, Pill, CreditCard, Activity,
    MessageSquare, Bell, User, Settings, LogOut, Search, Plus,
    Download, Share2, Video, Clock, MapPin, Star, MoreVertical,
    PhoneCall, Heart, Thermometer, UserPlus, ArrowRight, ExternalLink,
    Droplets, Scale, Activity as Pulse, Gauge, TrendingUp, X, Check, Printer,
    Users, VideoOff, CheckCircle2, AlertCircle, ShieldCheck, Zap
} from 'lucide-react';
import PatientMeetingRoom from '../PatientMeetingRoom';
import Insurance from './Insurance';
import Notifications from './Notifications';

const isPastAppointment = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    try {
        const current = new Date();
        let hours, minutes;

        if (timeStr.includes(' AM') || timeStr.includes(' PM')) {
            const parts = timeStr.split(' ');
            const timeParts = parts[0].split(':');
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
            const ampm = parts[1].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
        } else {
            const timeParts = timeStr.split(':');
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
        }

        const appointmentDate = new Date(dateStr);
        appointmentDate.setHours(hours, minutes, 0, 0);

        return current > appointmentDate;
    } catch (e) {
        console.error("Error parsing appointment time:", e);
        return false;
    }
};
import ReceiptModal from './ReceiptModal';

const PatientDashboard = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { doctor, slot, bookingSuccess } = location.state || {};
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [showSuccessBanner, setShowSuccessBanner] = useState(!!bookingSuccess);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [user, setUser] = useState({ name: 'User' });
    const [appointments, setAppointments] = useState([]);
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [metrics, setMetrics] = useState([
        { id: 'bp', name: 'Blood Pressure', value: '120/80', unit: 'mmHg', icon: Pulse, color: 'text-blue-500', bg: 'bg-blue-50', history: [118, 122, 120, 119, 121, 120] },
        { id: 'hr', name: 'Heart Rate', value: '72', unit: 'bpm', icon: Heart, color: 'text-red-500', bg: 'bg-red-50', history: [70, 75, 72, 71, 74, 72] },
    ]);
    const [showReadingModal, setShowReadingModal] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [newReading, setNewReading] = useState({ value: '', value2: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) });
    const [activeMeeting, setActiveMeeting] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedReceiptData, setSelectedReceiptData] = useState(null);
    const [allDoctors, setAllDoctors] = useState([]);

    // Fetch all doctors on mount (handled in main useEffect below)

    useEffect(() => {
        if (showSuccessBanner) {
            if ("Notification" in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Booking Confirmed!", {
                            body: `Your appointment with ${doctor?.name} for ${slot} has been successfully scheduled.`,
                            icon: "https://cdn-icons-png.flaticon.com/512/3063/3063206.png"
                        });
                    }
                });
            }
            const timer = setTimeout(() => setShowSuccessBanner(false), 5000);

            // Auto-open receipt modal for new booking
            if (doctor && slot) {
                const currentActiveProfileStr = localStorage.getItem('activeProfile');
                const profileObj = currentActiveProfileStr ? JSON.parse(currentActiveProfileStr) : null;
                setSelectedReceiptData({
                    patientName: profileObj ? profileObj.name : (user?.name || 'Patient'),

                    doctorName: doctor.name,
                    specialty: doctor.specialization || doctor.doctorProfile?.specialization,
                    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    time: slot,
                    amount: doctor.fees || doctor.doctorProfile?.consultation_fee || 500,
                    referenceId: 'REF-' + Math.random().toString(36).substr(2, 9).toUpperCase()
                });
                setShowReceiptModal(true);
            }

            return () => clearTimeout(timer);
        }
    }, [showSuccessBanner, doctor, slot, user.name]);

    useEffect(() => {
        const savedUser = localStorage.getItem('medisync_user');
        const activeProfile = localStorage.getItem('activeProfile');

        if (savedUser) {
            const u = JSON.parse(savedUser);
            if (activeProfile) {
                const profileInfo = JSON.parse(activeProfile);
                setUser({ ...u, ...profileInfo }); // Merge primary account info with selected profile info
            } else {
                setUser(u);
            }

            const fetchAppointments = async () => {
                try {
                    const res = await appointmentApi.getPatientAppointments(u.id);
                    const activeProfileStr = localStorage.getItem('activeProfile');
                    const activeProfile = activeProfileStr ? JSON.parse(activeProfileStr) : null;

                    let fetchedApps = res.data
                        .filter(app => {
                            // If we have an active profile, match by profileId OR by patient_name as fallback
                            if (activeProfile && activeProfile.id) {
                                return app.profileId === activeProfile.id ||
                                    (!app.profileId && (app.patient_name === activeProfile.name || app.profile?.name === activeProfile.name));
                            }
                            return true; // Fallback to all if no profile selected
                        })
                        .map(app => ({
                            id: app.id,
                            doctorName: app.doctor?.name || 'Doctor',
                            patientName: app.profile?.name || app.patient_name || app.patient?.name || 'Patient',
                            slot: `${app.appointment_date} at ${app.appointment_time}`,
                            fee: app.doctor?.doctorProfile?.consultation_fee || 500,
                            image: app.doctor?.profile_photo || app.doctor?.profile_image,
                            specialty: app.doctor?.doctorProfile?.specialization,
                            status: app.status
                        }));

                    // If we just booked a doctor, prepend it to the list for immediate feedback
                    // ONLY if it matches the current profile
                    if (bookingSuccess && doctor && slot) {
                        const currentProfile = activeProfile;
                        if (currentProfile) {
                            const newApp = {
                                id: 'temp-' + Date.now(),
                                doctorName: doctor.name,
                                slot: `${new Date().toISOString().split('T')[0]} at ${slot}`,
                                fee: doctor.fees || doctor.doctorProfile?.consultation_fee || 500,
                                image: doctor.profile_photo || doctor.profile_image,
                                specialty: doctor.specialization || doctor.doctorProfile?.specialization,
                                patientName: currentProfile.name
                            };
                            // Avoid duplicates
                            if (!fetchedApps.find(a => a.doctorName === newApp.doctorName && a.slot === newApp.slot)) {
                                fetchedApps = [newApp, ...fetchedApps];
                            }
                        }
                    }

                    setAppointments(fetchedApps);
                } catch (err) {
                    console.error("Failed to fetch appointments:", err);
                }
            };
            fetchAppointments();

            const fetchMedicalRecords = async () => {
                try {
                    const res = await recordApi.getPatientDocuments(u.id);
                    setMedicalRecords(res.data.map(doc => ({
                        name: doc.name,
                        date: new Date(doc.upload_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                        type: doc.document_type || 'Record',
                        fileUrl: doc.file_url
                    })));
                } catch (err) {
                    console.error("Failed to fetch medical records:", err);
                }
            };
            fetchMedicalRecords();

            const fetchAllDoctors = async () => {
                try {
                    const res = await doctorApi.getDoctors();
                    if (res.data) setAllDoctors(res.data);
                } catch (err) {
                    console.error("Failed to fetch doctors:", err);
                }
            };
            fetchAllDoctors();
        }
    }, [bookingSuccess, doctor, slot]);

    // Meeting Notification Listener + Real-time appointment updates
    useEffect(() => {
        const savedUser = localStorage.getItem('medisync_user');
        if (savedUser) {
            const u = JSON.parse(savedUser);
            connectSocket(u.id);

            socket.on('meeting_invite', (data) => {
                console.log("MediSync: Received meeting invite:", data);
                setActiveMeeting(data);
                
                // Show browser notification if permitted
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Consultation Starting!", {
                        body: `${data.doctorName} is ready for your video consultation. Click here to join.`,
                        icon: "https://cdn-icons-png.flaticon.com/512/3063/3063206.png"
                    });
                }
            });

            // Real-time: when a new appointment is booked, prepend it to the list immediately
            socket.on('appointment_booked', (data) => {
                console.log("MediSync: Real-time appointment confirmation received:", data);
                setAppointments(prev => {
                    const already = prev.find(a => a.id === data.appointmentId);
                    if (already) return prev;
                    return [{
                        id: data.appointmentId,
                        doctorName: data.doctorName,
                        slot: `${data.date} at ${data.time}`,
                        status: data.status || 'Scheduled',
                        fee: 500,
                        image: null,
                        specialty: null,
                        patientName: u.name
                    }, ...prev];
                });
                // Browser notification
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Appointment Booked!", {
                        body: `Your appointment with ${data.doctorName} on ${data.date} at ${data.time} is confirmed.`,
                        icon: "https://cdn-icons-png.flaticon.com/512/3063/3063206.png"
                    });
                }
            });

            return () => {
                socket.off('meeting_invite');
                socket.off('appointment_booked');
            };
        }
    }, []);

    const addMetric = (metric) => {
        if (!metrics.find(m => m.id === metric.id)) {
            setMetrics([...metrics, { ...metric, value: '--', history: [] }]);
        }
        setShowAddModal(false);
    };

    const handleSaveReading = async () => {
        if (!newReading.value || (selectedMetric.id === 'bp' && !newReading.value2)) {
            alert("Please enter a valid reading value.");
            return;
        }

        const finalValue = selectedMetric.id === 'bp' 
            ? `${newReading.value}/${newReading.value2}` 
            : newReading.value;

        setMetrics(prevMetrics => prevMetrics.map(m => {
            if (m.id === selectedMetric.id) {
                const numericValue = selectedMetric.id === 'bp' ? parseInt(newReading.value) : parseFloat(newReading.value);
                return {
                    ...m,
                    value: finalValue,
                    history: [...m.history, numericValue].slice(-10) // Keep last 10 for chart
                };
            }
            return m;
        }));

        setShowReadingModal(false);
        // Note: Real persistence would call an API here
    };

    const sidebarLinks = [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Book Appointment', icon: UserPlus },
        { name: 'Medical Records', icon: FileText },
        { name: 'Prescriptions', icon: Pill },
        { name: 'Payments & Billing', icon: CreditCard },
        { name: 'Health Tracker', icon: Activity },
        { name: 'Insurance', icon: ShieldCheck },
        { name: 'Messages', icon: MessageSquare },
        { name: 'Notifications', icon: Bell },
        { name: 'Profile Settings', icon: Settings },
    ];

    // Derived unique doctors from past/upcoming appointments for "Recommended Doctors" section
    const pastDoctors = appointments.reduce((acc, current) => {
        const x = acc.find(item => item.name === current.doctorName);
        if (!x) {
            // Find full doctor info from allDoctors if available
            const fullDoc = allDoctors.find(d => d.name === current.doctorName);
            const slots = fullDoc 
                ? (typeof fullDoc.doctorProfile?.available_time_slots === 'string' 
                    ? JSON.parse(fullDoc.doctorProfile.available_time_slots) 
                    : (fullDoc.doctorProfile?.available_time_slots || []))
                : [];

            return acc.concat([{
                id: fullDoc?.id || current.doctorId,
                name: current.doctorName,
                specialty: current.specialty || 'Specialist',
                rating: 4.8, // Fallback rating
                image: current.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + current.doctorName,
                available_slots: slots,
                fullDoc: fullDoc // Keep reference for navigation
            }]);
        } else {
            return acc;
        }
    }, []);

    const recommendedDoctors = (pastDoctors.length > 0 ? pastDoctors : allDoctors.slice(0, 4)).map(doc => ({
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty || doc.doctorProfile?.specialization || doc.specialization || 'General Physician',
        rating: doc.rating || 4.8,
        image: doc.image || doc.profile_photo || doc.profile_image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + doc.name,
        available_slots: doc.available_slots || (typeof doc.doctorProfile?.available_time_slots === 'string'
            ? JSON.parse(doc.doctorProfile.available_time_slots)
            : (doc.doctorProfile?.available_time_slots || [])),
        fullDoc: doc.fullDoc || doc
    }));



    const availableMetrics = [
        { id: 'bp', name: 'Blood Pressure', unit: 'mmHg', icon: Pulse, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'hr', name: 'Heart Rate', unit: 'bpm', icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
        { id: 'bs', name: 'Blood Sugar', unit: 'mg/dL', icon: Droplets, color: 'text-orange-500', bg: 'bg-orange-50' },
        { id: 'ox', name: 'Oxygen Level', unit: '%', icon: Thermometer, color: 'text-mediteal', bg: 'bg-mediteal/10' },
        { id: 'wt', name: 'Weight', unit: 'kg', icon: Scale, color: 'text-purple-500', bg: 'bg-purple-50' },
        { id: 'ch', name: 'Cholesterol', unit: 'mg/dL', icon: Gauge, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-100 flex flex-col hidden lg:flex shadow-sm">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-mediteal to-mediteal-dark rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-mediteal/20">
                        M
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">MediSync</span>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {sidebarLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => {
                                if (link.name === 'Book Appointment' || link.name === 'Messages') {
                                    navigate('/patient');
                                } else if (['Dashboard', 'Medical Records', 'Prescriptions', 'Health Tracker'].includes(link.name)) {
                                    setActiveTab('Dashboard');
                                    if (link.name !== 'Dashboard') {
                                        setTimeout(() => {
                                            const sectionId = link.name.toLowerCase().replace(/\s+/g, '-');
                                            const element = document.getElementById(sectionId);
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }, 100);
                                    }
                                } else {
                                    setActiveTab(link.name);
                                }
                            }}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === link.name
                                ? 'bg-mediteal/10 text-mediteal shadow-sm ring-1 ring-mediteal/10'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <link.icon className={`w-5 h-5 transition-transform duration-300 ${activeTab === link.name ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-semibold text-[15px]">{link.name}</span>
                            {activeTab === link.name && (
                                <div className="ml-auto w-1.5 h-1.5 bg-mediteal rounded-full shadow-glow"></div>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-6 mt-auto">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-semibold text-[15px]">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Top Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between z-10 sticky top-0">
                    <div className="relative w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-mediteal transition-colors" />
                        <input
                            type="text"
                            placeholder="Search doctors, labs, or records..."
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-mediteal/20 outline-none text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <button onClick={() => setActiveTab('Notifications')} className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 border-2 border-white rounded-full"></span>
                        </button>
                        
                        <div className="h-10 w-[1px] bg-slate-100 mx-2"></div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.relation || 'Patient User'}</p>
                            </div>
                            <div 
                                onClick={() => navigate('/profile-selection')}
                                className="relative group cursor-pointer"
                                title="Switch Profile"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-slate-50 overflow-hidden shadow-sm group-hover:border-mediteal transition-all duration-300">
                                    <img src={`https://ui-avatars.com/api/?name=${user.name}&background=0D9488&color=fff`} alt="Profile" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-lg shadow-md border border-slate-100 flex items-center justify-center text-mediteal opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                                    <Users size={12} strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {activeTab === 'Dashboard' ? (
                            <>
                                {/* Booking Success Banner */}
                                {showSuccessBanner && (
                                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 fade-in duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                                <Check size={20} strokeWidth={3} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg">Booking Confirmed!</h4>
                                                <p className="text-sm font-medium opacity-90">
                                                    Your appointment with {doctor?.name} for {slot} has been successfully scheduled.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowSuccessBanner(false)}
                                            className="p-2 hover:bg-emerald-100 rounded-xl transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                )}

                                {activeMeeting && (
                                    <div className="bg-mediteal text-white p-6 rounded-[2rem] shadow-xl shadow-mediteal/20 flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-white animate-in slide-in-from-top-6 duration-500 overflow-hidden relative group">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                            <Video size={100} strokeWidth={1} />
                                        </div>
                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center animate-pulse">
                                                <Video size={32} className="text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black italic tracking-tight">Your consultation is starting!</h4>
                                                <p className="text-white/80 font-bold mt-1">Dr. {activeMeeting.doctorName} is waiting for you in the meeting room.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <button
                                                onClick={() => setActiveMeeting(null)}
                                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all border border-white/20"
                                            >
                                                Dismiss
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigate(`/meeting/${activeMeeting.roomId}`, { state: { meetingData: activeMeeting } });
                                                    setActiveMeeting(null);
                                                }}
                                                className="px-8 py-4 bg-white text-mediteal rounded-xl font-black text-lg hover:scale-[1.05] active:scale-[0.98] transition-all shadow-lg flex items-center gap-3"
                                            >
                                                <Video size={24} strokeWidth={3} />
                                                Join Meeting
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Greeting */}
                                <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
                                    <div>
                                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Good Morning, {user.name} 👋</h2>
                                        <p className="text-slate-500 font-medium mt-1">Here's a quick update on your health status today.</p>
                                    </div>
                                    <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-mediteal" />
                                        <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </section>

                                {/* Insurance Promo Banner */}
                                <section 
                                    onClick={() => setActiveTab('Insurance')}
                                    className="bg-gradient-to-r from-mediteal to-mediblue p-8 rounded-[2.5rem] shadow-xl shadow-mediteal/10 text-white cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all"
                                >
                                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                                        <Heart size={120} strokeWidth={1} />
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                                <Zap size={32} className="text-white fill-current" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black italic tracking-tight underline decoration-amber-400 decoration-4 underline-offset-4">New: Life Insurance for MediSync Members</h4>
                                                <p className="text-white/80 font-bold mt-1">Activate your 20% permanent discount today. Secure your family's future in 2 minutes.</p>
                                            </div>
                                        </div>
                                        <button className="px-8 py-4 bg-white text-mediteal rounded-xl font-black text-lg hover:shadow-lg transition-all flex items-center gap-2">
                                            Get Covered Now <ArrowRight size={20} />
                                        </button>
                                    </div>
                                </section>

                                {/* Health Metrics Tracker Section */}
                                <section id="health-tracker" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 scroll-mt-24">
                                    <div className="mb-8">
                                        <h3 className="text-xl font-bold text-slate-900">Health Metrics Tracker</h3>
                                        <p className="text-sm text-slate-500 font-medium">Monitor your vital signs and health trends over time.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {metrics.map((metric) => (
                                            <div key={metric.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between h-[320px]">
                                                <div className="flex justify-between items-start">
                                                    <div className={`${metric.bg} ${metric.color} p-4 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                                        <metric.icon size={26} />
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1 text-mediteal font-bold text-[10px] uppercase mb-1">
                                                            <TrendingUp size={12} /> Stable
                                                        </div>
                                                        <button className="text-[10px] font-bold text-slate-400 hover:text-mediteal transition-colors">
                                                            Details
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <h4 className="text-slate-500 text-sm font-semibold mb-1">{metric.name}</h4>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{metric.value}</span>
                                                        <span className="text-sm font-bold text-slate-400 tracking-wide uppercase">{metric.unit}</span>
                                                    </div>
                                                </div>

                                                {/* Robust Sparkline Chart */}
                                                <div className="flex items-end gap-1.5 h-16 my-4 bg-slate-50/30 rounded-2xl p-2 px-3">
                                                    {[...Array(8)].map((_, i) => {
                                                        const historyIdx = metric.history.length - (8 - i);
                                                        const value = historyIdx >= 0 ? metric.history[historyIdx] : null;
                                                        const displayValue = value !== null ? value : (metric.history.length === 0 ? [40, 60, 45, 70, 55, 65, 50, 80][i] : 0);
                                                        const opacity = value !== null ? 'opacity-100' : 'opacity-10';
                                                        const limit = selectedMetric?.id === 'ch' ? 300 : 180;
                                                        const height = Math.max(15, Math.min(100, (displayValue / limit) * 100));

                                                        return (
                                                            <div key={i} className="flex-1 bg-slate-100/50 rounded-md relative h-full overflow-hidden">
                                                                <div
                                                                    className={`absolute bottom-0 left-0 right-0 ${metric.color.replace('text', 'bg')} ${opacity} rounded-md transition-all duration-700 ease-out`}
                                                                    style={{ height: `${height}%` }}
                                                                ></div>
                                                                {value !== null && historyIdx === metric.history.length - 1 && (
                                                                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 z-10"></div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setSelectedMetric(metric);
                                                        const now = new Date();
                                                        setNewReading({ 
                                                            value: metric.id === 'bp' ? metric.value.split('/')[0] : (metric.value === '--' ? '' : metric.value), 
                                                            value2: metric.id === 'bp' ? metric.value.split('/')[1] : '', 
                                                            date: now.toISOString().split('T')[0],
                                                            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                                        });
                                                        setShowReadingModal(true);
                                                    }}
                                                    className="w-full py-3.5 bg-slate-50 border border-slate-100 text-slate-700 rounded-[1.5rem] font-bold text-sm hover:bg-mediteal hover:text-white hover:border-mediteal transition-all flex items-center justify-center gap-2 group/btn active:scale-95 shadow-sm"
                                                >
                                                    <Plus className="w-4 h-4 group-hover/btn:scale-110" />
                                                    Add Reading
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-dashed border-slate-200 hover:border-mediteal/30 hover:bg-mediteal/[0.02] transition-all group flex flex-col items-center justify-center gap-4 h-[320px] animate-pulse hover:animate-none"
                                        >
                                            <div className="w-20 h-20 bg-slate-50 group-hover:bg-mediteal/10 text-slate-300 group-hover:text-mediteal rounded-full flex items-center justify-center transition-all duration-500 shadow-inner group-hover:shadow-glow/20">
                                                <Plus size={40} className="group-hover:rotate-90 transition-transform duration-500" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-slate-900 mb-1">Add Metric</p>
                                                <p className="text-xs text-slate-400 font-semibold px-6 leading-relaxed">Customize your tracker with more health parameters</p>
                                            </div>
                                        </button>
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        {/* Upcoming Appointments */}
                                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group relative overflow-hidden">
                                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                                Upcoming Appointments
                                                <div className="w-2 h-2 bg-mediteal rounded-full animate-pulse"></div>
                                            </h3>
                                            {appointments.filter(apt => (['Approved', 'Rescheduled', 'Scheduled'].includes(apt.status)) && !isPastAppointment(apt.slot.split(' at ')[0], apt.slot.split(' at ')[1])).length > 0 ? (
                                                <div className="space-y-6">
                                                    {appointments.filter(apt => (['Approved', 'Rescheduled', 'Scheduled'].includes(apt.status)) && !isPastAppointment(apt.slot.split(' at ')[0], apt.slot.split(' at ')[1])).map((apt, i) => (
                                                        <div key={i} className="flex flex-col md:flex-row gap-8 items-start border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                                                            <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-inner">
                                                                <img
                                                                    src={apt.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200'}
                                                                    alt={apt.doctorName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="flex-1 space-y-4">
                                                                <div>
                                                                    <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">{apt.doctorName}</h4>
                                                                    <div className="flex items-center gap-3">
                                                                        <p className="text-mediteal font-bold text-sm tracking-wide uppercase">{apt.specialty || 'General Physician'}</p>
                                                                        {apt.status === 'Rescheduled' && (
                                                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                                                Rescheduled
                                                                            </span>
                                                                        )}
                                                                        {apt.status === 'Scheduled' && (
                                                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                                Pending Approval
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                                                                    <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                                                                        <Calendar className="w-4 h-4 text-mediblue" />
                                                                        <span className="text-sm font-semibold">{apt.slot}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                                                                        <CreditCard className="w-4 h-4 text-mediblue" />
                                                                        <span className="text-sm font-semibold">Fee: ₹{apt.fee}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-4 pt-2">
                                                                    <button 
                                                                        onClick={() => {
                                                                            setActiveMeeting(apt);
                                                                            setActiveTab('Meeting Room');
                                                                        }}
                                                                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
                                                                    >
                                                                        <Video size={18} /> Join Video Call
                                                                    </button>
                                                                    <button className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95">
                                                                        Reschedule
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                        <Calendar className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-500 font-bold">No upcoming appointments</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* History Section */}
                                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group relative overflow-hidden">
                                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                                Consultation History
                                                <Clock className="w-5 h-5 text-slate-300" />
                                            </h3>
                                            {appointments.filter(apt => apt.status === 'Completed' || (apt.status === 'Approved' && isPastAppointment(apt.slot.split(' at ')[0], apt.slot.split(' at ')[1]))).length > 0 ? (
                                                <div className="space-y-4">
                                                    {appointments.filter(apt => apt.status === 'Completed' || (apt.status === 'Approved' && isPastAppointment(apt.slot.split(' at ')[0], apt.slot.split(' at ')[1]))).map((apt, i) => (
                                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 truncate">{apt.doctorName}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{apt.slot}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${apt.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                {apt.status === 'Completed' ? 'Completed' : 'Missed'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-bold text-sm">No past consultations found.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recommended Doctors */}
                                        <div>
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xl font-bold text-slate-900">Recommended Doctors</h3>
                                                <button onClick={() => navigate('/patient')} className="text-sm font-bold text-mediteal hover:underline flex items-center gap-1">
                                                    View All <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {recommendedDoctors.map((doc, i) => (
                                                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group flex gap-5">
                                                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                                                            <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="text-lg font-bold text-slate-900 truncate">{doc.name}</h4>
                                                                <div className="flex items-center gap-1 text-orange-400">
                                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                                    <span className="text-xs font-bold">{doc.rating}</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-slate-400 font-semibold mb-2">{doc.specialty}</p>
                                                            {doc.available_slots && doc.available_slots.length > 0 && (
                                                                <div className="mb-3 flex flex-wrap gap-1.5">
                                                                    {doc.available_slots.slice(0, 3).map((s, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-lg border border-slate-100">
                                                                            {s}
                                                                        </span>
                                                                    ))}
                                                                    {doc.available_slots.length > 3 && (
                                                                        <span className="px-2 py-0.5 bg-mediteal/5 text-[10px] font-bold text-mediteal rounded-lg">
                                                                            +{doc.available_slots.length - 3} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <button
                                                                onClick={() => doc.fullDoc ? navigate('/doctor-detail', { state: { doctor: doc.fullDoc } }) : navigate('/patient')}
                                                                className="w-full py-2 bg-mediteal/10 text-mediteal rounded-xl font-bold text-xs hover:bg-mediteal hover:text-white transition-all shadow-sm"
                                                                title={doc.available_slots?.join(', ')}
                                                            >
                                                                Book Now
                                                            </button>

                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Medical Records */}
                                        <div id="medical-records" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-24">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-xl font-bold text-slate-900">Medical Records</h3>
                                                <button className="flex items-center gap-2 px-5 py-2.5 bg-mediteal text-white rounded-2xl font-bold text-sm hover:bg-mediteal-dark shadow-lg shadow-mediteal/20 transition-all">
                                                    <Plus className="w-4 h-4" /> Upload New
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                {medicalRecords.length > 0 ? medicalRecords.map((record, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-blue-50 text-mediblue rounded-xl flex items-center justify-center">
                                                                <FileText size={22} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-800 text-[15px]">{record.name}</h4>
                                                                <p className="text-xs text-slate-400 font-semibold uppercase">{record.type} • {record.date}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => window.open(record.fileUrl, '_blank')}
                                                            className="p-2.5 text-slate-400 hover:text-mediteal transition-all"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-8 text-slate-400 font-medium">
                                                        No medical records found. Upload reports in the chat to see them here!
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-8">
                                        <div className="bg-red-500 p-8 rounded-[2.5rem] shadow-xl shadow-red-200 text-white group relative overflow-hidden">
                                            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">Emergency Action <PhoneCall className="w-5 h-5 animate-bounce" /></h3>
                                            <div className="space-y-3">
                                                <button className="w-full bg-white text-red-500 py-3 rounded-2xl font-extrabold text-sm hover:bg-red-50 transition-all active:scale-95">Call Ambulance</button>
                                                <button className="w-full bg-red-600 text-white py-3 rounded-2xl font-extrabold text-sm hover:bg-red-700 transition-all active:scale-95">Nearby Hospitals</button>
                                            </div>
                                        </div>

                                        <div id="prescriptions" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-24">
                                            <h3 className="text-xl font-bold text-slate-900 mb-6">Prescriptions</h3>
                                            <div className="space-y-5">
                                                {[
                                                    { name: 'Metformin', dose: '500mg', freq: 'Twice daily', remaining: '12 days' },
                                                    { name: 'Lisinopril', dose: '10mg', freq: 'Once daily', remaining: '5 days' },
                                                ].map((med, i) => (
                                                    <div key={i} className="space-y-2">
                                                        <p className="font-bold text-slate-800">{med.name}</p>
                                                        <p className="text-xs text-slate-400 font-medium">{med.dose} • {med.freq}</p>
                                                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                                            <div className="h-full bg-mediteal rounded-full" style={{ width: i === 0 ? '70%' : '30%' }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : activeTab === 'Payments & Billing' ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="mb-10">
                                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Payments & Billing</h2>
                                    <p className="text-slate-500 font-medium text-lg">Manage your transaction history and download medical receipts.</p>
                                </section>

                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-slate-900">Transaction History</h3>
                                        <div className="flex gap-4">
                                            <button className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all">Filter</button>
                                            <button className="px-5 py-2.5 bg-mediteal/10 text-mediteal rounded-xl font-bold text-sm hover:bg-mediteal hover:text-white transition-all">Download All</button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                                    <th className="px-10 py-6">Reference ID</th>
                                                    <th className="px-10 py-6">Doctor / Service</th>
                                                    <th className="px-10 py-6">Date</th>
                                                    <th className="px-10 py-6">Amount</th>
                                                    <th className="px-10 py-6">Status</th>
                                                    <th className="px-10 py-6 text-center">Receipt</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {appointments.length > 0 ? appointments.map((apt, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 group transition-all">
                                                        <td className="px-10 py-6">
                                                            <span className="font-black text-slate-400 text-xs">#{apt.id.slice(0, 8).toUpperCase()}</span>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100">
                                                                    <img src={apt.image} alt="" className="w-full h-full object-cover" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900">{apt.doctorName}</p>
                                                                    <p className="text-[10px] font-bold text-mediteal uppercase">{apt.specialty}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <p className="font-bold text-slate-600 text-sm">{apt.slot.split(' at ')[0]}</p>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <p className="font-black text-slate-900">₹{apt.fee}</p>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Successful</span>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedReceiptData({
                                                                        patientName: apt.patientName,
                                                                        doctorName: apt.doctorName,
                                                                        specialty: apt.specialty,
                                                                        date: apt.slot.split(' at ')[0],
                                                                        time: apt.slot.split(' at ')[1],
                                                                        amount: apt.fee,
                                                                        referenceId: apt.id.toUpperCase()
                                                                    });
                                                                    setShowReceiptModal(true);
                                                                }}
                                                                className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-mediteal hover:border-mediteal hover:shadow-lg transition-all group/btn"
                                                            >
                                                                <Printer className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="6" className="px-10 py-20 text-center">
                                                            <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                            <p className="text-slate-400 font-bold">No transaction history found.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-10 bg-slate-50/50 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-slate-500 font-bold text-sm">
                                            <p>Showing {appointments.length} transactions</p>
                                            <div className="flex gap-2">
                                                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200">1</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'Meeting Room' && activeMeeting ? (
                            <div className="h-[80vh] bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden isolate relative z-10">
                                <PatientMeetingRoom
                                    meetingId={`meeting-${activeMeeting.id}`}
                                    patientName={user?.name || 'Patient'}
                                    doctorName={activeMeeting.doctorName}
                                    onLeave={() => {
                                        setActiveMeeting(null);
                                        setActiveTab('Dashboard');
                                    }}
                                />
                            </div>
                        ) : activeTab === 'Notifications' ? (
                            <Notifications appointments={appointments} userName={user?.name} />
                        ) : activeTab === 'Insurance' ? (
                            <Insurance activeProfile={JSON.parse(localStorage.getItem('activeProfile') || '{}')} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                                    <Activity size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">{activeTab} Section</h3>
                                <p className="text-slate-500 font-medium mt-2 max-w-sm">We are currently perfecting this module. Check back soon for exciting updates!</p>
                                <button
                                    onClick={() => setActiveTab('Dashboard')}
                                    className="mt-8 px-8 py-3 bg-mediteal text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-mediteal-dark transition-all"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <ReceiptModal 
                    isOpen={showReceiptModal} 
                    onClose={() => setShowReceiptModal(false)}
                    data={selectedReceiptData}
                />
            </main>

            <button onClick={() => navigate('/patient')} className="fixed bottom-10 right-10 w-16 h-16 bg-mediteal text-white rounded-[2rem] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group">
                <MessageSquare size={28} />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full text-[10px] font-bold flex items-center justify-center">2</span>
            </button>

            {showReadingModal && selectedMetric && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowReadingModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                        <button onClick={() => setShowReadingModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-50 rounded-xl">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`${selectedMetric.bg} ${selectedMetric.color} p-4 rounded-2xl`}>
                                <selectedMetric.icon size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add {selectedMetric.name}</h3>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-0.5">Health Tracker • {selectedMetric.unit}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Value Inputs */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reading Value ({selectedMetric.unit})</label>
                                {selectedMetric.id === 'bp' ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <input 
                                                type="number" 
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-mediteal/30 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all" 
                                                placeholder="Systolic" 
                                                value={newReading.value} 
                                                onChange={(e) => setNewReading({ ...newReading, value: e.target.value })} 
                                            />
                                            <span className="text-[9px] font-bold text-slate-400 mt-1 block px-1">SYS</span>
                                        </div>
                                        <span className="text-2xl font-black text-slate-200 mt-[-18px]">/</span>
                                        <div className="flex-1">
                                            <input 
                                                type="number" 
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-mediteal/30 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all" 
                                                placeholder="Diastolic" 
                                                value={newReading.value2} 
                                                onChange={(e) => setNewReading({ ...newReading, value2: e.target.value })} 
                                            />
                                            <span className="text-[9px] font-bold text-slate-400 mt-1 block px-1">DIA</span>
                                        </div>
                                    </div>
                                ) : (
                                    <input 
                                        type="number" 
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-mediteal/30 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all" 
                                        placeholder={`Enter ${selectedMetric.name}`}
                                        value={newReading.value} 
                                        onChange={(e) => setNewReading({ ...newReading, value: e.target.value })} 
                                    />
                                )}
                            </div>

                            {/* Date & Time Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Calendar size={10} className="text-mediteal" /> Reading Date
                                    </label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 focus:border-mediteal/30 focus:bg-white rounded-xl outline-none font-bold text-sm text-slate-700 transition-all" 
                                        value={newReading.date} 
                                        onChange={(e) => setNewReading({ ...newReading, date: e.target.value })} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Clock size={10} className="text-mediteal" /> Reading Time
                                    </label>
                                    <input 
                                        type="time" 
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 focus:border-mediteal/30 focus:bg-white rounded-xl outline-none font-bold text-sm text-slate-700 transition-all" 
                                        value={newReading.time} 
                                        onChange={(e) => setNewReading({ ...newReading, time: e.target.value })} 
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => setShowReadingModal(false)} 
                                    className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={handleSaveReading} 
                                    className="flex-1 py-4 bg-mediteal text-white rounded-2xl font-black text-sm hover:bg-mediteal-dark shadow-lg shadow-mediteal/20 transition-all active:scale-[0.98]"
                                >
                                    Log Reading
                                </button>
                            </div>
                        </div>

                        <p className="mt-8 text-center text-[10px] font-bold text-slate-300 italic flex items-center justify-center gap-2">
                            <ShieldCheck size={12} />
                            Data is locally encrypted for your privacy
                        </p>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-8 shadow-2xl">
                        <h3 className="text-2xl font-extrabold mb-8">Track New Metric</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {availableMetrics.map((m) => {
                                const isAdded = metrics.find(ex => ex.id === m.id);
                                return (
                                    <button key={m.id} disabled={isAdded} onClick={() => addMetric(m)} className={`p-6 rounded-3xl border-2 ${isAdded ? 'opacity-50' : 'hover:border-mediteal'}`}>
                                        <div className={`${m.bg} ${m.color} p-4 rounded-2xl mb-2 flex justify-center`}><m.icon size={28} /></div>
                                        <p className="font-bold text-sm">{m.name}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
                .shadow-glow { box-shadow: 0 0 8px #0D9488; }
            `}} />
        </div>
    );
};

export default PatientDashboard;
