import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ShieldCheck, Loader2, ArrowRight, ArrowLeft, Stethoscope } from 'lucide-react';
import { doctorApi } from './lib/api';

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await doctorApi.login(formData);

      if (response.data.success) {
        localStorage.setItem('medisync_doctor_user', JSON.stringify(response.data.doctor));
        localStorage.setItem('token', response.data.token);
        navigate('/doctor/dashboard');
      } else {
        setError(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Connection error. Is the backend running?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Visual Side */}
      <div className="hidden md:flex md:w-1/2 bg-mediteal relative p-16 flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-mediteal to-mediblue opacity-90"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center">
            <Stethoscope className="w-7 h-7" />
          </div>
          <span className="text-3xl font-black tracking-tighter">MediSync<span className="text-white/70">PRO</span></span>
        </div>

        <div className="relative z-10">
          <h1 className="text-6xl font-black text-white leading-none mb-6">Welcome back, Specialist.</h1>
          <p className="text-white/70 text-xl max-w-md leading-relaxed">
            Access your professional dashboard to manage patient appointments, availability, and practice insights.
          </p>
        </div>

        <div className="relative z-10 flex gap-6">
          <div className="flex -space-x-3">
             {[1,2,3].map(i => (
               <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} className="w-12 h-12 rounded-full ring-4 ring-white/10" alt="Specialist" />
             ))}
          </div>
          <div className="text-white/60 text-sm font-medium">
             Trusted by over <span className="text-white font-bold">5,000+</span><br/>medical experts worldwide.
          </div>
        </div>
      </div>

      {/* Login Side */}
      <div className="flex-1 flex flex-col justify-center p-8 sm:p-20 bg-white relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-10 left-10 p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-mediteal transition-all group"
        >
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
        </button>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-10">
            <h2 className="text-4xl font-black text-slate-900 mb-2">Doctor Login</h2>
            <p className="text-slate-500 font-medium">Enter your credentials to access your portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Username</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-mediteal transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="dr.rajesh.sharma"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-mediteal/30 focus:bg-white rounded-[1.5rem] outline-none transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Password</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-mediteal transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-mediteal/30 focus:bg-white rounded-[1.5rem] outline-none transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold flex items-center gap-3 border border-rose-100 animate-in shake-in duration-300">
                <ShieldCheck className="w-5 h-5" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-70 group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-slate-400 text-sm font-medium">
            New to MediSync? <span className="text-mediteal font-bold cursor-pointer hover:underline">Request Practice Access</span>
          </p>
        </div>
      </div>
    </div>
  );
}
