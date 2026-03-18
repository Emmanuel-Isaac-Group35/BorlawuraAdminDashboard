import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';

interface FeedbackEntry {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export default function FeedbackRatings() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null);

  useEffect(() => {
    fetchFeedback();

    const channel = supabase
      .channel('public:feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        fetchFeedback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback')
        .select(`*, users (full_name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setFeedback((data || []).map(f => ({
        ...f,
        user_name: f.users?.full_name || 'Anonymous User'
      })));
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      await logActivity('Review Feedback', 'feedback', id, { 
        status: newStatus,
        message: `Feedback #${id.slice(0,5)} status transitioned to ${newStatus}`
      });

      alert(`Status updated to ${newStatus}`);
      fetchFeedback();
      setSelectedFeedback(null);
    } catch (error) {
       console.error('Error updating feedback status:', error);
    }
  };

  const filteredFeedback = feedback.filter(f => 
    statusFilter === 'all' || f.status === statusFilter
  );

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <i key={i} className={`ri-star-${i < rating ? 'fill text-emerald-500' : 'line text-slate-200 dark:text-slate-800'} text-xs`}></i>
    ));
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">User Feedback</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">See what people are saying about your service</p>
        </div>
        <div className="flex gap-1.5 p-1 bg-white dark:bg-black border border-slate-100 dark:border-white/5 rounded-2xl">
          {['all', 'pending', 'reviewed', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${statusFilter === s
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
           <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Loading Feedback...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredFeedback.map((f) => (
              <div 
                key={f.id} 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                onClick={() => setSelectedFeedback(f)}
              >
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 font-bold text-sm">
                          {f.user_name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{f.user_name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase border ${
                      f.status === 'pending' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      f.status === 'reviewed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                      'bg-emerald-600 text-white border-emerald-600'
                    }`}>
                       {f.status}
                    </span>
                 </div>
                 
                 <div className="flex gap-1 mb-4">
                    {getRatingStars(f.rating)}
                 </div>
                 
                 <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic line-clamp-3 leading-relaxed">
                    "{f.comment}"
                 </p>
                 
                 <div className="mt-8 pt-6 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score: {f.rating}.0 / 5.0</p>
                    <div className="w-8 h-8 flex items-center justify-center rounded-xl group-hover:bg-emerald-500 group-hover:text-white dark:bg-slate-800 text-slate-300 transition-all">
                       <i className="ri-arrow-right-line"></i>
                    </div>
                 </div>
              </div>
           ))}
           {filteredFeedback.length === 0 && (
             <div className="col-span-full py-24 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-slate-50/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
                No sentiment data available in this segment
             </div>
           )}
        </div>
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedFeedback(null)}></div>
           <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
              <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Feedback Details</h2>
                 <button onClick={() => setSelectedFeedback(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                    <i className="ri-close-line text-2xl"></i>
                 </button>
              </div>
              
              <div className="p-10 space-y-8">
                 <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-300 text-4xl font-bold">
                       {selectedFeedback.user_name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase leading-none mb-3">{selectedFeedback.user_name}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sent {new Date(selectedFeedback.created_at).toLocaleString()}</p>
                    </div>
                 </div>

                  <div className="p-8 rounded-[2rem] bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-500/20 shadow-inner">
                     <div className="flex gap-1.5 mb-5">
                        {getRatingStars(selectedFeedback.rating)}
                     </div>
                     <p className="text-[15px] font-medium text-slate-800 dark:text-white italic leading-relaxed">
                        "{selectedFeedback.comment}"
                     </p>
                  </div>
                                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Update Status</p>
                    <div className="grid grid-cols-3 gap-3 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl">
                       {['pending', 'reviewed', 'resolved'].map((s) => (
                          <button
                             key={s}
                             onClick={() => updateStatus(selectedFeedback.id, s)}
                             className={`py-3.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                selectedFeedback.status === s
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                : 'text-slate-400 hover:text-slate-600'
                             }`}
                          >
                             {s}
                          </button>
                       ))}
                    </div>
                 </div>

                 <button 
                  onClick={() => setSelectedFeedback(null)} 
                  className="w-full py-4 text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all"
                 >
                   Close
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
