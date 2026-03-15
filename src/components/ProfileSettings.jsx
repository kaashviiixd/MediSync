import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../lib/api';
import {
    User, Edit3, Check, X, Plus, Calendar, Users,
    ChevronRight, LogOut, Palette, BadgeCheck, RefreshCw
} from 'lucide-react';

const AVATAR_COLORS = ['#0EA5E9','#F43F5E','#10B981','#F59E0B','#8B5CF6','#64748B'];

const calculateAge = (dob) => {
    if (!dob) return '—';
    const diffMs = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
};

const ProfileSettings = ({ user, onProfileSwitch }) => {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeProfile, setActiveProfile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editProfile, setEditProfile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '', dob: '', gender: '', relation: 'Self', color: AVATAR_COLORS[0]
    });

    useEffect(() => {
        const stored = localStorage.getItem('activeProfile');
        if (stored) setActiveProfile(JSON.parse(stored));
        fetchProfiles();
    }, [user]);

    const fetchProfiles = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const res = await profileApi.getProfiles(user.id);
            setProfiles(res.data || []);
        } catch (e) {
            console.error('ProfileSettings: failed to fetch profiles', e);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setEditProfile(null);
        setFormData({ name: '', dob: '', gender: '', relation: 'Spouse', color: AVATAR_COLORS[0] });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditProfile(p);
        setFormData({ name: p.name, dob: p.dob || '', gender: p.gender || '', relation: p.relation, color: p.color || AVATAR_COLORS[0] });
        setShowModal(true);
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.dob || !formData.gender) {
            alert('Please fill out all required fields.');
            return;
        }
        try {
            setSaving(true);
            const res = await profileApi.syncProfile({ userId: user.id, ...formData });
            const saved = res.data.profile;
            setProfiles(prev =>
                editProfile ? prev.map(p => p.id === editProfile.id ? saved : p) : [...prev, saved]
            );
            setShowModal(false);
        } catch (err) {
            alert('Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    const switchProfile = (profile) => {
        localStorage.setItem('activeProfile', JSON.stringify(profile));
        setActiveProfile(profile);
        if (onProfileSwitch) onProfileSwitch(profile);
    };

    const mainUser = user || {};
    const currentProfile = activeProfile || profiles.find(p => p.relation === 'Self') || null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Header */}
            <section>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Profile Settings</h2>
                <p className="text-slate-500 font-medium mt-1">Manage your account details and switch between family profiles.</p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Account Card */}
                <div className="space-y-6">
                    {/* Account Info */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
                        <div
                            className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black mb-4 shadow-lg"
                            style={{ backgroundColor: currentProfile?.color || '#0D9488' }}
                        >
                            {(currentProfile?.name || mainUser.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">{currentProfile?.name || mainUser.name}</h3>
                        <span className="mt-2 px-3 py-1 bg-mediteal/10 text-mediteal text-xs font-black uppercase tracking-widest rounded-full">
                            {currentProfile?.relation || 'Primary'}
                        </span>

                        <div className="w-full mt-6 space-y-3 text-left">
                            {[
                                { label: 'Email', value: mainUser.email || '—' },
                                { label: 'Date of Birth', value: currentProfile?.dob ? new Date(currentProfile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                { label: 'Age', value: currentProfile?.dob ? `${calculateAge(currentProfile.dob)} years` : '—' },
                                { label: 'Gender', value: currentProfile?.gender || '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-50">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
                                    <span className="text-sm font-bold text-slate-700">{value}</span>
                                </div>
                            ))}
                        </div>

                        {currentProfile && (
                            <button
                                onClick={() => openEdit(currentProfile)}
                                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-mediteal hover:text-white hover:border-mediteal transition-all"
                            >
                                <Edit3 className="w-4 h-4" /> Edit Current Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: All Profiles / Switch */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900">Family Profiles</h4>
                                <p className="text-sm text-slate-400 font-medium">Click a profile to switch to it</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={fetchProfiles}
                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-mediteal hover:bg-mediteal/10 transition-all"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                {profiles.length < 6 && (
                                    <button
                                        onClick={openAdd}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-mediteal text-white rounded-2xl font-bold text-sm hover:bg-mediteal-dark shadow-lg shadow-mediteal/20 transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Add Member
                                    </button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[1,2,3].map(i => (
                                    <div key={i} className="animate-pulse bg-slate-50 rounded-3xl p-6 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-200" />
                                        <div className="h-4 w-24 bg-slate-200 rounded-full" />
                                        <div className="h-3 w-16 bg-slate-100 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : profiles.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 font-medium">
                                No profiles found. Add a profile to get started.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {profiles.map(profile => {
                                    const isActive = activeProfile?.id === profile.id;
                                    return (
                                        <div
                                            key={profile.id}
                                            onClick={() => switchProfile(profile)}
                                            className={`relative group cursor-pointer rounded-3xl p-6 flex flex-col items-center gap-3 transition-all border-2
                                                ${isActive
                                                    ? 'border-mediteal bg-mediteal/5 shadow-lg shadow-mediteal/10'
                                                    : 'border-slate-100 bg-slate-50 hover:border-mediteal/30 hover:bg-white hover:shadow-md'
                                                }`}
                                        >
                                            {isActive && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-mediteal rounded-full flex items-center justify-center">
                                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                            <div
                                                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md transition-transform group-hover:scale-105"
                                                style={{ backgroundColor: profile.color || '#0D9488' }}
                                            >
                                                {profile.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-slate-900 truncate max-w-[120px]">{profile.name}</p>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{profile.relation}</p>
                                                {profile.dob && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{calculateAge(profile.dob)} yrs • {profile.gender || '—'}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); openEdit(profile); }}
                                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[11px] font-bold hover:text-mediteal hover:border-mediteal transition-all"
                                            >
                                                <Edit3 className="w-3 h-3" /> Edit
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Add new card */}
                                {profiles.length < 6 && (
                                    <div
                                        onClick={openAdd}
                                        className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-mediteal/40 rounded-3xl p-6 flex flex-col items-center gap-3 transition-all hover:bg-mediteal/[0.02] group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-slate-100 group-hover:bg-mediteal/10 flex items-center justify-center transition-all">
                                            <Plus className="w-7 h-7 text-slate-300 group-hover:text-mediteal transition-colors" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 group-hover:text-mediteal transition-colors">Add Member</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                        <h4 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h4>
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate('/profile-selection')}
                                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-50 hover:bg-mediteal/5 hover:border-mediteal/20 border border-transparent transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">Switch Profile (Full Screen)</p>
                                        <p className="text-xs text-slate-400 font-medium">Go to the profile selection screen</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-mediteal transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-2xl font-black text-slate-900 mb-6">{editProfile ? 'Edit Profile' : 'Add New Member'}</h3>

                        <form onSubmit={saveProfile} className="space-y-5">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                                <input type="text" required placeholder="e.g. Ishita Agarwal"
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-mediteal/30 focus:border-mediteal outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Date of Birth</label>
                                <input type="date" required
                                    value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-mediteal/30 focus:border-mediteal outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Gender</label>
                                <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-mediteal/30 focus:border-mediteal outline-none transition-all"
                                >
                                    <option value="" disabled>Select gender</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Relation</label>
                                <input type="text" required placeholder="e.g. Self, Spouse, Parent"
                                    value={formData.relation} onChange={e => setFormData({...formData, relation: e.target.value})}
                                    disabled={editProfile?.relation === 'Self'}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-mediteal/30 focus:border-mediteal outline-none transition-all disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Avatar Color</label>
                                <div className="flex gap-3">
                                    {AVATAR_COLORS.map(c => (
                                        <button key={c} type="button" onClick={() => setFormData({...formData, color: c})}
                                            className="w-9 h-9 rounded-full transition-all"
                                            style={{ backgroundColor: c, outline: formData.color === c ? `3px solid ${c}` : 'none', outlineOffset: '3px', transform: formData.color === c ? 'scale(1.15)' : 'scale(1)' }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-3.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-3.5 bg-mediteal text-white rounded-2xl font-bold hover:bg-mediteal-dark shadow-lg shadow-mediteal/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editProfile ? 'Save Changes' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSettings;
