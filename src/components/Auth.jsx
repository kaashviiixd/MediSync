import { useState } from 'react';
import { authApi } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';
import { ArrowLeft, RefreshCw, User, ShieldCheck, AlertCircle, Mail, Lock, EyeOff, Eye, Loader2, Send } from 'lucide-react';


const Auth = ({ mode, onBack, onSuccess }) => {
    const [view, setView] = useState('login') // 'login', 'signup', 'forgot'
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    })

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    const handleGoogleAuth = async () => {
        setLoading(true);
        setErrors({});

        try {
            const result = await signInWithGoogle();
            if (result.success) {
                // Sync with backend to ensure user exists in Prisma DB
                const response = await authApi.googleAuth({
                    uid: result.user.uid,
                    name: result.user.displayName,
                    email: result.user.email,
                    profileImage: result.user.photoURL
                });

                if (response.data.success) {
                    const userData = response.data.user;
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('medisync_user', JSON.stringify(userData));
                    onSuccess && onSuccess(userData);
                } else {
                    setErrors({ auth: "Failed to sync account with backend." });
                }
            } else {
                setErrors({ auth: result.message || "Google authentication failed at Firebase." });
            }
        } catch (err) {
            console.error("Google Auth Sync Error:", err);
            const msg = err.response?.data?.message || err.message || "Authentication failed. Is the server running?";
            setErrors({ auth: msg });
        }
        setLoading(false);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrors({});

        if (view === 'forgot') {
            if (!validateEmail(formData.email)) {
                setErrors({ email: 'Valid email required' })
                return
            }
            alert("Password reset functionality would be handled by the backend. (Not implemented in demo)");
            return
        }

        let newErrors = {};
        if (view === 'signup' && !validateEmail(formData.email)) newErrors.email = 'Please enter a valid email address.';
        if (view === 'login' && formData.email.trim() === '') newErrors.email = 'Enter email or username';
        
        // Help redirect doctors who use the patient portal by mistake
        if (view === 'login' && formData.email.includes('.') && !formData.email.includes('@')) {
            // It looks like dr.name format
            setErrors({ auth: "This looks like a Doctor's username. Please return to the main dashboard and click 'Doctor Mode' to access the Professional Portal." });
            return;
        }

        if (view === 'signup' && formData.password.length < 6) newErrors.password = 'Min. 6 characters required.';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true)

        try {
            if (view === 'signup') {
                const response = await authApi.register({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: mode,
                    phone: formData.phone
                });

                if (response.data.success) {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('medisync_user', JSON.stringify(response.data.user));
                    alert("Account created successfully!");
                    onSuccess && onSuccess(response.data.user);
                }
            } else if (view === 'login') {
                const response = await authApi.login({
                    email: formData.email,
                    password: formData.password
                });

                if (response.data.success) {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('medisync_user', JSON.stringify(response.data.user));
                    alert(`Welcome back, ${response.data.user.name}!`);
                    onSuccess && onSuccess(response.data.user);
                }
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Authentication failed. Is the server running?";
            setErrors({ auth: msg });
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
        if (errors[name]) {
            setErrors({ ...errors, [name]: null })
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-mediteal/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-mediblue/5 rounded-full blur-[120px]"></div>
            </div>

            <button
                onClick={onBack}
                className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-mediblue transition-colors group px-4 py-2 rounded-xl hover:bg-white hover:shadow-sm"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Portals</span>
            </button>

            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[3.5rem] p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-100">
                    <div className="text-center mb-10">
                        <div className={`inline-flex p-4 rounded-2xl mb-6 bg-gradient-to-br ${mode === 'patient' ? 'from-mediteal to-mediteal-dark' : 'from-mediblue to-mediblue-dark'} text-white shadow-lg`}>
                            {view === 'forgot' ? <RefreshCw className="w-8 h-8" /> : (mode === 'patient' ? <User className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />)}
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">
                            {view === 'login' && 'Welcome Back'}
                            {view === 'signup' && 'Create Account'}
                            {view === 'forgot' && 'Reset Password'}
                        </h1>
                        <p className="text-slate-500 font-medium px-4">
                            {view === 'login' && `Access your ${mode} portal via Google or Email`}
                            {view === 'signup' && `Join MediSync as a ${mode} today`}
                            {view === 'forgot' && 'Enter your email to receive a reset link'}
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        {errors.auth && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-semibold text-red-600">{errors.auth}</p>
                            </div>
                        )}

                        <button
                            onClick={handleGoogleAuth}
                            disabled={loading}
                            className="w-full py-4 px-6 bg-white border-2 border-slate-100 rounded-[1.5rem] font-bold text-slate-700 flex items-center justify-center gap-4 hover:bg-slate-50 hover:border-mediteal/20 transition-all transform active:scale-[0.98] disabled:opacity-70 group shadow-sm hover:shadow-md"
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Continue with Google</span>
                        </button>

                        <div className="relative flex items-center gap-4 py-2">
                            <div className="flex-1 h-px bg-slate-100"></div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-2 italic">OR SECURE MAIL</span>
                            <div className="flex-1 h-px bg-slate-100"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {view === 'signup' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mediteal transition-colors" />
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="Enter full name"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-mediteal/20 transition-all outline-none text-slate-800 placeholder:text-slate-400 font-bold"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}

                        {(view === 'login' || view === 'signup' || view === 'forgot') && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mediteal transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        placeholder="name@example.com"
                                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 transition-all outline-none text-slate-800 placeholder:text-slate-400 font-bold ${errors.email ? 'ring-2 ring-red-400' : 'focus:ring-mediteal/20'}`}
                                        onChange={handleChange}
                                    />
                                </div>
                                {errors.email && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 ml-1 mt-1 uppercase"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
                            </div>
                        )}

                        {(view === 'login' || view === 'signup') && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-1 mb-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                                    {view === 'login' && <button onClick={() => setView('forgot')} type="button" className="text-[10px] font-black text-mediblue hover:text-mediteal transition-colors uppercase tracking-wider">Forgot?</button>}
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mediteal transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        value={formData.password}
                                        placeholder="••••••••"
                                        className={`w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 transition-all outline-none text-slate-800 placeholder:text-slate-400 font-bold ${errors.password ? 'ring-2 ring-red-400' : 'focus:ring-mediteal/20'}`}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 ml-1 mt-1 uppercase"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 mt-8 rounded-[1.5rem] bg-slate-900 text-white font-black text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all hover:bg-mediblue hover:shadow-mediblue/20 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.95]`}
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    {view === 'login' && 'Sign In'}
                                    {view === 'signup' && 'Create Account'}
                                    {view === 'forgot' && <><Send className="w-5 h-5" /> Send Reset Link</>}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center bg-slate-50 p-6 rounded-[2rem]">
                        <p className="text-slate-500 font-semibold text-sm">
                            {view === 'login' ? "New to MediSync?" : "Known user?"}{' '}
                            <button
                                onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setErrors({}); }}
                                className="text-mediblue font-black hover:underline ml-1"
                            >
                                {view === 'login' ? 'Register Now' : 'Sign In'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <footer className="mt-12 text-slate-400 text-xs font-black uppercase tracking-[0.3em]">
                MediSync • Powered by Google Cloud
            </footer>
        </div>
    )
}

export default Auth
