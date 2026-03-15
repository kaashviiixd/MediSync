import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, ShieldAlert, HeartPulse, ChevronRight, Lock } from 'lucide-react'

const Dashboard = () => {
  const [hoveredMode, setHoveredMode] = useState(null);
  const navigate = useNavigate();

  const modes = [
    {
      id: 'patient',
      title: 'Patient Mode',
      description: 'Access your records, book appointments, and connect with doctors.',
      icon: <HeartPulse className="w-12 h-12" />,
      color: 'from-mediteal to-mediteal-dark',
      active: true
    },
    {
      id: 'doctor',
      title: 'Doctor Mode',
      description: 'Manage your patients, view schedules, and provide consultations.',
      icon: <Stethoscope className="w-12 h-12" />,
      color: 'from-mediblue to-mediblue-dark',
      active: true
    },
    {
      id: 'admin',
      title: 'Admin Mode',
      description: 'Platform management and oversight. Coming soon to MediSync.',
      icon: <ShieldAlert className="w-12 h-12" />,
      color: 'from-gray-400 to-gray-500',
      active: false
    }
  ];

  const handleNavigation = (modeId) => {
    if (modeId === 'patient') {
      navigate('/auth/patient');
    } else if (modeId === 'doctor') {
      navigate('/doctor/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-mediteal/5 rounded-full blur-3xl opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-mediblue/5 rounded-full blur-3xl opacity-60"></div>
      </div>

      <header className="mb-16 text-center animate-in fade-in slide-in-from-top duration-700">
        <div className="flex items-center justify-center mb-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-mediblue to-mediteal rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white p-4 rounded-full shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-medical-gradient rounded-xl flex items-center justify-center text-white">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight">
                  <span className="text-mediblue">Medi</span>
                  <span className="text-mediteal">Sync</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Choose Your Portal
        </h1>
        <p className="text-slate-500 max-w-md mx-auto text-lg">
          Welcome back. Please select the mode you would like to use to continue to the platform.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {modes.map((mode, index) => (
          <div
            key={mode.id}
            onClick={() => mode.active && handleNavigation(mode.id)}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative group cursor-pointer transition-all duration-500 transform
              ${hoveredMode === mode.id ? 'scale-105 -translate-y-2' : ''}
              ${!mode.active ? 'opacity-70 cursor-not-allowed grayscale-[0.5]' : ''}
            `}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`
              h-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100
              flex flex-col items-center text-center relative overflow-hidden
              ${hoveredMode === mode.id ? 'border-mediteal/20 ring-4 ring-mediteal/5' : ''}
              ${!mode.active ? 'bg-slate-50' : ''}
            `}>
              <div className={`
                absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 transition-transform duration-700
                bg-gradient-to-br ${mode.color}
                ${hoveredMode === mode.id ? 'scale-[3]' : 'scale-100'}
              `}></div>

              <div className={`
                w-24 h-24 rounded-2xl mb-8 flex items-center justify-center transition-all duration-500
                bg-gradient-to-br ${mode.color} text-white shadow-lg
                ${hoveredMode === mode.id ? 'shadow-xl rotate-3' : ''}
              `}>
                {mode.icon}
              </div>

              {!mode.active && (
                <div className="absolute top-6 right-6">
                  <span className="flex items-center gap-1 bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Lock className="w-3 h-3" /> Upcoming
                  </span>
                </div>
              )}

              <h2 className="text-2xl font-bold text-slate-800 mb-4">{mode.title}</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                {mode.description}
              </p>

              <div className="mt-auto pt-4 w-full">
                <button
                  disabled={!mode.active}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode.active) handleNavigation(mode.id);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all duration-300
                    ${mode.active
                      ? 'bg-slate-900 text-white hover:bg-mediblue hover:shadow-lg hover:shadow-mediblue/20'
                      : 'bg-slate-200 text-slate-400'
                    }
                  `}
                >
                  {mode.active ? 'Enter Portal' : 'Restricted'}
                  {mode.active && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-slate-400 text-sm flex items-center gap-2">
        <span>© 2026 MediSync</span>
        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
        <span>Secured Healthcare Platform</span>
      </footer>
    </div>
  )
}

export default Dashboard
