import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, RefreshCw, Send, AlertCircle } from "lucide-react";
import { sendResetEmail } from "../lib/firebase";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        if (!email.toLowerCase().endsWith("@gmail.com")) {
            setError("Only @gmail.com addresses are permitted for this secure portal.");
            return;
        }

        setLoading(true);
        try {
            const response = await sendResetEmail(email);
            if (response.success) {
                setSuccess(true);
                setEmail("");
            } else {
                setError(response.error === "EMAIL_NOT_FOUND" ? "This email is not registered with us." : response.error);
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-50 rounded-full blur-[120px]"></div>
            </div>

            <Link
                to="/"
                className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group px-4 py-2 rounded-xl hover:bg-white hover:shadow-sm"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Home</span>
            </Link>

            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-100">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 rounded-2xl mb-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg">
                            <RefreshCw className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                            Reset Password
                        </h1>
                        <p className="text-slate-500 px-4">
                            Enter your registered Gmail to receive a password recovery link
                        </p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={email}
                                        placeholder="name@gmail.com"
                                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 transition-all outline-none text-slate-800 placeholder:text-slate-400 font-medium ${error ? 'ring-2 ring-red-400' : 'focus:ring-blue-500/20'}`}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError("");
                                        }}
                                    />
                                </div>
                                {error && <p className="text-xs text-red-500 flex items-center gap-1 ml-1 mt-2">
                                    <AlertCircle className="w-3 h-3" /> {error}
                                </p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 mt-6 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all hover:bg-blue-600 hover:shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]`}
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" /> Send Reset Link
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center p-6 bg-green-50 rounded-3xl border border-green-100 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                                <Send className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-green-900 mb-2">Check your email</h3>
                            <p className="text-green-700 text-sm mb-6">
                                We've sent a password reset link to your registered email address.
                            </p>
                            <button
                                onClick={() => setSuccess(false)}
                                className="text-green-800 font-bold hover:underline"
                            >
                                Try another email
                            </button>
                        </div>
                    )}

                    <div className="mt-8 text-center bg-slate-50 p-6 rounded-3xl">
                        <p className="text-slate-500 font-medium">
                            Remember your password?{' '}
                            <Link
                                to="/auth/patient"
                                className="text-blue-600 font-bold hover:underline ml-1"
                            >
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <footer className="mt-12 text-slate-400 text-sm uppercase tracking-widest font-bold">
                © 2026 MediSync Secured Gateway
            </footer>
        </div>
    );
};

export default ForgotPassword;
