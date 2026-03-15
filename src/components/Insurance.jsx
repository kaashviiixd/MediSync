import React, { useState } from 'react';
import { 
    ShieldCheck, Heart, Zap, Check, ChevronRight, 
    ArrowRight, Info, Award, Shield, Gem, Star, 
    X, Wallet, CreditCard, Activity
} from 'lucide-react';

const Insurance = ({ activeProfile }) => {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [policyNumber, setPolicyNumber] = useState('');

    const plans = [
        {
            id: 'silver',
            name: 'Silver Plan',
            cover: '₹25 Lakhs',
            originalPrice: 749,
            discountedPrice: 599,
            icon: Shield,
            color: 'bg-slate-100',
            textColor: 'text-slate-600',
            features: ['Accidental Cover', 'Critical Illness (Basic)', 'No Medical Tests Required']
        },
        {
            id: 'gold',
            name: 'Gold Plan',
            cover: '₹50 Lakhs',
            originalPrice: 1249,
            discountedPrice: 999,
            icon: Award,
            color: 'bg-amber-50',
            textColor: 'text-amber-600',
            popular: true,
            features: ['Double Accident Cover', '30 Critical Illnesses', 'OPD Cashback up to ₹2k', 'Term Life Benefits']
        },
        {
            id: 'platinum',
            name: 'Platinum Plan',
            cover: '₹1 Crore',
            originalPrice: 2499,
            discountedPrice: 1999,
            icon: Gem,
            color: 'bg-indigo-50',
            textColor: 'text-indigo-600',
            features: ['Unlimited Coverage', 'Comprehensive Illness Cover', 'Global Treatment Support', 'Zero Deductibles']
        }
    ];

    const handleActivate = () => {
        const generatedPolicy = 'MS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        setPolicyNumber(generatedPolicy);
        setShowSuccessModal(true);
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-mediblue-dark h-80 flex items-center p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
                    <Heart className="w-96 h-96 -mr-24 -mt-24 text-white" />
                </div>
                <div className="relative z-10 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-mediteal/20 text-mediteal-light rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <ShieldCheck className="w-4 h-4" /> MediSync Exclusive
                    </div>
                    <h1 className="text-5xl font-black text-white mb-4 leading-tight">Secure What Matters Most</h1>
                    <p className="text-slate-300 text-lg font-medium mb-8">Group Life Insurance policies designed specifically for our healthcare community.</p>
                    
                    <div className="flex items-center gap-5 flex-wrap">
                        <button 
                            onClick={() => document.getElementById('plans-grid')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 bg-mediteal text-white rounded-2xl font-black text-lg hover:bg-mediteal-dark shadow-xl hover:shadow-mediteal/20 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            Get Started <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-400/20 border border-amber-400/40 rounded-2xl backdrop-blur-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                            </span>
                            <span className="text-amber-300 font-bold text-sm tracking-wide">Feature in the works</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Discount Banner */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-orange-200">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                        <Zap className="w-8 h-8 fill-current" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">20% MediSync Member Discount</h3>
                        <p className="text-white/80 font-bold text-sm">Automatic savings applied to all premium plans for {activeProfile?.name || 'you'}.</p>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-white font-black uppercase tracking-widest text-xs">
                    Locked for Lifetime
                </div>
            </div>

            {/* Plans Grid */}
            <div id="plans-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative bg-white rounded-[2.5rem] p-8 border-2 transition-all cursor-pointer group flex flex-col h-full
                            ${selectedPlan?.id === plan.id 
                                ? 'border-mediteal ring-8 ring-mediteal/5 shadow-2xl translate-y-[-8px]' 
                                : 'border-slate-50 hover:border-slate-200 shadow-sm hover:shadow-xl'
                            }`}
                    {...({ 'data-selected': selectedPlan?.id === plan.id })}
                    >
                        {plan.popular && (
                            <div className="absolute top-6 right-8 bg-mediblue text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-mediblue/20">
                                Most Popular
                            </div>
                        )}

                        <div className={`w-16 h-16 ${plan.color} ${plan.textColor} rounded-3xl flex items-center justify-center mb-8 shadow-inner`}>
                            <plan.icon className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">{plan.name}</h3>
                        <div className="mb-8">
                            <span className="text-3xl font-black text-slate-900">₹{plan.discountedPrice}</span>
                            <span className="text-slate-400 font-bold ml-2">/ month</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-slate-400 line-through font-bold">₹{plan.originalPrice}</span>
                                <span className="text-xs font-black text-orange-500 uppercase tracking-tighter">SAVE 20%</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[1.5rem] p-4 mb-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Total Coverage</p>
                            <p className="text-xl font-black text-mediteal">{plan.cover}</p>
                        </div>

                        <ul className="space-y-4 mb-10 flex-1">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="w-3 h-3" strokeWidth={4} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all
                            ${selectedPlan?.id === plan.id 
                                ? 'bg-mediteal text-white shadow-lg' 
                                : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                            }`}>
                            {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Benefits Row */}
            <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 mb-10 text-center">Why Buy Through MediSync?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                    {[
                        { title: 'No Medical Tests', desc: 'Instant approval based on health record summary.', icon: Activity },
                        { title: 'OPD Cashback', desc: 'Get ₹2,000 back on your next 5 doctor visits.', icon: Wallet },
                        { title: 'Easy Claims', desc: '1-click claim process via MediSync support.', icon: Zap },
                        { title: 'Top Ratings', desc: '98% claim settlement ratio with partners.', icon: Star }
                    ].map((benefit, i) => (
                        <div key={i} className="text-center group">
                            <div className="w-16 h-16 bg-slate-50 text-mediteal rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-mediteal group-hover:text-white transition-all shadow-sm">
                                <benefit.icon className="w-8 h-8" />
                            </div>
                            <h4 className="font-extrabold text-slate-800 mb-2">{benefit.title}</h4>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{benefit.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Checkout Section */}
            {selectedPlan && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50 animate-in slide-in-from-bottom-10 pointer-events-none">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 pointer-events-auto border-t-4 border-mediteal">
                        <div className="text-center sm:text-left">
                            <p className="text-mediteal font-black text-xs uppercase tracking-[0.2em] mb-2">Order Summary</p>
                            <h3 className="text-white text-2xl font-black">{selectedPlan.name}</h3>
                            <p className="text-slate-400 font-bold text-sm">₹{selectedPlan.discountedPrice}/mo • {selectedPlan.cover} Cover</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                                <p className="text-emerald-400 font-black text-lg">Saved ₹{selectedPlan.originalPrice - selectedPlan.discountedPrice}</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase">Member Discount Applied</p>
                            </div>
                            <button 
                                onClick={handleActivate}
                                className="px-10 py-5 bg-mediteal text-white rounded-[1.5rem] font-black text-lg hover:bg-mediteal-dark shadow-xl hover:shadow-mediteal/20 transition-all flex items-center gap-3 active:scale-95 group"
                            >
                                Activate Policy <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-inner shadow-emerald-100/50">
                            <ShieldCheck className="w-12 h-12" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Congratulations!</h2>
                        <p className="text-slate-500 font-bold mb-8">Your {selectedPlan.name} is now active. Your loved ones are protected.</p>
                        
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Your Policy Number</p>
                            <p className="text-2xl font-black text-slate-800 tracking-wider font-mono">{policyNumber}</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest">
                                <Zap className="w-3 h-3 fill-current" /> 20% Discount Permanently Locked
                            </div>
                        </div>

                        <button 
                            onClick={() => { setShowSuccessModal(false); setSelectedPlan(null); }}
                            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-lg hover:bg-slate-800 transition-all"
                        >
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Insurance;
