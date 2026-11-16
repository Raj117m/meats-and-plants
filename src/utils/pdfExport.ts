import { jsPDF } from 'jspdf';
import { PayrollMonthResponse, PayrollEmployee } from '../types';
import { formatINR } from './currency';

/**
 * Exports a single employee payslip matching Section 8:
 * Header: Meats & Plants, employee name, role, month.
 * Two clear sections: Earnings and Deductions.
 * Net pay large and clear. Fits on 1 page.
 */
export function exportSinglePayslipPDF(emp: PayrollEmployee, month: string, cafeName: string = 'Meats & Plants') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Box
  doc.setDrawColor(230, 230, 226); // #E6E6E2
  doc.setFillColor(250, 250, 248); // #FAFAF8
  doc.rect(14, y, pageWidth - 28, 30, 'FD');

  doc.setTextColor(10, 10, 10);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(cafeName, 20, y + 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 106);
  doc.text('Employee Salary Statement · Confidential', 20, y + 18);
  doc.text(`Pay Period: ${month}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, y + 24);

  // Employee details chip on right
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(emp.employeeName, pageWidth - 20, y + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 106);
  doc.text(`${emp.role}  |  Rate: ${formatINR(emp.dailyWage)}/day`, pageWidth - 20, y + 19, { align: 'right' });
  doc.text(`Working days in month: ${emp.workingDays || 30}`, pageWidth - 20, y + 25, { align: 'right' });

  y += 38;

  // Net Pay Hero Card
  doc.setFillColor(242, 242, 239); // #F2F2EF
  doc.setDrawColor(230, 230, 226);
  doc.roundedRect(14, y, pageWidth - 28, 24, 3, 3, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 110, 106);
  doc.text('NET SALARY PAYABLE', 20, y + 8);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(formatINR(emp.netSalary || emp.netPay), 20, y + 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 106);
  doc.text(`Gross: ${formatINR(emp.grossPay || emp.baseSalary)}  ·  Deductions: -${formatINR(emp.totalDeductions)}`, pageWidth - 20, y + 14, { align: 'right' });

  y += 32;

  // Earnings Table Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('1. Earnings', 14, y);
  y += 5;

  doc.setFillColor(230, 230, 226);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 110, 106);
  doc.text('ITEM', 18, y + 5);
  doc.text('DAYS / UNITS', 110, y + 5);
  doc.text('RATE (₹)', 145, y + 5);
  doc.text('AMOUNT (₹)', pageWidth - 18, y + 5, { align: 'right' });
  y += 7;

  const earnings = [
    { label: 'Present Working Days', count: `${emp.presentDays} days`, rate: formatINR(emp.dailyWage), amount: formatINR(emp.presentDays * emp.dailyWage) },
    { label: 'Paid Leaves (Quota: 3/mo)', count: `${emp.paidLeavesUsed} days`, rate: formatINR(emp.dailyWage), amount: formatINR(emp.paidLeavesUsed * emp.dailyWage) },
    { label: 'Gazetted Holidays', count: `${emp.holidaysCount || 0} days`, rate: formatINR(emp.dailyWage), amount: formatINR((emp.holidaysCount || 0) * emp.dailyWage) },
    { label: 'Break Bonus Holiday (Credit)', count: `${emp.bonusHolidaysEarned || 0} days`, rate: formatINR(emp.dailyWage), amount: formatINR((emp.bonusHolidaysEarned || 0) * emp.dailyWage) },
  ];

  earnings.forEach((it, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 248);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(10, 10, 10);
    doc.text(it.label, 18, y + 5);
    doc.text(it.count, 110, y + 5);
    doc.text(it.rate, 145, y + 5);
    doc.text(it.amount, pageWidth - 18, y + 5, { align: 'right' });
    y += 7;
  });

  // Gross Subtotal
  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Earnings', 18, y + 5);
  doc.text(formatINR(emp.grossPay || emp.baseSalary), pageWidth - 18, y + 5, { align: 'right' });
  y += 14;

  // Deductions Table Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('2. Deductions', 14, y);
  y += 5;

  doc.setFillColor(230, 230, 226);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 110, 106);
  doc.text('ITEM', 18, y + 5);
  doc.text('DAYS / UNITS', 110, y + 5);
  doc.text('RATE (₹)', 145, y + 5);
  doc.text('AMOUNT (₹)', pageWidth - 18, y + 5, { align: 'right' });
  y += 7;

  const deductions = [
    { label: 'Unpaid Leaves (4th leave onward)', count: `${emp.unpaidDays || emp.totalUnpaidDays || 0} days`, rate: formatINR(emp.dailyWage), amount: formatINR(emp.unpaidDaysDeductionAmount || (emp.unpaidDays || 0) * emp.dailyWage) },
    { label: 'Half Day (Late check-in past 15m grace)', count: `${emp.halfDaysCount || emp.manualHalfDaysCount || 0} days`, rate: formatINR(emp.dailyWage / 2), amount: formatINR(emp.halfDaysDeductionAmount || (emp.halfDaysCount || 0) * (emp.dailyWage / 2)) }
  ];

  deductions.forEach((it, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 248);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(10, 10, 10);
    doc.text(it.label, 18, y + 5);
    doc.text(it.count, 110, y + 5);
    doc.text(it.rate, 145, y + 5);
    doc.setTextColor(180, 35, 24);
    doc.text(`-${it.amount}`, pageWidth - 18, y + 5, { align: 'right' });
    y += 7;
  });

  // Deductions Subtotal
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('Total Deductions', 18, y + 5);
  doc.setTextColor(180, 35, 24);
  doc.text(`-${formatINR(emp.totalDeductions)}`, pageWidth - 18, y + 5, { align: 'right' });
  y += 16;

  // Final Net Box
  doc.setDrawColor(10, 10, 10);
  doc.setFillColor(250, 250, 248);
  doc.rect(14, y, pageWidth - 28, 14, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('NET SALARY PAYABLE (Gross - Deductions)', 20, y + 9);
  doc.setFontSize(12);
  doc.text(formatINR(emp.netSalary || emp.netPay), pageWidth - 20, y + 9.5, { align: 'right' });

  y += 24;

  // Attendance summary footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 106);
  doc.text(`Attendance record: ${emp.presentDays} present | ${emp.paidLeavesUsed} paid leave | ${emp.holidaysCount || 0} holidays | ${emp.unpaidDays || 0} unpaid | ${emp.halfDaysCount || 0} half days | Banked breaks: ${emp.breaksBanked || 0}`, 14, y);

  doc.save(`Payslip_${emp.employeeName.replace(/\s+/g, '_')}_${month}.pdf`);
}

/**
 * Exports all payslips in a single clean A4 document with summary page
 */
export function exportPayrollPDF(data: PayrollMonthResponse, cafeName: string = 'Meats & Plants') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // ================= Summary Page =================
  doc.setDrawColor(230, 230, 226);
  doc.setFillColor(250, 250, 248);
  doc.rect(14, currentY, pageWidth - 28, 28, 'FD');

  doc.setTextColor(10, 10, 10);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(cafeName, 20, currentY + 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 106);
  doc.text(`Monthly Payroll Summary · Cycle: ${data.month}`, 20, currentY + 18);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}  |  10 Staff Members`, 20, currentY + 23);

  // Status Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  if (data.isFinalized) {
    doc.setTextColor(46, 125, 79);
    doc.text('STATUS: FINALIZED & LOCKED', pageWidth - 20, currentY + 14, { align: 'right' });
  } else {
    doc.setTextColor(183, 121, 31);
    doc.text('STATUS: DRAFT CYCLE', pageWidth - 20, currentY + 14, { align: 'right' });
  }

  currentY += 36;

  // Summary Strip (4 Metrics)
  const summary = data.summary || {
    totalGross: data.totals?.totalGross || data.totals?.totalBase || 0,
    totalDeductions: data.totals?.totalDeductions || 0,
    totalBonus: data.totals?.totalBonus || 0,
    totalNet: data.totals?.totalNet || 0
  };

  const boxW = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: 'TOTAL GROSS', val: formatINR(summary.totalGross), col: [10, 10, 10] },
    { label: 'TOTAL DEDUCTIONS', val: `-${formatINR(summary.totalDeductions)}`, col: [180, 35, 24] },
    { label: 'TOTAL BONUS', val: `+${formatINR(summary.totalBonus)}`, col: [46, 125, 79] },
    { label: 'TOTAL NET PAYABLE', val: formatINR(summary.totalNet), col: [10, 10, 10] }
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setFillColor(242, 242, 239);
    doc.rect(x, currentY, boxW, 18, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 106);
    doc.text(m.label, x + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(m.col[0], m.col[1], m.col[2]);
    doc.text(m.val, x + 4, currentY + 14);
  });

  currentY += 26;

  // Table Title
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Accounting Statement — All Employees', 14, currentY);
  currentY += 5;

  // Table Header
  doc.setFillColor(230, 230, 226);
  doc.rect(14, currentY, pageWidth - 28, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 110, 106);
  doc.text('EMPLOYEE', 17, currentY + 5);
  doc.text('RATE', 50, currentY + 5);
  doc.text('PRES', 68, currentY + 5);
  doc.text('LEAVE', 80, currentY + 5);
  doc.text('HOL', 94, currentY + 5);
  doc.text('UNPD', 106, currentY + 5);
  doc.text('HALF', 118, currentY + 5);
  doc.text('GROSS', 133, currentY + 5);
  doc.text('DEDUCT', 156, currentY + 5);
  doc.text('NET PAY', pageWidth - 17, currentY + 5, { align: 'right' });
  currentY += 7;

  // Table Rows
  data.employees.forEach((emp, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 248);
      doc.rect(14, currentY, pageWidth - 28, 6.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(10, 10, 10);
    doc.text(emp.employeeName, 17, currentY + 4.5);
    doc.text(String(emp.dailyWage), 50, currentY + 4.5);
    doc.text(String(emp.presentDays), 68, currentY + 4.5);
    doc.text(String(emp.paidLeavesUsed), 80, currentY + 4.5);
    doc.text(String(emp.holidaysCount || 0), 94, currentY + 4.5);
    doc.text(String(emp.unpaidDays || emp.totalUnpaidDays || 0), 106, currentY + 4.5);
    doc.text(String(emp.halfDaysCount || emp.manualHalfDaysCount || 0), 118, currentY + 4.5);
    doc.text(formatINR(emp.grossPay || emp.baseSalary), 133, currentY + 4.5);
    doc.setTextColor(180, 35, 24);
    doc.text(`-${formatINR(emp.totalDeductions)}`, 156, currentY + 4.5);
    doc.setTextColor(10, 10, 10);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(emp.netSalary || emp.netPay), pageWidth - 17, currentY + 4.5, { align: 'right' });

    currentY += 6.5;
  });

  // Totals Row
  doc.setFillColor(242, 242, 239);
  doc.rect(14, currentY, pageWidth - 28, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(10, 10, 10);
  doc.text('TOTAL', 17, currentY + 5);
  doc.text(formatINR(summary.totalGross), 133, currentY + 5);
  doc.setTextColor(180, 35, 24);
  doc.text(`-${formatINR(summary.totalDeductions)}`, 156, currentY + 5);
  doc.setTextColor(10, 10, 10);
  doc.text(formatINR(summary.totalNet), pageWidth - 17, currentY + 5, { align: 'right' });

  // ================= Individual Pages =================
  data.employees.forEach((emp) => {
    doc.addPage();
    let y = 20;

    // Header Box
    doc.setDrawColor(230, 230, 226);
    doc.setFillColor(250, 250, 248);
    doc.rect(14, y, pageWidth - 28, 30, 'FD');

    doc.setTextColor(10, 10, 10);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(cafeName, 20, y + 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 106);
    doc.text('Employee Salary Statement · Confidential', 20, y + 18);
    doc.text(`Pay Period: ${data.month}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, y + 24);

    doc.setTextColor(10, 10, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(emp.employeeName, pageWidth - 20, y + 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 106);
    doc.text(`${emp.role}  |  Rate: ${formatINR(emp.dailyWage)}/day`, pageWidth - 20, y + 19, { align: 'right' });
    doc.text(`Working days in month: ${emp.workingDays || 30}`, pageWidth - 20, y + 25, { align: 'right' });

    y += 38;

    // Net Pay Hero Card
    doc.setFillColor(242, 242, 239);
    doc.setDrawColor(230, 230, 226);
    doc.roundedRect(14, y, pageWidth - 28, 24, 3, 3, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 110, 106);
    doc.text('NET SALARY PAYABLE', 20, y + 8);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text(formatINR(emp.netSalary || emp.netPay), 20, y + 18);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 106);
    doc.text(`Gross: ${formatINR(emp.grossPay || emp.baseSalary)}  ·  Deductions: -${formatINR(emp.totalDeductions)}`, pageWidth - 20, y + 14, { align: 'right' });

    y += 32;

    // Earnings Table Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('1. Earnings', 14, y);
    y += 5;

    doc.setFillColor(230, 230, 226);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 110, 106);
    doc.text('ITEM', 18, y + 5);
    doc.text('DAYS / UNITS', 110, y + 5);
    doc.text('RATE (₹)', 145, y + 5);
    doc.text('AMOUNT (₹)', pageWidth - 18, y + 5, { align: 'right' });
    y += 7;

    const earnings = [
      { label: 'Present Working Days', count: `${emp.presentDays} days`, rate: formatINR(emp.dailyWage), amount: formatINR(emp.presentDays * emp.dailyWage) },
      { label: 'Paid Leaves (Quota: 3/mo)', count: `${emp.paidLeavesUsed} days`, rate: formatINR(emp.dailyWage), amount: formatINR(emp.paidLeavesUsed * emp.dailyWage) },
      { label: 'Gazetted Holidays', count: `${emp.holidaysCount || 0} days`, rate: formatINR(emp.dailyWage), amount: formatINR((emp.holidaysCount || 0) * emp.dailyWage) },
      { label: 'Break Bonus Holiday (Credit)', count: `${emp.bonusHolidaysEarned || 0} days`, rate: formatINR(emp.dailyWage), amount: formatINR((emp.bonusHolidaysEarned || 0) * emp.dailyWage) },
    ];

    earnings.forEach((it, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 248);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(10, 10, 10);
      doc.text(it.label, 18, y + 5);
      doc.text(it.count, 110, y + 5);
      doc.text(it.rate, 145, y + 5);
      doc.text(it.amount, pageWidth - 18, y + 5, { align: 'right' });
      y += 7;
    });

    // Gross Subtotal
    doc.setFont('helvetica', 'bold');
    doc.text('Total Gross Earnings', 18, y + 5);
    doc.text(formatINR(emp.grossPay || emp.baseSalary), pageWidth - 18, y + 5, { align: 'right' });
    y += 14;

    // Deductions Table Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('2. Deductions', 14, y);
    y += 5;

    doc.setFillColor(230, 230, 226);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 110, 106);
    doc.text('ITEM', 18, y + 5);
    doc.text('DAYS / UNITS', 110, y + 5);
    doc.text('RATE (₹)', 145, y + 5);
    doc.text('AMOUNT (₹)', pageWidth - 18, y + 5, { align: 'right' });
    y += 7;

    const deductions = [
      { label: 'Unpaid Leaves (4th leave onward)', count: `${emp.unpaidDays || emp.totalUnpaidDays || 0} days`, rate: formatINR(emp.dailyWage), amount: formatINR(emp.unpaidDaysDeductionAmount || (emp.unpaidDays || 0) * emp.dailyWage) },
      { label: 'Half Day (Late check-in past 15m grace)', count: `${emp.halfDaysCount || emp.manualHalfDaysCount || 0} days`, rate: formatINR(emp.dailyWage / 2), amount: formatINR(emp.halfDaysDeductionAmount || (emp.halfDaysCount || 0) * (emp.dailyWage / 2)) }
    ];

    deductions.forEach((it, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 248);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(10, 10, 10);
      doc.text(it.label, 18, y + 5);
      doc.text(it.count, 110, y + 5);
      doc.text(it.rate, 145, y + 5);
      doc.setTextColor(180, 35, 24);
      doc.text(`-${it.amount}`, pageWidth - 18, y + 5, { align: 'right' });
      y += 7;
    });

    // Deductions Subtotal
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('Total Deductions', 18, y + 5);
    doc.setTextColor(180, 35, 24);
    doc.text(`-${formatINR(emp.totalDeductions)}`, pageWidth - 18, y + 5, { align: 'right' });
    y += 16;

    // Final Net Box
    doc.setDrawColor(10, 10, 10);
    doc.setFillColor(250, 250, 248);
    doc.rect(14, y, pageWidth - 28, 14, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('NET SALARY PAYABLE (Gross - Deductions)', 20, y + 9);
    doc.setFontSize(12);
    doc.text(formatINR(emp.netSalary || emp.netPay), pageWidth - 20, y + 9.5, { align: 'right' });
  });

  // Save file
  doc.save(`Meats_and_Plants_Payroll_${data.month}.pdf`);
}
