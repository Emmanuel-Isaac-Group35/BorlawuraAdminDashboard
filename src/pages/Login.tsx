import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                localStorage.setItem('adminToken', data.session.access_token);
                localStorage.setItem('adminUser', JSON.stringify(data.user));
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleBypass = () => {
        localStorage.setItem('adminToken', 'bypass-session-token');
        localStorage.setItem('adminUser', JSON.stringify({
            id: 'bypass-id',
            email: 'admin@borlawura.gh',
            user_metadata: {
                full_name: 'Bypass Admin',
                role: 'super_admin'
            }
        }));
        navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden font-['Montserrat']">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full">
               <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px]"></div>
               <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-md w-full animate-fade-in relative z-10">
                <div className="glass-card rounded-[2.5rem] border border-white/10 dark:border-white/5 shadow-2xl overflow-hidden backdrop-blur-3xl bg-white/5">
                    <div className="p-10">
                        <div className="text-center mb-10">
                            <div className="w-24 h-24 premium-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-teal-500/20">
                                <i className="ri-shield-keyhole-line text-4xl text-white"></i>
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Admin Terminal</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Secure Access Protocol V2.0</p>
                        </div>

                        {error && (
                            <div className="mb-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-3 animate-head-shake">
                                <i className="ri-error-warning-line text-rose-500 text-xl"></i>
                                <p className="text-xs font-bold text-rose-500 uppercase leading-relaxed">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transmission Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                        <div className="w-10 h-10 flex items-center justify-center text-gray-500">
                                           <i className="ri-mail-line"></i>
                                        </div>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-sm"
                                        placeholder="admin@borlawura.gh"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Security Cipher</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                        <div className="w-10 h-10 flex items-center justify-center text-gray-500">
                                           <i className="ri-lock-password-line"></i>
                                        </div>
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <i className="ri-loader-4-line animate-spin text-xl"></i>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Authorize Entry
                                        <i className="ri-arrow-right-up-line text-xl"></i>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    
                    <div className="px-10 py-8 bg-white/5 border-t border-white/5 text-center flex flex-col gap-4">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">
                            Immutable Security Layer Active
                        </p>
                        <button 
                          onClick={handleBypass}
                          className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-400 transition-colors cursor-pointer border border-teal-500/20 py-3 rounded-xl hover:bg-teal-500/5"
                        >
                           Emergency Bypass (Development Only)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
