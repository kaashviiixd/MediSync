import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, ArrowRight, Home } from 'lucide-react';

export default function BookingSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in zoom-in duration-700">
        <div className="w-20 h-20 bg-mediteal/10 rounded-full flex items-center justify-center text-mediteal mx-auto mb-8 animate-bounce">
          <CheckCircle className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Request Sent!</h1>
        <p className="text-slate-500 mb-10 leading-relaxed">
          Your medical info has been successfully shared with our clinical team. A coordinator will call you shortly to confirm your slot.
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-mediblue transition-all shadow-lg hover:shadow-mediblue/20"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-center gap-2 text-mediteal-dark font-semibold text-sm py-2">
            <Calendar className="w-4 h-4" />
            Appointment Pending Confirmation
          </div>
        </div>
      </div>
    </div>
  );
}
