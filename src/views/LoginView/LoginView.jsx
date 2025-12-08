import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Importamos nuestro hook
import { IconLoader, IconCheck, IconAlertCircle } from '../../components/ui/Icons';

const LogoOrquesta = () => (
    <svg width="64" height="64" className="w-16 h-16 text-indigo-600 mb-4 block mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
);

export default function LoginView() {
    const { login } = useAuth(); // Usamos la función del contexto
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        const result = await login(email, password);
        
        if (!result.success) {
            setErrorMsg(result.error);
            setLoading(false);
        }
        // Si es success, el AuthContext actualiza el estado 'user' y la App se renderiza sola
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
            <div className="z-10 w-full max-w-md px-6">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-8 pb-0 flex flex-col items-center text-center">
                        <div className="bg-indigo-50 p-4 rounded-full mb-4 inline-block"><LogoOrquesta /></div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Orquesta Manager</h1>
                        <p className="text-slate-500 text-sm mt-2">Acceso Administrativo</p>
                    </div>

                    <div className="p-8 pt-6">
                        {errorMsg && (
                            <div className="mb-6 p-3 rounded-lg text-sm flex items-center gap-2 bg-red-50 text-red-600 border border-red-100">
                                <IconAlertCircle size={16}/> {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                                <input 
                                    type="email" 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium" 
                                    placeholder="nombre@orquesta.com" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Clave de Acceso</label>
                                <input 
                                    type="password" 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium" 
                                    placeholder="••••••••" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    required 
                                />
                            </div>

                            <button disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                {loading ? <IconLoader className="animate-spin" size={18}/> : 'Ingresar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}