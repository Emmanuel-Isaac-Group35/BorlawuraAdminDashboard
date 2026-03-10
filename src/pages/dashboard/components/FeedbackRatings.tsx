import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

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
      alert(`Feedback marked as ${newStatus}`);
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
      <i key={i} className={`ri-star-${i < rating ? 'fill text-amber-500' : 'line text-gray-300'} text-xs`}></i>
    ));
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback & Ratings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor citizen feedback and service satisfaction</p>
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700">
          {['all', 'pending', 'reviewed', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded transition-all ${statusFilter === s
                ? 'bg-amber-500 text-white'
                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
           <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredFeedback.map((f) => (
              <div 
                key={f.id} 
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedFeedback(f)}
              >
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 font-bold text-xs">
                          {f.user_name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase">{f.user_name}</h3>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(f.created_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      f.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      f.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                       {f.status}
                    </span>
                 </div>
                 
                 <div className="flex gap-0.5 mb-3">
                    {getRatingStars(f.rating)}
                 </div>
                 
                 <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-3">
                    "{f.comment}"
                 </p>
                 
                 <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Rating: {f.rating}/5</p>
                    <i className="ri-arrow-right-line text-gray-300 group-hover:text-amber-500 transition-colors"></i>
                 </div>
              </div>
           ))}
        </div>
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedFeedback(null)}></div>
           <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-900 dark:text-white">Feedback Detail</h2>
                 <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-rose-500">
                    <i className="ri-close-line text-2xl"></i>
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400 text-xl font-bold">
                       {selectedFeedback.user_name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase">{selectedFeedback.user_name}</h3>
                       <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Submitted {new Date(selectedFeedback.created_at).toLocaleString()}</p>
                    </div>
                 </div>

                 <div className="p-6 rounded-lg bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                    <div className="flex gap-1 mb-4">
                       {getRatingStars(selectedFeedback.rating)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white italic leading-relaxed">
                       "{selectedFeedback.comment}"
                    </p>
                 </div>
                 
                 <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase px-1">Update Status</p>
                    <div className="grid grid-cols-3 gap-2">
                       {['pending', 'reviewed', 'resolved'].map((s) => (
                          <button
                             key={s}
                             onClick={() => updateStatus(selectedFeedback.id, s)}
                             className={`py-3 rounded-lg text-[9px] font-bold uppercase transition-all ${
                                selectedFeedback.status === s
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-gray-600'
                             }`}
                          >
                             {s}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
