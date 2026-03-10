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
      alert('No data to export');
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
        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
      >
        <i className="ri-download-2-line"></i>
        Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-teal-500 hover:text-white transition-colors"
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-teal-500 hover:text-white transition-colors"
            >
              CSV (.csv)
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-teal-500 hover:text-white transition-colors"
            >
              PDF (.pdf)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
