import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, X, Phone, User } from 'lucide-react';
import { socket } from '../lib/socket';

const PatientMeetingInvite = () => {
    const [invite, setInvite] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        socket.on('meeting_invite', (data) => {
            setInvite(data);
            // Optional: Play a sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed', e));
        });

        return () => {
            socket.off('meeting_invite');
        };
    }, []);

    if (!invite) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-mediteal/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-mediblue/10 rounded-full blur-3xl"></div>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="relative mb-8">
                        <div className="w-24 h-24 bg-mediteal/20 rounded-full flex items-center justify-center animate-pulse">
                            <div className="w-20 h-20 bg-mediteal rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-mediteal/30">
                                <Video size={40} />
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 mb-2">Doctor is Ready!</h2>
                    <p className="text-slate-500 font-medium mb-8">
                        Dr. <span className="text-slate-900 font-bold">{invite.doctorName}</span> is waiting for your video consultation.
                    </p>

                    <div className="w-full flex flex-col gap-4">
                        <button 
                            onClick={() => {
                                navigate(`/meeting/${invite.roomId}`, { state: { meetingData: invite } });
                                setInvite(null);
                            }}
                            className="w-full py-5 bg-mediteal text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-mediteal/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <Phone size={24} className="fill-white" />
                            Join Now
                        </button>
                        <button 
                            onClick={() => setInvite(null)}
                            className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all"
                        >
                            Not Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientMeetingInvite;
