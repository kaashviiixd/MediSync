import React, { useRef } from 'react';
import { X, Download, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReceiptModal = ({ isOpen, onClose, data }) => {
    const receiptRef = useRef(null);

    const handleDownloadPDF = async () => {
        if (!receiptRef.current) return;
        
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`MediSync_Receipt_${data?.referenceId || 'N/A'}.pdf`);
        } catch (error) {
            console.error('MediSync: PDF Generation Error:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (!isOpen || !data) return null;

    const {
        patientName,
        doctorName,
        specialty,
        date,
        time,
        amount,
        referenceId = Math.random().toString(36).substr(2, 9).toUpperCase(),
        paymentStatus = "Paid"
    } = data;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl max-h-[95vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Scrollable container for content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-receipt">
                    <div ref={receiptRef} className="bg-white">
                        {/* Header Decor */}
                        <div className="h-3 bg-gradient-to-r from-mediteal via-mediblue to-mediteal"></div>
                        
                        <div className="p-8 md:p-12">
                            {/* Top Bar */}
                            <div className="flex justify-between items-start mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-mediteal rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-mediteal/20">
                                        M
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">MediSync</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Official Medical Receipt</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors print:hidden">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            {/* Success Badge */}
                            <div className="flex flex-col items-center mb-10">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                                    <CheckCircle size={48} className="text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-1">Payment Successful</h3>
                                <p className="text-slate-500 font-bold text-sm">Reference ID: #{referenceId}</p>
                            </div>

                            {/* Receipt Details */}
                            <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 mb-8">
                                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patient Details</p>
                                        <p className="font-bold text-slate-900 text-lg">{patientName}</p>
                                        <p className="text-sm text-slate-500 font-medium">Verified Patient</p>
                                    </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doctor Details</p>
                                    <p className="font-bold text-slate-900 text-lg">{doctorName}</p>
                                    <p className="text-xs text-mediteal font-extrabold uppercase">{specialty}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Appointment Date</p>
                                    <p className="font-bold text-slate-800">{date}</p>
                                    <p className="text-sm text-slate-500 font-medium">{time}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Consultation Fee</p>
                                    <p className="text-2xl font-black text-slate-900">₹{amount}</p>
                                    <p className="text-xs text-emerald-600 font-black uppercase tracking-tighter flex items-center justify-end gap-1">
                                        <ShieldCheck size={12} /> {paymentStatus}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 mb-10">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-mediblue shadow-sm">
                                <Printer size={20} />
                            </div>
                            <p className="text-xs text-mediblue font-bold leading-relaxed">
                                This is a digitally generated receipt. No physical signature is required. Please present this at the clinic during your visit.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-8 py-4 flex justify-center border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Trusted and Secured by MediSync Health Systems</p>
                    </div>
                </div>
            </div>

                {/* Actions - Outside capture ref to avoid infinite recursion or UI clutter in PDF */}
                <div className="p-8 md:p-12 pt-0 sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-slate-100">
                    <div className="flex gap-4">
                        <button 
                            onClick={handleDownloadPDF}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-200"
                        >
                            <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
                            Download PDF
                        </button>
                        <button 
                            onClick={onClose}
                            className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar-receipt::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-receipt::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-receipt::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
            `}} />
        </div>
    );
};

export default ReceiptModal;
