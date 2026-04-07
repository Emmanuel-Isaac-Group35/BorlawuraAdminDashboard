import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';

interface SupportItem {
  id: string;
  type: 'feedback' | 'ticket';
  sender_name: string;
  category: string;
  content: string;
  rating?: number;
  status: 'pending' | 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  origin: 'user' | 'rider' | 'system';
}

interface SupportDeskProps {
  adminInfo?: any;
}

export default function SupportDesk({ adminInfo }: SupportDeskProps) {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'user' | 'rider'>('all');
  const [selectedItem, setSelectedItem] = useState<SupportItem | null>(null);

  useEffect(() => {
    fetchSupportData();

    const feedbackSub = supabase.channel('support_desk').on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => fetchSupportData()).subscribe();
    const ticketSub = supabase.channel('ticket_desk').on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchSupportData()).subscribe();

    return () => {
      supabase.removeChannel(feedbackSub);
      supabase.removeChannel(ticketSub);
    };
  }, []);

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      
      // Fetch Feedback ( Sentiment & Complaints )
      const { data: feedbackData } = await supabase.from('feedback').select('*, users(full_name)').order('created_at', { ascending: false });
      
      // Fetch Tickets ( Help & Support )
      const { data: ticketData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });

      const normalizedFeedback: SupportItem[] = (feedbackData || []).map(f => ({
        id: f.id,
        type: 'feedback',
        sender_name: f.users?.full_name || 'Anonymous User',
        category: f.type || 'service',
        content: f.comment,
        rating: f.rating,
        status: f.status as any,
        created_at: f.created_at,
        origin: 'user'
      }));

      const normalizedTickets: SupportItem[] = (ticketData || []).map(t => ({
        id: t.id,
        type: 'ticket',
        sender_name: t.creator_type === 'rider' ? 'Rider Terminal' : 'User Terminal',
        category: t.category,
        content: t.description || t.subject,
        status: t.status as any,
        created_at: t.created_at,
        origin: t.creator_type as any
      }));

      setItems([...normalizedFeedback, ...normalizedTickets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (item: SupportItem, newStatus: string) => {
    try {
      const table = item.type === 'feedback' ? 'feedback' : 'support_tickets';
      const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', item.id);
      if (error) throw error;
      
      await logActivity(`Update Support Status`, table, item.id, { status: newStatus });
      alert(`Station signal updated to ${newStatus}`);
      fetchSupportData();
      setSelectedItem(null);
    } catch (error: any) { alert(`Error: ${error.message}`); }
  };

  const filteredItems = items.filter(i => activeFilter === 'all' || i.origin === activeFilter);

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Support Desk</h1>
           <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Managed sentiment and help requests from Users & Riders</p>
        </div>
        <div className="flex gap-1.5 p-1 bg-white dark:bg-black border border-slate-100 dark:border-white/5 rounded-2xl">
           {['all', 'user', 'rider'].map((f) => (
             <button
               key={f}
               onClick={() => setActiveFilter(f as any)}
               className={`px-6 py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all ${activeFilter === f ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {f === 'all' ? 'All Channels' : `${f} Stream`}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {loading ? (
           <div className="col-span-full py-20 text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase mt-4 tracking-widest">Scanning Streams...</p>
           </div>
         ) : filteredItems.map((item) => (
           <div 
             key={item.id} 
             onClick={() => setSelectedItem(item)}
             className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
           >
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.origin === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                       <i className={item.origin === 'user' ? 'ri-user-voice-line' : 'ri-e-bike-2-line'}></i>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.type}</p>
                       <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{item.sender_name}</h3>
                    </div>
                 </div>
                 <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tighter border ${
                    item.status === 'pending' || item.status === 'open' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                    item.status === 'resolved' || item.status === 'closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                 }`}>
                    {item.status}
                 </span>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-black/20 rounded-2xl mb-6">
                 <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    "{item.content}"
                 </p>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 <span>{item.category}</span>
                 <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
           </div>
         ))}
         {!loading && filteredItems.length === 0 && (
            <div className="col-span-full py-32 text-center text-slate-400 font-bold uppercase tracking-widest">No active communications found</div>
         )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedItem(null)}></div>
           <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
              <div className="p-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white text-2xl shadow-xl ${selectedItem.origin === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                          <i className={selectedItem.origin === 'user' ? 'ri-user-heart-line' : 'ri-e-bike-2-line'}></i>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedItem.origin} Stream</p>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedItem.sender_name}</h3>
                       </div>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-100 dark:border-white/5">
                       <i className="ri-close-line text-2xl"></i>
                    </button>
                 </div>

                 <div className="p-8 bg-slate-50 dark:bg-black/20 rounded-[2rem] border border-slate-100 dark:border-white/5">
                    <p className="text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic animate-fade-in">"{selectedItem.content}"</p>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Transition Protocol</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                          <button
                             key={s}
                             onClick={() => updateStatus(selectedItem, s)}
                             className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedItem.status === s ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'text-slate-400 hover:bg-slate-50'
                             }`}
                          >
                             {s.replace('_', ' ')}
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
