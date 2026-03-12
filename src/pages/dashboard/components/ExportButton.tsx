import { useState } from 'react';
import { exportToExcel, exportToCSV, exportToPDF } from '../../../utils/exportUtils';

interface ExportButtonProps {
  data: any[];
  fileName: string;
  title: string;
}

export default function ExportButton({ data, fileName, title }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
    if (!data || data.length === 0) {
      alert('Operational Error: No data points identified for export.');
      return;
    }
    
    switch (type) {
      case 'excel': exportToExcel(data, fileName); break;
      case 'csv': exportToCSV(data, fileName); break;
      case 'pdf': exportToPDF(data, fileName, title); break;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative font-['Montserrat']">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2.5 shadow-sm"
      >
        <i className="ri-download-cloud-2-line text-sm"></i>
        Export Data
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-up border-b-4 border-b-indigo-500">
             <div className="px-5 py-3 border-b border-slate-50 dark:border-white/5 bg-slate-50/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Protocol</p>
             </div>
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-5 py-4 text-left text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between group"
            >
              Excel Ledger (.xlsx)
              <i className="ri-file-excel-2-line opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-5 py-4 text-left text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between group border-t border-slate-50 dark:border-white/5"
            >
              CSV Manifest (.csv)
              <i className="ri-file-text-line opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-5 py-4 text-left text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between group border-t border-slate-50 dark:border-white/5"
            >
              PDF Document (.pdf)
              <i className="ri-file-pdf-2-line opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
