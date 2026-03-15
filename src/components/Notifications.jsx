import React, { useState } from 'react';
import {
    Bell, Pill, Calendar, Clock, CheckCircle2, AlertCircle,
    ChevronRight, X, Stethoscope, RefreshCw, Check, Filter
} from 'lucide-react';

const CATEGORIES = ['All', 'Prescriptions', 'Appointments', 'Reminders'];

const Notifications = ({ appointments = [], userName = 'Patient' }) => {
    const [activeFilter, setActiveFilter] = useState('All');
    const [dismissed, setDismissed] = useState([]);
    const [read, setRead] = useState([]);

    // Build notifications from real appointment data + static prescription/reminder entries
    const upcomingAppts = appointments.filter(
        (apt) => apt.status === 'Approved' || apt.status === 'Rescheduled' || apt.status === 'Scheduled'
    );

    const dynamicNotifications = [
        // Appointment booked confirmations
        ...upcomingAppts.map((apt) => ({
            id: `appt-booked-${apt.id}`,
            category: 'Appointments',
            type: 'success',
            icon: Calendar,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-500',
            title: 'Appointment Confirmed',
            body: `Your appointment with ${apt.doctorName} is scheduled for ${apt.slot}.`,
            time: 'Just now',
            badge: apt.status === 'Rescheduled' ? 'Rescheduled' : 'Confirmed',
            badgeColor: apt.status === 'Rescheduled' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
        })),
        // Appointment reminders (for each upcoming appt)
        ...upcomingAppts.map((apt) => ({
            id: `appt-remind-${apt.id}`,
            category: 'Reminders',
            type: 'reminder',
            icon: Clock,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-500',
            title: 'Upcoming Appointment Reminder',
            body: `Don't forget your appointment with ${apt.doctorName} at ${apt.slot}. Please arrive 10 minutes early.`,
            time: '1 day before',
            badge: 'Reminder',
            badgeColor: 'bg-blue-100 text-blue-700',
        })),
        // Static prescription notifications from doctor
        {
            id: 'rx-1',
            category: 'Prescriptions',
            type: 'info',
            icon: Stethoscope,
            iconBg: 'bg-mediteal/10',
            iconColor: 'text-mediteal',
            title: 'New Prescription from Doctor',
            body: 'Dr. Sharma has sent you a new prescription: Metformin 500mg (twice daily) & Lisinopril 10mg (once daily). Please collect from the pharmacy.',
            time: '2 hours ago',
            badge: 'New Rx',
            badgeColor: 'bg-mediteal/10 text-mediteal',
        },
        {
            id: 'rx-2',
            category: 'Prescriptions',
            type: 'info',
            icon: Stethoscope,
            iconBg: 'bg-mediteal/10',
            iconColor: 'text-mediteal',
            title: 'Prescription Updated',
            body: 'Your prescription for Atorvastatin 20mg has been updated by Dr. Kapoor. Dosage changed to once at night.',
            time: '3 days ago',
            badge: 'Updated',
            badgeColor: 'bg-indigo-100 text-indigo-700',
        },
        // Prescription refill reminders
        {
            id: 'rx-remind-1',
            category: 'Reminders',
            type: 'warning',
            icon: Pill,
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-500',
            title: 'Prescription Refill Reminder',
            body: 'Lisinopril 10mg — only 5 days of supply remaining. Contact your doctor or pharmacy to refill before running out.',
            time: 'Today',
            badge: 'Low Supply',
            badgeColor: 'bg-orange-100 text-orange-700',
        },
        {
            id: 'rx-remind-2',
            category: 'Reminders',
            type: 'reminder',
            icon: Pill,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-500',
            title: 'Medicine Reminder — Morning Dose',
            body: 'Time to take your Metformin 500mg with breakfast. Consistent timing helps maintain blood sugar levels.',
            time: '8:00 AM',
            badge: 'Daily',
            badgeColor: 'bg-purple-100 text-purple-700',
        },
    ];

    const visibleNotifications = dynamicNotifications.filter(
        (n) => !dismissed.includes(n.id) && (activeFilter === 'All' || n.category === activeFilter)
    );

    const unreadCount = visibleNotifications.filter((n) => !read.includes(n.id)).length;

    const markAllRead = () => setRead(visibleNotifications.map((n) => n.id));
    const dismissNotif = (id) => setDismissed((prev) => [...prev, id]);
    const markRead = (id) => setRead((prev) => (prev.includes(id) ? prev : [...prev, id]));

    const typeIcon = (type) => {
        if (type === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
        if (type === 'warning') return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
        return <Bell className="w-3.5 h-3.5 text-blue-500" />;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Header */}
            <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Notifications</h2>
                    <p className="text-slate-500 font-medium mt-1">
                        {unreadCount > 0 ? (
                            <span>You have <span className="text-mediteal font-bold">{unreadCount} unread</span> notification{unreadCount !== 1 ? 's' : ''}.</span>
                        ) : (
                            'All caught up! No unread notifications.'
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                    >
                        <Check className="w-4 h-4" /> Mark all read
                    </button>
                    <button
                        onClick={() => setDismissed([])}
                        className="flex items-center gap-2 px-5 py-2.5 bg-mediteal/10 text-mediteal rounded-2xl font-bold text-sm hover:bg-mediteal hover:text-white transition-all"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </section>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400 mr-1" />
                {CATEGORIES.map((cat) => {
                    const count = cat === 'All'
                        ? dynamicNotifications.filter((n) => !dismissed.includes(n.id)).length
                        : dynamicNotifications.filter((n) => !dismissed.includes(n.id) && n.category === cat).length;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveFilter(cat)}
                            className={`px-5 py-2 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                                activeFilter === cat
                                    ? 'bg-mediteal text-white shadow-lg shadow-mediteal/20'
                                    : 'bg-white border border-slate-200 text-slate-500 hover:border-mediteal/30 hover:text-mediteal'
                            }`}
                        >
                            {cat}
                            {count > 0 && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === cat ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Notification Cards */}
            {visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-300 mb-5">
                        <Bell size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-700">No Notifications</h3>
                    <p className="text-slate-400 font-medium mt-1 max-w-xs">All clear! You're up to date in this category.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleNotifications.map((notif) => {
                        const isRead = read.includes(notif.id);
                        const Icon = notif.icon;
                        return (
                            <div
                                key={notif.id}
                                onClick={() => markRead(notif.id)}
                                className={`group relative bg-white rounded-[2rem] border transition-all duration-300 cursor-pointer hover:shadow-md
                                    ${isRead
                                        ? 'border-slate-100 opacity-80'
                                        : 'border-slate-200 shadow-sm ring-1 ring-mediteal/5'
                                    }`}
                            >
                                {/* Unread indicator */}
                                {!isRead && (
                                    <div className="absolute top-6 left-6 w-2 h-2 bg-mediteal rounded-full shadow-glow" />
                                )}

                                <div className="flex items-start gap-5 p-6 pl-10">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 ${notif.iconBg} ${notif.iconColor} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-900 text-[15px]">{notif.title}</h4>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${notif.badgeColor}`}>
                                                    {typeIcon(notif.type)}
                                                    {notif.badge}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[11px] font-semibold text-slate-400">{notif.time}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); dismissNotif(notif.id); }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Dismiss"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{notif.body}</p>

                                        {/* Category chip */}
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{notif.category}</span>
                                            {!isRead && (
                                                <span className="text-[10px] text-mediteal font-bold flex items-center gap-1">
                                                    <ChevronRight className="w-3 h-3" /> Tap to mark as read
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary strip */}
            {visibleNotifications.length > 0 && (
                <div className="bg-slate-50 rounded-3xl px-8 py-5 flex items-center justify-between text-slate-400 font-bold text-sm border border-slate-100">
                    <span>{visibleNotifications.length} notification{visibleNotifications.length !== 1 ? 's' : ''} shown</span>
                    <button
                        onClick={() => setDismissed((prev) => [...prev, ...visibleNotifications.map((n) => n.id)])}
                        className="text-red-400 hover:text-red-600 transition-colors text-xs font-black uppercase tracking-wider"
                    >
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
};

export default Notifications;
