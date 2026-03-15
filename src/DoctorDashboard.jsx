import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, LayoutDashboard, Calendar, Users, Settings, LogOut,
  Bell, Search, Plus, Clock, Star, TrendingUp, Award, CheckCircle2, Check, User, FileText,
  ArrowRight, ArrowLeft, Video, Menu, X
} from 'lucide-react';
import { doctorApi, appointmentApi, meetingApi, notificationApi } from './lib/api';
import { socket, connectSocket } from './lib/socket';
import DoctorMeetingRoom from './DoctorMeetingRoom';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [status, setStatus] = useState('idle');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [updatingId, setUpdatingId] = useState(null);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [newSlotTime, setNewSlotTime] = useState('');

  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appToReschedule, setAppToReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleAmPm, setRescheduleAmPm] = useState('AM');
  
  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    specialization: '',
    hospital: '',
    experience: '',
    fees: ''
  });

  const fetchAppointments = async () => {
    const savedDoctor = localStorage.getItem('medisync_doctor_user');
    if (!savedDoctor) return;
    const docData = JSON.parse(savedDoctor);
    try {
      console.log("MediSync DEBUG: Fetching appointments for doctor:", docData.id || docData.userId);
      const response = await doctorApi.getAppointments(docData.id || docData.userId);
      const mappedData = response.data.map(app => ({
        ...app,
        patientName: app.profile?.name || app.patient_name || app.patient?.name || 'Unknown Patient',
        slot: `${app.appointment_date} at ${app.appointment_time}`,
        medicalSummary: app.ai_generated_summary,
        medicalRecords: []
      }));
      console.log("MediSync DEBUG: Mapped appointments:", mappedData.length);
      setAppointments(mappedData);
    } catch (err) {
      console.error("MediSync ERROR: Failed to fetch appointments:", err);
    }
  };

  useEffect(() => {
    const savedDoctor = localStorage.getItem('medisync_doctor_user');
    if (!savedDoctor) {
      navigate('/doctor/login');
      return;
    }
    const docData = JSON.parse(savedDoctor);
    setDoctor(docData);

    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Notification Logic
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await notificationApi.getNotifications(doctor.id);
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.isRead).length);
      } catch (err) {
        console.error("MediSync: Failed to fetch notifications:", err);
      }
    };

    if (doctor?.id) {
      fetchNotifications();
      connectSocket(doctor.id);

      socket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Optional: Show a browser notification or a toast
        if (Notification.permission === 'granted') {
          new Notification(notification.title, { body: notification.message });
        }
      });
    }

    return () => {
      if (doctor?.id) {
        socket.off('new_notification');
      }
    };
  }, [doctor?.id]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead(doctor.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    console.log(`MediSync DEBUG: handleStatusUpdate called for ID: ${id}, Status: ${status}`);
    setUpdatingId(id);
    try {
      const response = await appointmentApi.updateStatus(id, status);
      console.log("MediSync DEBUG: Update response:", response.data);
      if (response.data.success) {
        // No alert, just refresh for smoother UX
        await fetchAppointments();
      } else {
        throw new Error(response.data.error || "Update unsuccessful");
      }
    } catch (err) {
      console.error("MediSync ERROR: Status update failed:", err);
      alert("Failed to update status: " + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartMeeting = async (app) => {
    try {
      setUpdatingId(`meeting-${app.id}`);
      const response = await meetingApi.start({
        patientId: app.patientId,
        doctorId: doctor.id,
        appointmentId: app.id
      });
      
      if (response.data.success) {
        const meetingData = { 
          roomId: response.data.roomId, 
          appointment: app,
          jitsiDomain: response.data.jitsiDomain,
          jitsiAppID: response.data.jitsiAppID,
          jwt: response.data.jwt
        };

        if (activeTab === 'Meeting Room') {
          setActiveMeeting(meetingData);
        } else {
          navigate(`/doctor/meeting/${response.data.roomId}`, { state: meetingData });
        }
      }
    } catch (err) {
      console.error("Failed to start meeting:", err);
      alert("Could not start video meeting. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const response = await doctorApi.updateProfile({
        userId: doctor.id,
        name: profileForm.name,
        specialization: profileForm.specialization,
        hospital: profileForm.hospital,
        experience: profileForm.experience,
        consultation_fee: profileForm.fees
      });

      if (response.data.success) {
        // Update local doctor state
        const updatedDoctor = {
          ...doctor,
          name: profileForm.name,
          specialization: profileForm.specialization,
          speciality: profileForm.specialization, // Handle possible naming variations
          hospital: profileForm.hospital,
          experience: parseInt(profileForm.experience),
          fees: parseFloat(profileForm.fees),
          consultation_fee: parseFloat(profileForm.fees)
        };
        setDoctor(updatedDoctor);
        
        // Update localStorage
        localStorage.setItem('medisync_doctor_user', JSON.stringify(updatedDoctor));
        
        setShowProfileModal(false);
        alert("Professional profile updated successfully!");
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Error updating profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const formatTimeTo12h = (time24) => {
    if (!time24 || time24.includes('AM') || time24.includes('PM')) return time24;
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const uniquePatients = useMemo(() => {
    const patientMap = new Map();
    
    // Filter only past appointments that are completed or approved or rescheduled
    const pastApps = appointments.filter(app => 
      app.status === 'Completed' || app.status === 'Approved' || app.status === 'Rescheduled'
    );

    // Sort by date (newest first)
    const sortedApps = [...pastApps].sort((a, b) => {
      try {
        const dateA = new Date(`${a.appointment_date} ${a.appointment_time}`);
        const dateB = new Date(`${b.appointment_date} ${b.appointment_time}`);
        return dateB - dateA;
      } catch (e) {
        return 0;
      }
    });

    sortedApps.forEach(app => {
      const pId = app.profileId || app.patientId || app.patientName;
      if (!patientMap.has(pId)) {
        patientMap.set(pId, {
          id: pId,
          name: app.patientName,
          lastMeeting: app.appointment_date,
          lastMeetingTime: app.appointment_time,
          summary: app.medicalSummary || 'No summary available.',
          history: [app]
        });
      } else {
        patientMap.get(pId).history.push(app);
      }
    });

    let results = Array.from(patientMap.values());
    
    if (patientSearchQuery) {
      results = results.filter(p => 
        p.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
      );
    }

    return results;
  }, [appointments, patientSearchQuery]);

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

  const isPastGracePeriod = (dateStr, timeStr, graceMinutes = 10) => {
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

      const gracePeriodEnd = new Date(appointmentDate.getTime() + graceMinutes * 60000);
      return current > gracePeriodEnd;
    } catch (e) {
      console.error("Error parsing grace period time:", e);
      return false;
    }
  };

  const getTriageWeight = (category) => {
    if (!category) return 3;
    const cat = category.toLowerCase();
    if (cat === 'emergency') return 1;
    if (cat === 'moderate') return 2;
    return 3;
  };

  const sortAppointments = (apps) => {
    return [...apps].sort((a, b) => {
      // First by triage category
      const weightA = getTriageWeight(a.triage_category);
      const weightB = getTriageWeight(b.triage_category);
      if (weightA !== weightB) return weightA - weightB;
      
      // Then by date and time
      try {
        const dateA = new Date(`${a.appointment_date} ${formatTimeTo12h(a.appointment_time)}`);
        const dateB = new Date(`${b.appointment_date} ${formatTimeTo12h(b.appointment_time)}`);
        return dateA - dateB;
      } catch (e) {
        return 0;
      }
    });
  };

  const filteredAppointments = sortAppointments(appointments.filter(app => 
    app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.slot.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.status.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  const pendingAppointments = filteredAppointments.filter(app => app.status === 'Pending' || (!['Approved', 'Completed', 'Cancelled', 'Rescheduled'].includes(app.status) && !isPastAppointment(app.appointment_date, app.appointment_time)));
  
  const upcomingAppointments = filteredAppointments.filter(app => 
    (app.status === 'Approved' || app.status === 'Rescheduled' || app.status === 'Scheduled') && 
    (!isPastAppointment(app.appointment_date, app.appointment_time) || !isPastGracePeriod(app.appointment_date, app.appointment_time, 10))
  );

  const missedAppointments = filteredAppointments.filter(app => 
    (app.status === 'Approved' || app.status === 'Rescheduled' || app.status === 'Scheduled' || app.status === 'Pending') && 
    isPastAppointment(app.appointment_date, app.appointment_time) && 
    app.status !== 'Completed' && 
    app.status !== 'Cancelled'
  );

  const historyAppointments = filteredAppointments.filter(app => 
    app.status === 'Completed' || app.status === 'Cancelled'
  );

  const cancelledAppointments = filteredAppointments.filter(app => app.status === 'Cancelled');

  if (!doctor) return null;

  const renderAppointmentCard = (app, idx, showActions = true) => (
    <div key={idx} className="flex items-center justify-between p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-mediteal/30 hover:bg-white transition-all shadow-sm">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-mediteal shadow-sm">
          <User size={32} />
        </div>
        <div>
          <p className="text-2xl font-black text-slate-900 leading-tight mb-1">{app.patientName}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 text-sm font-bold">
              <Clock className="w-4 h-4 text-mediteal" />
              {app.slot}
            </span>
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest 
                ${app.status === 'Rescheduled' ? 'bg-amber-100 text-amber-600' :
                  (app.status === 'Completed' || app.status === 'Approved') ? 'bg-emerald-100 text-emerald-600' : 
                  app.status === 'Cancelled' ? 'bg-rose-100 text-rose-600' : 
                  'bg-mediteal/10 text-mediteal'}`}>
               {app.status}
             </span>
             {app.triage_category && (
               <>
                 <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                 <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest
                   ${app.triage_category.toLowerCase() === 'emergency' ? 'bg-red-100 text-red-600 border border-red-200' :
                     app.triage_category.toLowerCase() === 'moderate' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                     'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                   {app.triage_category}
                 </span>
               </>
             )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {app.medicalSummary && (
          <button
            onClick={() => setSelectedApp(app)}
            className="px-6 py-3 bg-mediteal/10 text-mediteal rounded-xl font-bold text-sm hover:bg-mediteal hover:text-white transition-all underline underline-offset-4 decoration-2"
          >
            Review AI Summary
          </button>
        )}
        
        {/* Actions for Pending / Scheduled (New Requests) */}
        {(app.status === 'Pending' || app.status === 'Scheduled') && (
          <div className="flex items-center gap-3">
            <button 
              disabled={updatingId === app.id}
              onClick={() => handleStatusUpdate(app.id, 'Cancelled')}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:border-rose-500 hover:text-rose-500 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              disabled={updatingId === app.id}
              onClick={() => handleStatusUpdate(app.id, 'Approved')}
              className="px-8 py-3 bg-mediteal text-white rounded-xl font-bold text-sm shadow-lg hover:bg-mediblue transition-all disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        )}


        {/* Actions for Approved / Scheduled / Rescheduled */}
        {(app.status === 'Approved' || app.status === 'Scheduled' || app.status === 'Rescheduled') && (
          <div className="flex items-center gap-3">
             {!isPastGracePeriod(app.appointment_date, app.appointment_time, 10) && (
               <button
                disabled={updatingId === `meeting-${app.id}`}
                onClick={() => activeTab === 'Meeting Room' ? handleStartMeeting(app) : setActiveTab('Meeting Room')}
                className="p-4 bg-mediteal text-white rounded-xl shadow-lg hover:bg-mediblue transition-all flex items-center justify-center min-w-[56px] min-h-[56px] disabled:opacity-50"
                title={activeTab === 'Meeting Room' ? "Start Video Consultation" : "Go to Meeting Room"}
              >
                {updatingId === `meeting-${app.id}` ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Video className="w-6 h-6" />
                )}
              </button>
             )}
            {app.status !== 'Rescheduled' && !isPastAppointment(app.appointment_date, app.appointment_time) && (
              <button 
                disabled={updatingId === app.id}
                onClick={() => handleStatusUpdate(app.id, 'Completed')}
                className="p-4 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center min-w-[56px] min-h-[56px] disabled:opacity-50"
                title="Mark as Completed"
              >
                <Check className="w-6 h-6" />
              </button>
            )}
            {/* Show Reschedule only in Upcoming or Missed (showActions=true for these sections) */}
            {showActions && (
              <button 
                disabled={updatingId === app.id}
                onClick={() => {
                  setAppToReschedule(app);
                  setShowRescheduleModal(true);
                }}
                className="p-4 bg-amber-500 text-white rounded-xl shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center min-w-[56px] min-h-[56px] disabled:opacity-50"
                title="Reschedule Appointment"
              >
                <Calendar className="w-6 h-6" />
              </button>
            )}
          </div>
        )}

        {/* Action to undo completion or cancellation */}
        {showActions && (app.status === 'Completed' || app.status === 'Cancelled') && (
          <button 
            disabled={updatingId === app.id}
            onClick={() => handleStatusUpdate(app.id, 'Approved')}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl font-bold text-xs hover:border-mediteal hover:text-mediteal transition-all disabled:opacity-50 whitespace-nowrap"
          >
            Move back to Upcoming
          </button>
        )}
      </div>
    </div>
  );

  const handleLogout = () => {
    localStorage.removeItem('medisync_doctor_user');
    navigate('/doctor/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: Calendar, label: 'Appointments' },
    { icon: Video, label: 'Meeting Room' },
    { icon: Users, label: 'Patients' },
    { icon: Settings, label: 'Settings' },
  ];

  // Dynamic Stats
  const dynamicStats = [
    { label: 'Today\'s Appointments', value: appointments.length.toString(), icon: Calendar, color: 'mediteal' },
    { label: 'New Patients', value: '84', icon: Users, color: 'mediblue' },
    { label: 'Satisfaction Rate', value: '98%', icon: Star, color: 'amber-400' },
    { label: 'Total Practice Growth', value: '+12.5%', icon: TrendingUp, color: 'emerald-500' },
  ];

  const shouldCollapseSidebar = activeTab === 'Meeting Room' && activeMeeting;

  return (
    <div className="min-h-screen bg-slate-50 flex h-screen overflow-hidden relative">
      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] ${shouldCollapseSidebar ? '' : 'md:hidden'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`
        fixed ${shouldCollapseSidebar ? '' : 'md:relative'} flex flex-col pt-12 px-8 pb-8 bg-white border border-slate-200 z-[70] transition-all duration-300 ease-in-out flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 inset-y-0 left-0 w-72' : `-translate-x-full ${shouldCollapseSidebar ? '' : 'md:translate-x-0 md:w-72 md:inset-y-6 md:ml-6 md:my-6 md:rounded-[2.5rem] md:shadow-xl md:shadow-slate-200/50'}`}
        ${activeTab === 'Meeting Room' ? 'md:my-0 md:ml-0 md:rounded-none md:inset-y-0' : ''}
      `}>
        <div className="flex items-center justify-between lg:block mb-12">
          <div className="flex items-center gap-3 text-mediteal">
            <div className="w-10 h-10 bg-mediteal/10 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter">MediSync<span className="text-slate-400">PRO</span></span>
          </div>
          <button 
            className={`${shouldCollapseSidebar ? '' : 'md:hidden'} p-2 text-slate-400 hover:text-slate-600`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 pr-2">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveTab(item.label);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all group
                ${activeTab === item.label ? 'bg-mediteal text-white shadow-lg shadow-mediteal/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm text-rose-400 hover:bg-rose-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden h-screen w-full relative flex flex-col ${activeTab === 'Meeting Room' ? '' : 'md:px-6'}`}>
        {/* Top Header - Hide in Meeting Room to maximize space */}
        {activeTab !== 'Meeting Room' && (
          <header className={`bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 md:px-10 py-10 sticky top-0 z-50 flex items-center justify-between md:rounded-b-[40px] flex-shrink-0 transition-all`}>
            <div className="flex items-center gap-4">
              <button 
                className="md:hidden p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="relative w-48 sm:w-64 md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-mediteal transition-colors" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-mediteal/20 transition-all text-sm font-medium"
                />
              </div>
            </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-3 rounded-xl transition-all relative ${showNotifications ? 'bg-mediteal text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] text-white font-black">{unreadCount}</span>
                  </div>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 py-6 z-[100] animate-in slide-in-from-top-2 duration-300">
                  <div className="px-6 pb-4 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Notifications</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Alerts & Updates</p>
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-black text-mediteal hover:text-mediblue uppercase tracking-tight bg-mediteal/5 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                          className={`p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all cursor-pointer relative group ${!notif.isRead ? 'bg-mediteal/[0.02]' : ''}`}
                        >
                          {!notif.isRead && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-mediteal rounded-r-full"></div>
                          )}
                          <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl ${
                              notif.type === 'appointment_booked' ? 'bg-emerald-50 text-emerald-500' :
                              notif.type === 'payment_success' ? 'bg-blue-50 text-blue-500' :
                              'bg-slate-50 text-slate-400'
                            }`}>
                              {notif.type === 'appointment_booked' ? <Calendar className="w-5 h-5" /> : 
                               notif.type === 'payment_success' ? <TrendingUp className="w-5 h-5" /> : 
                               <Bell className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-black leading-tight ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</p>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}</p>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-mediteal mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                          <Bell size={32} />
                        </div>
                        <p className="text-slate-400 font-bold italic">No notifications yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="px-6 pt-4 border-t border-slate-50 text-center">
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all"
                    >
                      Close Panel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="h-10 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-tight">{doctor.name}</p>
                <p className="text-[10px] font-bold text-mediteal uppercase tracking-widest leading-tight">{doctor.specialization}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden ring-4 ring-slate-50 shadow-sm">
                <img src={doctor.profile_photo || doctor.profile_image} alt={doctor.name} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>
      )}

        {/* Mobile menu trigger for Meeting Room (since header is hidden) */}
        {activeTab === 'Meeting Room' && (
          <button 
            className={`${shouldCollapseSidebar ? '' : 'md:hidden'} fixed top-6 left-6 z-[65] p-3 bg-white/80 backdrop-blur-md text-slate-400 rounded-xl shadow-lg border border-slate-200 hover:bg-white transition-all`}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {/* Dashboard View */}
        {activeTab === 'Dashboard' && (
          <div className="flex-1 overflow-y-auto min-h-0 lg:mt-6">
            <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            {/* Welcome Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-mediteal/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-mediteal/30 transition-all duration-700"></div>
              <div className="relative z-10">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 text-mediteal rounded-full text-xs font-black uppercase tracking-widest mb-6">
                  < Award className="w-4 h-4" /> Practice Overview
                </span>
                <h1 className="text-5xl font-black text-white mb-4">Good morning, <br /> {doctor.name}</h1>
                <p className="text-slate-400 text-lg max-w-lg mb-8">You have <span className="text-white font-bold">{appointments.length} appointments</span> scheduled. {appointments.length > 0 ? 'Review your latest bookings below.' : 'No appointments yet today.'}</p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setActiveTab('Appointments')}
                    className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <Plus className="w-5 h-5" /> View Full Schedule
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('Appointments');
                      setTimeout(() => {
                        document.getElementById('rescheduled-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <Calendar className="w-5 h-5" /> Rescheduled
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dynamicStats.map((stat, idx) => (
                <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-mediteal/10 group-hover:text-mediteal transition-all`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                    {idx === 3 && <div className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+12% ↑</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Appointments */}
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">Recent Bookings</h3>
                    <p className="text-slate-400 font-medium">Your latest patient appointments</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('Appointments')}
                    className="p-3 bg-mediteal/10 text-mediteal rounded-xl hover:bg-mediteal hover:text-white transition-all flex items-center gap-2 px-4 shadow-sm"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">All</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid gap-4">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.slice(0, 5).map((app, idx) => (
                      <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-mediteal/30 hover:bg-white transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-mediteal shadow-sm">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-tight">{app.patientName}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{app.slot} • {app.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {app.medicalSummary && (
                            <div className="flex items-center gap-2">
                              {app.triage_category && (
                                <div 
                                  className={`w-3 h-3 rounded-full shadow-sm animate-pulse ${
                                    app.triage_category.toLowerCase() === 'emergency' ? 'bg-red-500 shadow-red-500/50' :
                                    app.triage_category.toLowerCase() === 'moderate' ? 'bg-amber-500 shadow-amber-500/50' :
                                    'bg-emerald-500 shadow-emerald-500/50'
                                  }`} 
                                  title={`Triage: ${app.triage_category}`}
                                />
                              )}
                              <button
                                onClick={() => setSelectedApp(app)}
                                className="text-[10px] font-black text-mediteal bg-mediteal/5 px-2 py-1 rounded-lg hover:bg-mediteal hover:text-white transition-all border border-mediteal/20"
                              >
                                AI SUMMARY
                              </button>
                            </div>
                          )}
                          {(app.status === 'Approved' || app.status === 'Scheduled' || app.status === 'Rescheduled') && (
                            <div className="flex items-center gap-2">
                              {!isPastGracePeriod(app.appointment_date, app.appointment_time, 10) && (
                                <button
                                  disabled={updatingId === `meeting-${app.id}`}
                                  onClick={() => handleStartMeeting(app)}
                                  className="p-3 bg-mediteal text-white rounded-xl shadow-lg hover:bg-mediblue transition-all flex items-center justify-center disabled:opacity-50"
                                  title="Start Video Consultation"
                                >
                                  {updatingId === `meeting-${app.id}` ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Video className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Paid</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
                      <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Sidebar */}
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-slate-100 ring-[12px] ring-slate-50 shadow-inner mb-8 mt-4">
                  <img src={doctor.profile_photo || doctor.profile_image} alt={doctor.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                  <Award className="w-4 h-4" /> Verified Expert
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-1 leading-none">{doctor.name}</h3>
                <p className="text-mediteal font-bold mb-8">{doctor.degree}</p>

                <div className="w-full h-[1px] bg-slate-100 mb-8"></div>

                <div className="w-full space-y-4 text-left">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Fees</span>
                    <span className="font-black text-slate-900 italic">₹{doctor.fees}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Experience</span>
                    <span className="font-black text-slate-900 italic">12+ Years</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setProfileForm({
                      name: doctor.name || '',
                      specialization: doctor.specialization || doctor.speciality || '',
                      hospital: doctor.hospital || '',
                      experience: doctor.experience?.toString() || '',
                      fees: (doctor.fees || doctor.consultation_fee)?.toString() || ''
                    });
                    setShowProfileModal(true);
                  }}
                  className="w-full mt-12 py-5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                >
                  <Settings className="w-5 h-5" /> Edit Professional Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Appointments View */}
        {activeTab === 'Appointments' && (
          <div className="flex-1 overflow-y-auto min-h-0 lg:mt-6">
            <div className="p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-slate-900">Your Schedule</h2>
                <p className="text-slate-500 font-medium">Manage and review all your appointments</p>
              </div>
              <div className="flex gap-4">
                <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-mediteal transition-all">
                  Today
                </button>
                <button className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:border-mediteal hover:text-mediteal transition-all">
                  Next 7 Days
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-12">
              {/* Pending Requests */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-amber-400 rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pending Requests</h3>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black">{pendingAppointments.length}</span>
                </div>
                <div className="grid gap-6">
                  {pendingAppointments.length > 0 ? (
                    pendingAppointments.map((app, idx) => renderAppointmentCard(app, idx, true))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                      No pending requests at the moment.
                    </div>
                  )}
                </div>
              </section>

              {/* Upcoming Consultations (Includes Rescheduled) */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Upcoming Consultations</h3>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{upcomingAppointments.length}</span>
                </div>
                <div className="grid gap-6">
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((app, idx) => renderAppointmentCard(app, idx, true))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                      No upcoming consultations scheduled.
                    </div>
                  )}
                </div>
              </section>

              {/* Missed Appointments */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Missed Appointments</h3>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black">{missedAppointments.length}</span>
                </div>
                <div className="grid gap-6">
                  {missedAppointments.length > 0 ? (
                    missedAppointments.map((app, idx) => renderAppointmentCard(app, idx, true))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                      No missed appointments.
                    </div>
                  )}
                </div>
              </section>

              {/* Cancelled Appointments */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-rose-500 rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cancelled</h3>
                  <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-black">{cancelledAppointments.length}</span>
                </div>
                <div className="grid gap-6">
                  {cancelledAppointments.length > 0 ? (
                    cancelledAppointments.map((app, idx) => renderAppointmentCard(app, idx, false))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                      No cancelled appointments.
                    </div>
                  )}
                </div>
              </section>

              {/* Consultation History */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-slate-400 rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Consultation History</h3>
                  <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-black">{historyAppointments.length}</span>
                </div>
                <div className="grid gap-6">
                  {historyAppointments.length > 0 ? (
                    historyAppointments.map((app, idx) => renderAppointmentCard(app, idx, false))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                      No consultation history yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'Meeting Room' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeMeeting ? (
              <div className="flex-1 bg-white relative overflow-hidden">
                <DoctorMeetingRoom 
                  roomId={activeMeeting.roomId}
                  appointment={activeMeeting.appointment}
                  onBack={() => setActiveMeeting(null)}
                />
              </div>
            ) : (
              <div className="p-10 max-w-7xl mx-auto space-y-8 w-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900">Upcoming Consultations</h2>
                    <p className="text-slate-500 font-medium">Ready for your video calls</p>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-12">
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Active Consultation Queue</h3>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{upcomingAppointments.length}</span>
                    </div>
                    <div className="grid gap-6">
                      {upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map((app, idx) => renderAppointmentCard(app, idx, true))
                      ) : (
                        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                          <Video className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold italic">No approved consultations ready for meetings.</p>
                          <p className="text-slate-300 text-xs font-medium uppercase mt-2 tracking-widest">Approve some requests from the Appointments tab</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'Settings' && (
          <div className="flex-1 overflow-y-auto min-h-0 lg:mt-6">
            <div className="p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-slate-900">Practice Settings</h2>
                <p className="text-slate-500 font-medium">Manage your profile and availability</p>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-12">
              {/* Profile Information Section */}
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Profile Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Professional Name</label>
                    <input 
                      type="text"
                      value={doctor.name || ''}
                      onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                      onBlur={async (e) => {
                        try {
                          await doctorApi.updateProfile({ userId: doctor.userId || doctor.id, name: e.target.value });
                          localStorage.setItem('medisync_doctor_user', JSON.stringify({ ...doctor, name: e.target.value }));
                        } catch (err) { alert("Failed to update name"); }
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization</label>
                    <input 
                      type="text"
                      value={doctor.specialization || doctor.doctorProfile?.specialization || ''}
                      onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
                      onBlur={async (e) => {
                        try {
                          await doctorApi.updateProfile({ userId: doctor.userId || doctor.id, specialization: e.target.value });
                        } catch (err) { alert("Failed to update specialization"); }
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Clinic</label>
                    <input 
                      type="text"
                      value={doctor.hospital || doctor.doctorProfile?.hospital || ''}
                      onChange={(e) => setDoctor({ ...doctor, hospital: e.target.value })}
                      onBlur={async (e) => {
                        try {
                          await doctorApi.updateProfile({ userId: doctor.userId || doctor.id, hospital: e.target.value });
                        } catch (err) { alert("Failed to update hospital"); }
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Years of Experience</label>
                    <input 
                      type="number"
                      value={doctor.experience || doctor.doctorProfile?.experience || ''}
                      onChange={(e) => setDoctor({ ...doctor, experience: e.target.value })}
                      onBlur={async (e) => {
                        try {
                          await doctorApi.updateProfile({ userId: doctor.userId || doctor.id, experience: e.target.value });
                        } catch (err) { alert("Failed to update experience"); }
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900" 
                    />
                  </div>
                </div>
              </section>

              <div className="h-[1px] bg-slate-100"></div>

              {/* Availability Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-mediteal rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Manage Availability</h3>
                </div>
                
                <p className="text-sm text-slate-500 font-medium">Select the time slots you are available for consultations. These will be visible to patients.</p>

                <div className="space-y-8 mt-6">
                  <div className="flex flex-wrap gap-4">
                    {(() => {
                      const availableSlots = typeof doctor.available_time_slots === 'string' 
                        ? JSON.parse(doctor.available_time_slots) 
                        : (doctor.available_time_slots || []);
                      
                      return availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                          <div
                            key={slot}
                            className="bg-mediteal text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-lg shadow-mediteal/10 border border-mediteal"
                          >
                            {slot}
                            <button 
                              onClick={async () => {
                                try {
                                  const newSlots = availableSlots.filter(s => s !== slot);
                                  setUpdatingId('saving-slots');
                                  const res = await doctorApi.updateProfile({
                                    userId: doctor.userId || doctor.id,
                                    available_time_slots: newSlots
                                  });
                                  if (res.data.success) {
                                    const updatedDoctor = { ...doctor, available_time_slots: JSON.stringify(newSlots) };
                                    setDoctor(updatedDoctor);
                                    localStorage.setItem('medisync_doctor_user', JSON.stringify(updatedDoctor));
                                  }
                                } catch (err) {
                                  console.error("Failed to remove slot:", err);
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all"
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="w-full p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold italic">
                          No slots added yet. Use the tool below to add your availability.
                        </div>
                      )
                    })()}
                  </div>


                  <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 max-w-md">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Select Time</label>
                      <input 
                        type="time"
                        value={newSlotTime}
                        onChange={(e) => setNewSlotTime(e.target.value)}
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-mediteal transition-all font-bold text-slate-900"
                      />
                    </div>
                    <div className="pt-6">
                      <button
                        onClick={async () => {
                          if (!newSlotTime) return;
                          const formattedTime = formatTimeTo12h(newSlotTime);
                          const availableSlots = typeof doctor.available_time_slots === 'string' 
                            ? JSON.parse(doctor.available_time_slots) 
                            : (doctor.available_time_slots || []);
                          
                          if (availableSlots.includes(formattedTime)) {
                            alert("This slot is already added!");
                            return;
                          }

                          const newSlots = [...availableSlots, formattedTime];
                          
                          try {
                            setUpdatingId('saving-slots');
                            const res = await doctorApi.updateProfile({
                              userId: doctor.userId || doctor.id,
                              available_time_slots: newSlots
                            });
                            if (res.data.success) {
                              const updatedDoctor = { ...doctor, available_time_slots: JSON.stringify(newSlots) };
                              setDoctor(updatedDoctor);
                              localStorage.setItem('medisync_doctor_user', JSON.stringify(updatedDoctor));
                              setNewSlotTime('');
                            }
                          } catch (err) {
                            console.error("Failed to add slot:", err);
                            alert("Failed to save availability.");
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        disabled={!newSlotTime || updatingId === 'saving-slots'}
                        className="p-4 bg-mediteal text-white rounded-xl shadow-lg hover:bg-mediblue transition-all flex items-center gap-2 group disabled:opacity-50"
                      >
                        {updatingId === 'saving-slots' ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
                            <span className="text-sm font-bold uppercase tracking-widest px-2">Add Slot</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-[1px] bg-slate-100"></div>

              {/* Consultation Fee Section */}
              <section className="space-y-6">
                 <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-mediblue rounded-full"></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Consultation Fee</h3>
                </div>
                <div className="flex items-center gap-4 max-w-xs">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      type="number"
                      value={doctor.consultation_fee || doctor.fees || 500}
                      onChange={async (e) => {
                        const newFee = e.target.value;
                        setDoctor({ ...doctor, consultation_fee: newFee, fees: newFee });
                      }}
                      onBlur={async (e) => {
                        try {
                          await doctorApi.updateProfile({
                            userId: doctor.userId || doctor.id,
                            consultation_fee: e.target.value
                          });
                          const updated = { ...doctor, consultation_fee: e.target.value, fees: e.target.value };
                          localStorage.setItem('medisync_doctor_user', JSON.stringify(updated));
                        } catch (err) {
                          alert("Failed to update fee");
                        }
                      }}
                      className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900" 
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'Patients' && (
          <div className="flex-1 overflow-y-auto min-h-0 lg:mt-6">
            <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-slate-900">Your Patients</h2>
                <p className="text-slate-500 font-medium">Manage and view patient medical history</p>
              </div>
              <div className="relative w-80">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Search patients..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-mediteal shadow-sm transition-all font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="grid gap-6">
              {uniquePatients.length > 0 ? (
                uniquePatients.map((patient) => (
                  <div key={patient.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-lg hover:border-mediteal/20 transition-all group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-mediteal/5 group-hover:text-mediteal transition-all duration-300">
                          <User size={40} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 group-hover:text-mediteal transition-colors">{patient.name}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100/50">
                              <Calendar className="w-3.5 h-3.5" /> Last Met: {patient.lastMeeting}
                            </span>
                            <span className="text-xs font-black text-mediteal uppercase tracking-widest bg-mediteal/5 px-3 py-1.5 rounded-lg">
                              {patient.history.length} Sessions
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedApp(patient.history[0])}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-mediteal shadow-lg shadow-slate-900/10 hover:shadow-mediteal/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                        <FileText className="w-5 h-5" /> View Latest Record
                      </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100/50">
                      <div className="bg-slate-50/50 p-8 rounded-[2rem] relative overflow-hidden group/summary border border-slate-100/50">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover/summary:bg-mediteal transition-colors duration-500"></div>
                        <div className="flex items-center gap-3 mb-6">
                          <Clock className="w-4 h-4 text-mediteal" />
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Session History & Insights</h4>
                        </div>
                        
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {patient.history.map((app, appIdx) => (
                            <div key={app.id} className="flex items-start justify-between gap-4 p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm group/session hover:border-mediteal/30 transition-all">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-sm font-black text-slate-700">{app.appointment_date}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-md">{app.appointment_time}</span>
                                  {appIdx === 0 && <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">MOST RECENT</span>}
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 font-medium leading-relaxed">
                                  {app.ai_generated_summary || "No specific summary recorded for this session."}
                                </p>
                              </div>
                              <button 
                                onClick={() => setSelectedApp(app)}
                                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                title="View Full Session Details"
                              >
                                <ArrowRight size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-32 bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200/60 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
                  <Users className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-slate-800 mb-2">No patients found</h3>
                  <p className="text-slate-400 font-bold italic">We couldn't find any records matching "{patientSearchQuery}"</p>
                  <button 
                    onClick={() => setPatientSearchQuery('')}
                    className="mt-8 px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


        {/* Reschedule Modal */}
        {showRescheduleModal && appToReschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowRescheduleModal(false)}
            ></div>
            <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900">Reschedule</h3>
                <button onClick={() => setShowRescheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">New Date</label>
                  <input 
                    type="date" 
                    value={rescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">New Time</label>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="HH:MM"
                      value={rescheduleTime}
                      onChange={(e) => {
                        // Allow only numbers and colon
                        const val = e.target.value.replace(/[^\d:]/g, '');
                        // Auto-insert colon if they type 2 digits (and no colon exists)
                        if (val.length === 2 && !val.includes(':') && e.target.value.length === 2) {
                          setRescheduleTime(val + ':');
                        } else if (val.length <= 5) {
                          setRescheduleTime(val);
                        }
                      }}
                      className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-900 placeholder:text-slate-300"
                    />
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      <button 
                        type="button"
                        onClick={() => setRescheduleAmPm('AM')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${rescheduleAmPm === 'AM' ? 'bg-white shadow-sm text-mediteal' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        AM
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRescheduleAmPm('PM')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${rescheduleAmPm === 'PM' ? 'bg-white shadow-sm text-mediteal' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!rescheduleDate || rescheduleTime.length < 4 || updatingId === 'rescheduling'}
                  onClick={async () => {
                    if (!rescheduleDate || !rescheduleTime) return;
                    try {
                      setUpdatingId('rescheduling');
                      
                      // Format the final string exactly like the backend expects: "09:30 AM"
                      // Ensure leading zero if they type "9:30"
                      let formattedTimeStr = rescheduleTime.trim();
                      if (formattedTimeStr.length === 4 && formattedTimeStr.indexOf(':') === 1) {
                         formattedTimeStr = '0' + formattedTimeStr;
                      }
                      const finalTimeString = `${formattedTimeStr} ${rescheduleAmPm}`;

                      const response = await appointmentApi.reschedule(appToReschedule.id, {
                        appointmentDate: rescheduleDate,
                        appointmentTime: finalTimeString
                      });
                      if (response.data.success) {
                        setShowRescheduleModal(false);
                        fetchAppointments();
                      }
                    } catch (err) {
                      console.error("Reschedule failed:", err);
                      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
                      alert(`Failed to reschedule appointment: ${errorMsg}`);
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                  className="w-full py-5 bg-mediteal text-white rounded-2xl font-black text-sm shadow-xl shadow-mediteal/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {updatingId === 'rescheduling' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Summary Modal */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setSelectedApp(null)}
            ></div>
            <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-mediteal/20 rounded-2xl flex items-center justify-center text-mediteal">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">AI Intake Summary</h2>
                    <p className="text-slate-400 text-sm font-medium">Patient: {selectedApp.patientName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="absolute top-8 right-8 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                    {selectedApp.medicalSummary ? (
                      selectedApp.medicalSummary.split('\n').map((line, i) => {
                        const isHeader = /^[A-Z\s]{5,}$/.test(line.trim());
                        if (line.includes('SUMMARY PREPARED')) return null;
                        if (isHeader) {
                          return <h3 key={i} className="font-black text-slate-900 text-xs tracking-[0.2em] uppercase mt-8 mb-4 border-b border-slate-100 pb-2 first:mt-0">{line}</h3>;
                        }
                        return <p key={i} className={`mb-1 ${line.startsWith('-') ? 'ml-2 text-slate-600' : ''}`}>{line}</p>;
                      })
                    ) : (
                      "No summary available for this appointment."
                    )}
                  </div>

                  {/* Medical Records Section */}
                  {selectedApp.medicalRecords && selectedApp.medicalRecords.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h3 className="font-black text-slate-900 text-xs tracking-[0.2em] uppercase mb-4">Uploaded Records</h3>
                      <div className="grid gap-3">
                        {selectedApp.medicalRecords.map((record, idx) => (
                          <a
                            key={idx}
                            href={record.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-mediteal/30 hover:bg-white transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-mediteal shadow-sm">
                                <FileText size={20} />
                              </div>
                              <span className="text-sm font-bold text-slate-700 line-clamp-1">{record.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-mediteal group-hover:underline">VIEW DOCUMENT</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-mediteal transition-all"
                  >
                    Close Summary
                  </button>
                  <button className="px-6 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:border-mediteal hover:text-mediteal transition-all">
                    Print Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Edit Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => !isSavingProfile && setShowProfileModal(false)}
            ></div>
            <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-br from-mediteal to-mediblue p-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Settings key="profile-edit-icon" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Edit Professional Profile</h2>
                    <p className="text-white/70 text-sm font-medium">Update your clinic and practice details</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal focus:bg-white transition-all font-bold text-slate-700"
                      placeholder="e.g. Dr. Rajesh Sharma"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization</label>
                    <input 
                      type="text"
                      required
                      value={profileForm.specialization}
                      onChange={(e) => setProfileForm({...profileForm, specialization: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal focus:bg-white transition-all font-bold text-slate-700"
                      placeholder="e.g. Cardiologist"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Clinic</label>
                    <input 
                      type="text"
                      required
                      value={profileForm.hospital}
                      onChange={(e) => setProfileForm({...profileForm, hospital: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal focus:bg-white transition-all font-bold text-slate-700"
                      placeholder="e.g. City Hospital"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experience (Years)</label>
                    <input 
                      type="number"
                      required
                      value={profileForm.experience}
                      onChange={(e) => setProfileForm({...profileForm, experience: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal focus:bg-white transition-all font-bold text-slate-700"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Consultation Fees (₹)</label>
                    <input 
                      type="number"
                      required
                      value={profileForm.fees}
                      onChange={(e) => setProfileForm({...profileForm, fees: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal focus:bg-white transition-all font-bold text-slate-700"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    disabled={isSavingProfile}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex-3 px-12 py-4 bg-mediteal text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-mediblue transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        `}} />
      </main>
    </div>
  );
}
