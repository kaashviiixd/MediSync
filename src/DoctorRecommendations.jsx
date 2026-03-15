import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Search, Filter, ArrowRight } from 'lucide-react';
import { doctorApi } from './lib/api';

export default function DoctorRecommendations() {
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const [allDoctors, setAllDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [forceShowAll, setForceShowAll] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      // Get chat messages from DB if possible, or use the last summary from localStorage
      const pendingSummary = localStorage.getItem('pending_medical_summary');
      const savedUser = localStorage.getItem('medisync_user');
      const user = savedUser ? JSON.parse(savedUser) : null;

      try {
        // Fetch Recommendations
        const recPromise = fetch('http://localhost:5000/api/recommend-doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            patientData: { 
              history: pendingSummary || "Looking for general physician",
              patientId: user?.id 
            } 
          })
        });

        // Fetch All Doctors
        const allPromise = doctorApi.getDoctors();

        const [recRes, allRes] = await Promise.all([recPromise, allPromise]);

        if (recRes.ok) {
          const data = await recRes.json();
          setRecommendations(data);
          // Fallback: If recommended list is empty, show all doctors by default or show general physicians
          if (!data.recommended_doctors || data.recommended_doctors.length === 0) {
            console.log("MediSync: Recommended list is empty. Falling back to all doctors.");
            // We'll set a flag to show all doctors if empty
          }
        }
        if (allRes.data) setAllDoctors(allRes.data);

      } catch (error) {
        console.error("Error fetching docs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:30 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "07:45 PM"];

  // Helper to get next 7 days
  const getNextDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        full: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        num: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' })
      });
    }
    return days;
  };
  const dates = getNextDays();

  // Pools: AI Recommended (default) vs All Doctors (when specifically searching by name/specialty or skipped/forced)
  const isSearchingAll = forceShowAll || (searchQuery.trim().length > 0) || navState?.skipFilter;
  const rawBaseDoctors = isSearchingAll ? allDoctors : (recommendations?.recommended_doctors || []);

  // Map backend structure to what the component expects
  const baseDoctors = rawBaseDoctors.map(doc => ({
    ...doc,
    profile_image: doc.profile_photo || doc.profile_image, // Handle both field names
    specialization: doc.doctorProfile?.specialization || doc.specialization || 'General Physician',
    degree: doc.doctorProfile?.degree || doc.degree || 'MD', // Assuming degree might be in profile
    fees: doc.doctorProfile?.consultation_fee || doc.fees,
    available_slots: typeof doc.doctorProfile?.available_time_slots === 'string' 
      ? JSON.parse(doc.doctorProfile.available_time_slots) 
      : (doc.doctorProfile?.available_time_slots || doc.available_slots || [])
  }));

  const filteredDoctors = baseDoctors.filter(doc => {
    const matchesSearch = !searchQuery.trim() ||
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSlot = !selectedSlot || (Array.isArray(doc.available_slots) && doc.available_slots.includes(selectedSlot));
    return matchesSearch && matchesSlot;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-mediteal border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-slate-800 animate-pulse">Analyzing your profiles...</h2>
        <p className="text-slate-500 mt-2">Connecting you with specialized experts</p>
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
            <h1 className="text-xl font-bold text-slate-800">Specialists Found</h1>
            <p className="text-sm text-mediteal font-medium">Top Matches for you</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-mediteal/10 rounded-full text-mediteal-dark text-sm font-bold">
          <ShieldCheck className="w-4 h-4" />
          Verified Doctors
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {isSearchingAll
                  ? 'All Specialists'
                  : `Top Matches: ${recommendations?.recommended_specialization || 'Calculating...'}`}
              </h2>
              <p className="text-slate-600 text-lg">
                {isSearchingAll || selectedSlot
                  ? `Showing results for "${searchQuery || selectedSlot}"`
                  : (recommendations?.reason || 'Based on your symptoms and medical history analysis.')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative group flex-1 sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mediteal transition-colors" />
                <input
                  type="text"
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-mediteal/20 focus:border-mediteal transition-all text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Date Selector Row */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Select Consultation Date</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {dates.map((d) => (
                <button
                  key={d.full}
                  onClick={() => setSelectedDate(d.full)}
                  className={`flex flex-col items-center min-w-[70px] p-4 rounded-3xl transition-all border-2
                    ${selectedDate === d.full 
                      ? 'bg-mediteal border-mediteal text-white shadow-lg shadow-mediteal/20 scale-105' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-mediteal/30'}
                  `}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${selectedDate === d.full ? 'text-white/70' : 'text-slate-400'}`}>
                    {d.day}
                  </span>
                  <span className="text-xl font-black leading-none">{d.num}</span>
                  <span className={`text-[10px] font-bold mt-1 ${selectedDate === d.full ? 'text-white/70' : 'text-slate-400'}`}>
                    {d.month}
                  </span>
                </button>
              ))}
            </div>
          </div>


          {/* Recommendation Status / Escape hatch */}
          {!isSearchingAll && recommendations?.recommended_doctors?.length === 0 && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="text-center sm:text-left">
                <p className="text-amber-800 font-bold italic">No exact matches for your specific symptoms, but we have experts who can help!</p>
                <p className="text-amber-700 text-sm">Try searching by name or clicking "View All Doctors" below.</p>
              </div>
              <button 
                onClick={() => setForceShowAll(true)}
                className="px-6 py-3 bg-amber-200 text-amber-900 font-bold rounded-xl hover:bg-amber-300 transition-all shrink-0"
              >
                View All Doctors
              </button>
            </div>
          )}

          {/* Filter Row */}
          <div className="mb-10 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold whitespace-nowrap">
                <Filter className="w-4 h-4" />
                Filter by Slot:
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSlot(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border
                    ${!selectedSlot ? 'bg-mediteal text-white border-mediteal shadow-lg shadow-mediteal/20' : 'bg-white text-slate-600 border-slate-200 hover:border-mediteal/50'}
                  `}
                >
                  All Slots
                </button>
                {timeSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border
                      ${selectedSlot === slot ? 'bg-mediteal text-white border-mediteal shadow-lg shadow-mediteal/20' : 'bg-white text-slate-600 border-slate-200 hover:border-mediteal/50'}
                    `}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDoctors.map((doc, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/doctor-detail', { state: { doctor: doc, selectedDate } })}
                  className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-mediteal/10 transition-all duration-300 cursor-pointer group hover:translate-y-[-8px] relative overflow-hidden active:scale-95 animate-in fade-in slide-in-from-bottom-4"

                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-mediteal/5 rounded-bl-[4rem] group-hover:bg-mediteal/10 transition-colors"></div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 mb-6 ring-4 ring-slate-50 group-hover:ring-mediteal/20 transition-all shadow-inner">
                      <img src={doc.profile_image} alt={doc.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-bold text-xl text-slate-900 mb-1 group-hover:text-mediteal transition-colors">{doc.name}</h3>
                    <p className="text-mediteal font-bold text-sm uppercase tracking-wider mb-1">{doc.specialization}</p>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider mb-3">{doc.degree}</p>

                    {/* Slots Preview */}
                    <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                        {(doc.available_slots || []).filter(slot => {
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
                                } catch (e) { return true; }
                            }
                            return true;
                        }).slice(0, 3).map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-lg border border-slate-100">
                                {s}
                            </span>
                        ))}
                        {(doc.available_slots || []).length > 3 && (
                            <span className="px-2 py-1 bg-mediteal/5 text-[10px] font-bold text-mediteal rounded-lg">
                                +{(doc.available_slots || []).length - 3} more
                            </span>
                        )}
                    </div>

                    <div className="w-full pt-6 border-t border-slate-50 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-mediteal group-hover:text-white transition-all duration-300 shadow-sm">
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">No doctors found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">We couldn't find any specialists matching your criteria. Don't worry, you can browse our full directory of professionals.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => { setSearchQuery(''); setSelectedSlot(null); setForceShowAll(false); }}
                  className="px-8 py-4 bg-mediteal text-white font-black rounded-2xl shadow-lg shadow-mediteal/20 hover:bg-mediblue transition-all"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedSlot(null); setForceShowAll(true); }}
                  className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Show All Staff
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
