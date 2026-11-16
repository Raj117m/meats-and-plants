import { jsPDF } from 'jspdf';
import { PayrollMonthResponse, PayrollEmployee } from '../types';
import { formatINR } from './currency';

/**
 * Generates a clean, branded PDF report for Meats & Plants Payroll
 */
export function exportPayrollPDF(data: PayrollMonthResponse, cafeName: string = 'Meats & Plants') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Header Banner
  doc.setFillColor(47, 125, 79); // #2F7D4F Plant Green
  doc.roundedRect(12, currentY, pageWidth - 24, 28, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(cafeName, 18, currentY + 11);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Staff & Payroll Ledger · Month: ${data.month}`, 18, currentY + 18);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 18, currentY + 23);

  // Status Badge in header
  if (data.isFinalized) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 55, currentY + 7, 37, 8, 2, 2, 'F');
    doc.setTextColor(47, 125, 79);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('FINALIZED & LOCKED', pageWidth - 53, currentY + 12.5);
  } else {
    doc.setFillColor(217, 154, 43); // Amber
    doc.roundedRect(pageWidth - 45, currentY + 7, 27, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DRAFT CYCLE', pageWidth - 42, currentY + 12.5);
  }

  currentY += 36;

  // Summary Metrics Tiles
  doc.setFillColor(247, 246, 243); // #F7F6F3 Warm off-white
  doc.roundedRect(12, currentY, 42, 20, 3, 3, 'F');
  doc.roundedRect(58, currentY, 42, 20, 3, 3, 'F');
  doc.roundedRect(104, currentY, 42, 20, 3, 3, 'F');
  doc.roundedRect(150, currentY, 48, 20, 3, 3, 'F');

  doc.setTextColor(107, 107, 102); // #6B6B66 Secondary
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL BASE SALARY', 15, currentY + 6);
  doc.text('TOTAL DEDUCTIONS', 61, currentY + 6);
  doc.text('TOTAL BONUSES', 107, currentY + 6);
  doc.text('TOTAL NET PAYROLL', 153, currentY + 6);

  doc.setTextColor(28, 28, 26);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(data.totals.totalBase), 15, currentY + 14);

  doc.setTextColor(200, 70, 61); // Red
  doc.text(`-${formatINR(data.totals.totalDeductions)}`, 61, currentY + 14);

  doc.setTextColor(47, 125, 79); // Green
  doc.text(`+${formatINR(data.totals.totalBonuses)}`, 107, currentY + 14);

  doc.setTextColor(28, 28, 26);
  doc.text(formatINR(data.totals.totalNet), 153, currentY + 14);

  currentY += 28;

  // Table Title
  doc.setTextColor(28, 28, 26);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Staff Payroll Summary', 12, currentY);

  currentY += 5;

  // Table Header
  doc.setFillColor(236, 234, 229); // #ECEAE5 Divider tint
  doc.rect(12, currentY, pageWidth - 24, 7, 'F');

  doc.setTextColor(107, 107, 102);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE', 14, currentY + 5);
  doc.text('BASE (₹)', 62, currentY + 5);
  doc.text('LEAVES', 86, currentY + 5);
  doc.text('LATES', 106, currentY + 5);
  doc.text('BREAKS', 124, currentY + 5);
  doc.text('DEDUCTIONS', 145, currentY + 5);
  doc.text('NET PAY', 175, currentY + 5);

  currentY += 7;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  data.employees.forEach((emp, index) => {
    // Check page overflow
    if (currentY > 265) {
      doc.addPage();
      currentY = 15;
    }

    if (index % 2 === 1) {
      doc.setFillColor(247, 246, 243);
      doc.rect(12, currentY, pageWidth - 24, 7, 'F');
    }

    doc.setTextColor(28, 28, 26);
    doc.text(emp.employeeName, 14, currentY + 5);
    doc.text(formatINR(emp.baseSalary), 62, currentY + 5);
    doc.text(`${emp.paidLeavesUsed} paid / ${emp.totalUnpaidDays} unp`, 86, currentY + 5);
    doc.text(`${emp.lateDaysCount} (${emp.lateMarkDeductionUnits > 0 ? '-' + formatINR(emp.lateMarkDeductionAmount) : 'ok'})`, 106, currentY + 5);
    doc.text(`${emp.breaksBanked} bnk (${emp.breakBonusAmount > 0 ? '+' + formatINR(emp.breakBonusAmount) : '0'})`, 124, currentY + 5);

    doc.setTextColor(200, 70, 61);
    doc.text(emp.totalDeductions > 0 ? `-${formatINR(emp.totalDeductions)}` : '₹0', 145, currentY + 5);

    doc.setTextColor(47, 125, 79);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(emp.netSalary), 175, currentY + 5);
    doc.setFont('helvetica', 'normal');

    currentY += 7;
  });

  // Totals Row
  doc.setFillColor(232, 243, 236); // #E8F3EC Plant Green tint
  doc.rect(12, currentY, pageWidth - 24, 8, 'F');
  doc.setTextColor(47, 125, 79);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL DISBURSEMENT', 14, currentY + 5.5);
  doc.text(formatINR(data.totals.totalBase), 62, currentY + 5.5);
  doc.setTextColor(200, 70, 61);
  doc.text(`-${formatINR(data.totals.totalDeductions)}`, 145, currentY + 5.5);
  doc.setTextColor(47, 125, 79);
  doc.text(formatINR(data.totals.totalNet), 175, currentY + 5.5);

  currentY += 15;

  // Individual Employee Detailed Slips on subsequent pages
  data.employees.forEach((emp) => {
    doc.addPage();
    let y = 20;

    // Header
    doc.setFillColor(47, 125, 79);
    doc.rect(12, y, 4, 18, 'F');
    doc.setTextColor(28, 28, 26);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.employeeName, 20, y + 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 107, 102);
    doc.text(`Monthly Payslip · ${cafeName} · Cycle: ${data.month}`, 20, y + 14);

    y += 26;

    // Net Salary Hero Card
    doc.setFillColor(247, 246, 243);
    doc.roundedRect(12, y, pageWidth - 24, 25, 3, 3, 'F');
    doc.setTextColor(107, 107, 102);
    doc.setFontSize(8.5);
    doc.text('NET SALARY PAYABLE', 20, y + 8);
    doc.setTextColor(47, 125, 79);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(emp.netSalary), 20, y + 19);

    doc.setTextColor(107, 107, 102);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Daily Rate: ${formatINR(emp.dailyRate)} (30 days)`, pageWidth - 75, y + 14);
    doc.text(`Base: ${formatINR(emp.baseSalary)}`, pageWidth - 75, y + 19);

    y += 33;

    // Line Items Breakdown Box
    doc.setFillColor(255, 255, 255);
    doc.rect(12, y, pageWidth - 24, 75);
    doc.setDrawColor(236, 234, 229);
    doc.rect(12, y, pageWidth - 24, 75, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 28, 26);
    doc.text('Detailed Earnings & Deductions Breakdown', 18, y + 9);

    const items = [
      { label: 'Base Monthly Salary', val: formatINR(emp.baseSalary), color: [28, 28, 26] },
      { label: `Unpaid Leaves (${emp.totalUnpaidDays} day${emp.totalUnpaidDays === 1 ? '' : 's'})`, val: emp.unpaidDaysDeductionAmount > 0 ? `-${formatINR(emp.unpaidDaysDeductionAmount)}` : '₹0', color: [200, 70, 61] },
      { label: `Half-Day Deductions (${emp.manualHalfDaysCount} day${emp.manualHalfDaysCount === 1 ? '' : 's'})`, val: emp.halfDaysDeductionAmount > 0 ? `-${formatINR(emp.halfDaysDeductionAmount)}` : '₹0', color: [200, 70, 61] },
      { label: `Late Marks (${emp.lateDaysCount} marks = ${emp.lateMarkDeductionUnits} unit deductions)`, val: emp.lateMarkDeductionAmount > 0 ? `-${formatINR(emp.lateMarkDeductionAmount)}` : '₹0', color: [200, 70, 61] },
      { label: `Banked Breaks Bonus (${emp.breaksBanked} banked, needed 4)`, val: emp.breakBonusAmount > 0 ? `+${formatINR(emp.breakBonusAmount)}` : (emp.breakBonusLeaves > 0 ? `+${emp.breakBonusLeaves} leave` : '₹0'), color: [47, 125, 79] },
      { label: 'Total Deductions', val: `-${formatINR(emp.totalDeductions)}`, color: [200, 70, 61], bold: true },
      { label: 'Net Projected / Final Disbursement', val: formatINR(emp.netSalary), color: [47, 125, 79], bold: true }
    ];

    let rowY = y + 18;
    items.forEach(it => {
      doc.setFont('helvetica', it.bold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(28, 28, 26);
      doc.text(it.label, 18, rowY);
      doc.setTextColor(it.color[0], it.color[1], it.color[2]);
      doc.text(it.val, pageWidth - 35, rowY);
      rowY += 8;
    });

    y += 85;

    // Attendance stats box
    doc.setFillColor(247, 246, 243);
    doc.roundedRect(12, y, pageWidth - 24, 20, 2, 2, 'F');
    doc.setTextColor(107, 107, 102);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Days Present: ${emp.presentDays} | Paid Leaves Used: ${emp.paidLeavesUsed} (Remaining: ${emp.paidLeavesLeft}) | Banked Break Remainder: ${emp.bankedBreaksRemainder}/4`, 18, y + 12);
  });

  // Save the PDF
  doc.save(`Meats_and_Plants_Payroll_${data.month}.pdf`);
}
