interface LogoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutDialog({ isOpen, onClose }: LogoutDialogProps) {
  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('user_profile');
    sessionStorage.clear();

    // Show success message with institutional style
    const toast = document.createElement('div');
    toast.className = 'fixed top-6 right-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl z-[200] flex items-center gap-4 animate-slide-in border border-white/10';
    toast.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
         <i class="ri-check-line text-lg"></i>
      </div>
      <span class="font-bold text-[11px] uppercase tracking-widest">Session Terminated Successfully</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
      // Redirect to login page
      window.location.href = '/login';
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      ></div>
      <div 
        className="relative bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-10 space-y-8 text-center">
          <div className="flex flex-col items-center">
             <div className="w-20 h-20 flex items-center justify-center rounded-[2rem] bg-rose-500/10 text-rose-500 mb-8 border border-rose-500/20 shadow-inner">
               <i className="ri-logout-circle-line text-4xl"></i>
             </div>
             <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">
               Terminate Session
             </h3>
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-3 text-center">
               Institutional Auth Protocol
             </p>

             <div className="bg-white/5 rounded-[2rem] p-6 mt-8 mb-8">
                <div className="flex items-start gap-4">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse"></div>
                   <div className="flex-1">
                      <p className="text-[13px] font-semibold text-slate-200 leading-relaxed italic">
                        "Logging out will terminate all active operational handles and clear cache residues. Proceed with synchronization?"
                      </p>
                   </div>
                </div>
             </div>

             <div className="space-y-3 w-full">
               <button 
                 onClick={handleLogout}
                 className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
               >
                 <i className="ri-checkbox-circle-line"></i>
                 Confirm Termination
               </button>
               <button 
                 onClick={onClose}
                 className="w-full py-4 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-white/5"
               >
                 Abort Sequence
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
