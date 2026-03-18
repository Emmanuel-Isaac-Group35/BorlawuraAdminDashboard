import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data: any[], fileName: string) => {
  const flattened = data.map(item => flattenObject(item));
  const worksheet = XLSX.utils.json_to_sheet(flattened);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToCSV = (data: any[], fileName: string) => {
  const flattened = data.map(item => flattenObject(item));
  const worksheet = XLSX.utils.json_to_sheet(flattened);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToPDF = (data: any[], fileName: string, title: string) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const flattenedData = data.map(item => flattenObject(item));
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 184, 166); // Emerald-500
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Record Count: ${data.length}`, 14, 35);

  const headers = Object.keys(flattenedData[0]);
  const rows = flattenedData.map(item => Object.values(item).map(val => String(val || 'N/A')));

  autoTable(doc, {
    head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
    body: rows,
    startY: 45,
    margin: { top: 45 },
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      font: 'helvetica'
    },
    headStyles: { 
      fillColor: [16, 185, 129], // Emerald-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 'auto' }
    }
  });

  doc.save(`${fileName}.pdf`);
};

/**
 * Utility to flatten nested objects for tabular display
 */
const flattenObject = (obj: any, prefix = ''): any => {
  return Object.keys(obj).reduce((acc: any, k: any) => {
    const pre = prefix.length ? prefix + '_' : '';
    if (obj[k] !== null && typeof obj[k] === 'object' && !Array.isArray(obj[k]) && !(obj[k] instanceof Date)) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};
