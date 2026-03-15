import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pill, Download, X, CheckCircle, VideoOff } from 'lucide-react';
import { socket } from './lib/socket';
import { generatePrescriptionPDF } from './lib/prescriptionGenerator';

const PatientMeetingRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [prescription, setPrescription] = useState(null);
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);
    const [meetingDetails, setMeetingDetails] = useState(null);

    // Fetch meeting details on mount if missing (reload recovery)
    useEffect(() => {
        const fetchDetails = async () => {
            if (!location.state?.meetingData && roomId) {
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
    }, [roomId]);

    useEffect(() => {
        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
            const meetingData = location.state?.meetingData || meetingDetails || {};
            const domain = meetingData.jitsiDomain || 'meet.jit.si';
            const jitsiAppID = meetingData.jitsiAppID || null;
            const finalRoomName = jitsiAppID ? `${jitsiAppID}/${roomId}` : roomId;

            const user = JSON.parse(localStorage.getItem('medisync_user'));
            const options = {
                roomName: finalRoomName,
                jwt: meetingData.jwt || null,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                userInfo: {
                    displayName: user?.name || 'Patient',
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'fullscreen',
                        'fodeviceselection', 'hangup', 'profile', 'chat', 'raisehand',
                        'videoquality', 'filmstrip', 'tileview', 'help'
                    ],
                },
            };
            jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
            
            jitsiApiRef.current.addEventListeners({
                readyToClose: () => navigate('/patient-dashboard'),
                videoConferenceTerminated: () => navigate('/patient-dashboard'),
            });
        };
        document.body.appendChild(script);

        // Listen for prescription
        socket.on('prescription_ready', (data) => {
            setPrescription(data);
        });

        return () => {
            if (jitsiApiRef.current) jitsiApiRef.current.dispose();
            if (document.body.contains(script)) document.body.removeChild(script);
            socket.off('prescription_ready');
        };
    }, [roomId, navigate, meetingDetails]);

    return (
        <div className="fixed inset-0 bg-black z-50">
            <div ref={jitsiContainerRef} className="w-full h-full" />

            {/* Prescription Notification */}
            {prescription && (
                <div className="absolute bottom-10 right-10 z-[60] w-96 bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-500">
                    <button 
                        onClick={() => setPrescription(null)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-mediteal/10 text-mediteal rounded-2xl flex items-center justify-center">
                            <Pill size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900">Prescription Received</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">From Dr. {prescription.doctorName}</p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-6 line-clamp-2">
                        Your digital prescription for <span className="font-bold text-slate-900">{prescription.diagnosis}</span> is ready with <span className="font-bold text-slate-900">{JSON.parse(prescription.medications || '[]').length} medications</span>.
                    </p>
                    
                    <button 
                        onClick={() => {
                            const user = JSON.parse(localStorage.getItem('medisync_user'));
                            generatePrescriptionPDF({
                                doctor: { name: prescription.doctorName },
                                patient: { name: user?.name, id: user?.id },
                                diagnosis: prescription.diagnosis,
                                medications: JSON.parse(prescription.medications || '[]'),
                                notes: prescription.notes,
                                followUpDate: prescription.followUpDate,
                                date: new Date().toLocaleDateString()
                            });
                        }}
                        className="w-full py-4 bg-mediteal text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-mediteal/90 transition-all shadow-lg shadow-mediteal/20"
                    >
                        <Download size={20} />
                        Download PDF
                    </button>
                </div>
            )}
        </div>
    );
};

export default PatientMeetingRoom;
