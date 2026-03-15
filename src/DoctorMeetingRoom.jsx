import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Video, FileText, Send, User, Calendar, Plus, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { meetingApi } from './lib/api';
import { generatePrescriptionPDF } from './lib/prescriptionGenerator';

const DoctorMeetingRoom = ({ roomId: propRoomId, appointment: propAppointment, onBack: propOnBack }) => {
    const { roomId: paramRoomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Use props if available (for in-tab usage), otherwise use route params/location
    const roomId = propRoomId || paramRoomId;
    const appointment = propAppointment || location.state?.appointment || {};
    const onBack = propOnBack || (() => navigate('/doctor/dashboard'));
    
    // JaaS Support
    const jitsiDomain = propAppointment?.jitsiDomain || location.state?.jitsiDomain || 'meet.jit.si';
    const jitsiAppID = propAppointment?.jitsiAppID || location.state?.jitsiAppID || null;
    
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'prescription'
    const [showSidebar, setShowSidebar] = useState(false);
    const [meetingDetails, setMeetingDetails] = useState(null);
    const [notes, setNotes] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [medications, setMedications] = useState([
        { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]);
    const [followUp, setFollowUp] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);

    // Fetch meeting details on mount if missing (reload recovery)
    useEffect(() => {
        const fetchDetails = async () => {
            if (!location.state?.appointment && roomId) {
                try {
                    console.log("MediSync: Recovering meeting details for roomId:", roomId);
                    const response = await meetingApi.getDetails(roomId);
                    if (response.data.success) {
                        setMeetingDetails(response.data);
                    }
                } catch (err) {
                    console.error("MediSync: Failed to recover meeting details:", err);
                }
            }
        };
        fetchDetails();
    }, [roomId, location.state]);

    useEffect(() => {
        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
            const currentAppointment = appointment || meetingDetails?.appointment;
            const currentJitsiDomain = jitsiDomain || meetingDetails?.jitsiDomain || 'meet.jit.si';
            const currentJitsiAppID = jitsiAppID || meetingDetails?.jitsiAppID || null;
            
            const domain = currentJitsiDomain;
            const finalRoomName = currentJitsiAppID ? `${currentJitsiAppID}/${roomId}` : roomId;

            const jitsiJWT = propAppointment?.jwt || location.state?.jwt || meetingDetails?.jwt || null;

            const options = {
                roomName: finalRoomName,
                jwt: jitsiJWT,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                userInfo: {
                    displayName: `Dr. ${JSON.parse(localStorage.getItem('medisync_doctor_user'))?.name || 'Doctor'}`,
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                        'security'
                    ],
                },
            };
            jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
            
            jitsiApiRef.current.addEventListeners({
                readyToClose: onBack,
                videoConferenceTerminated: onBack,
                participantJoined: () => {
                    console.log("MediSync: Participant joined, showing sidebar");
                    setShowSidebar(true);
                },
            });
        };
        document.body.appendChild(script);

        return () => {
            if (jitsiApiRef.current) jitsiApiRef.current.dispose();
            if (document.body.contains(script)) document.body.removeChild(script);
        };
    }, [roomId, navigate, meetingDetails]);

    const addMedication = () => {
        setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    };

    const removeMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const handleMedicationChange = (index, field, value) => {
        const newMeds = [...medications];
        newMeds[index][field] = value;
        setMedications(newMeds);
    };

    const handleSendPrescription = async () => {
        setIsSending(true);
        try {
            const doctor = JSON.parse(localStorage.getItem('medisync_doctor_user'));
            await meetingApi.sendPrescription({
                meetingId: roomId, // Using roomId as a temporary ID for now
                doctorId: doctor.id,
                patientId: appointment.patientId,
                diagnosis,
                medications,
                notes,
                followUpDate: followUp
            });
            setIsSent(true);
            
            // Automatically generate a local copy for the doctor
            generatePrescriptionPDF({
                doctor: doctor,
                patient: { name: appointment?.patientName, id: appointment?.patientId },
                diagnosis,
                medications,
                notes,
                followUpDate: followUp,
                date: new Date().toLocaleDateString()
            });

            setTimeout(() => setIsSent(false), 5000);
        } catch (error) {
            console.error("Failed to send prescription:", error);
            alert("Failed to send prescription. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
            {/* Jitsi Section (LEFT) */}
            <div className="flex-1 relative bg-black">
                <div ref={jitsiContainerRef} className="w-full h-full" />
                <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                  <button 
                    onClick={onBack}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all border border-white/10 shadow-lg"
                  >
                      <ArrowLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all border border-white/10 shadow-lg"
                    title={showSidebar ? "Hide Notes" : "Show Notes"}
                  >
                      <FileText size={24} />
                  </button>
                </div>
            </div>

            {/* Sidebar (RIGHT) */}
            <aside className={`
                w-full sm:w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20 transition-all duration-300 flex-shrink-0
                ${showSidebar ? 'translate-x-0' : 'translate-x-full hidden sm:flex sm:w-0 sm:overflow-hidden'}
                absolute inset-y-0 right-0 sm:relative sm:translate-x-0
                ${!showSidebar ? 'sm:hidden' : ''}
            `}>
                {/* Patient Header */}
                <div className="pt-20 p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-mediteal rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                            {appointment?.patientName?.[0] || 'P'}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">{appointment?.patientName || 'Patient Name'}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <p className="text-slate-400 text-sm font-medium">Video Consultation</p>
                                {appointment?.triage_category && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest
                                           ${appointment.triage_category.toLowerCase() === 'emergency' ? 'bg-red-500/20 text-red-200 border border-red-500/30' :
                                             appointment.triage_category.toLowerCase() === 'moderate' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' :
                                             'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'}`}>
                                           {appointment.triage_category}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex p-1 bg-white/10 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('notes')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'notes' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                        >
                            <FileText size={18} />
                            Notes
                        </button>
                        <button 
                            onClick={() => setActiveTab('prescription')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'prescription' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                        >
                            <Send size={18} />
                            Prescription
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'notes' ? (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            {appointment?.ai_generated_summary && (
                                <div className="mb-6 p-4 bg-mediteal/5 border border-mediteal/20 rounded-2xl">
                                    <label className="text-xs font-black text-mediteal uppercase tracking-widest mb-2 block">AI Review Summary</label>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{appointment.ai_generated_summary}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-4 pt-4 border-t border-mediteal/10 italic">
                                        AI triage is assistive. Final clinical decision remains with the doctor.
                                    </p>
                                </div>
                            )}
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Clinical Notes</label>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Start typing clinical notes here..."
                                className="w-full h-[60vh] p-4 bg-slate-50 border border-slate-100 rounded-3xl resize-none outline-none focus:border-mediteal transition-all font-medium text-slate-700"
                            />
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                             <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Diagnosis</label>
                                <input 
                                    type="text"
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    placeholder="e.g. Common Cold, Hypertension"
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-700"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Medications</label>
                                    <button 
                                        onClick={addMedication}
                                        className="p-2 bg-mediteal/10 text-mediteal rounded-xl hover:bg-mediteal hover:text-white transition-all"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {medications.map((med, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 relative group">
                                            {medications.length > 1 && (
                                                <button 
                                                    onClick={() => removeMedication(index)}
                                                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                            <input 
                                                placeholder="Medicine Name"
                                                value={med.name}
                                                onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-slate-200 py-1 outline-none focus:border-mediteal font-bold text-slate-800"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input 
                                                    placeholder="Dosage (e.g. 500mg)"
                                                    value={med.dosage}
                                                    onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                                    className="text-xs bg-white border border-slate-100 p-2 rounded-lg outline-none"
                                                />
                                                <input 
                                                    placeholder="Freq (e.g. 1-0-1)"
                                                    value={med.frequency}
                                                    onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                                                    className="text-xs bg-white border border-slate-100 p-2 rounded-lg outline-none"
                                                />
                                            </div>
                                            <input 
                                                placeholder="Special Instructions"
                                                value={med.instructions}
                                                onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                                                className="w-full text-xs bg-white border border-slate-100 p-2 rounded-lg outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Follow-up Date</label>
                                <input 
                                    type="date"
                                    value={followUp}
                                    onChange={(e) => setFollowUp(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-mediteal transition-all font-bold text-slate-700"
                                />
                            </div>

                            <button 
                                onClick={handleSendPrescription}
                                disabled={isSending || isSent || !diagnosis}
                                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3
                                    ${isSent ? 'bg-green-500 text-white shadow-green-200' : 'bg-mediteal text-white shadow-mediteal/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100'}
                                `}
                            >
                                {isSending ? (
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                ) : isSent ? (
                                    <>
                                        <CheckCircle size={24} />
                                        Sent Successfully
                                    </>
                                ) : (
                                    <>
                                        <Send size={24} />
                                        Send Prescription
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default DoctorMeetingRoom;
