import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generatePrescriptionPDF = (data) => {
    const { doctor, patient, diagnosis, medications, notes, followUpDate, date } = data;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 184, 172); // mediteal
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("MediSync", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("DIGITAL MEDICAL PRESCRIPTION", 20, 32);
    
    doc.text(`Date: ${date || new Date().toLocaleDateString()}`, 160, 25);

    // Doctor & Patient Info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DOCTOR DETAILS", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Dr. ${doctor?.name || 'Doctor Name'}`, 20, 62);
    doc.text(`${doctor?.specialization || 'General Physician'}`, 20, 67);
    doc.text(`License No: ${doctor?.licenseNo || 'REG-123456'}`, 20, 72);

    doc.setFont("helvetica", "bold");
    doc.text("PATIENT DETAILS", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${patient?.name || 'Patient Name'}`, 120, 62);
    doc.text(`ID: ${patient?.id?.substring(0, 8) || 'N/A'}`, 120, 67);

    // Diagnosis
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 80, 190, 80);
    
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNOSIS:", 20, 90);
    doc.setFont("helvetica", "normal");
    doc.text(diagnosis || 'Not specified', 55, 90);

    // Medications Table
    const tableData = medications.map((med, index) => [
        index + 1,
        med.name,
        med.dosage,
        med.frequency,
        `${med.duration} days`,
        med.instructions
    ]);

    doc.autoTable({
        startY: 100,
        head: [['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions']],
        body: tableData,
        headStyles: { fillColor: [15, 184, 172] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable.finalY + 20;

    // Notes & Follow up
    doc.setFont("helvetica", "bold");
    doc.text("ADDITIONAL NOTES:", 20, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(notes || 'None', 20, finalY + 7, { maxWidth: 170 });

    doc.setFont("helvetica", "bold");
    doc.text("FOLLOW-UP DATE:", 20, finalY + 25);
    doc.setFont("helvetica", "normal");
    doc.text(followUpDate || 'As needed', 65, finalY + 25);

    // Signature Area
    doc.line(130, finalY + 40, 190, finalY + 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Dr. ${doctor?.name}`, 130, finalY + 47);
    doc.setFont("helvetica", "normal");
    doc.text("Digitally Signed", 130, finalY + 52);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This is a digitally generated prescription by MediSync and is valid without a physical signature.", 105, 285, { align: "center" });

    doc.save(`Prescription_${patient?.name}_${new Date().getTime()}.pdf`);
};
