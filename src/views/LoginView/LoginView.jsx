import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
    IconLoader, 
    IconAlertCircle, 
    IconCheck, 
    IconArrowLeft, 
    IconEye,      // <--- Asegúrate de haberlos agregado a Icons.jsx
    IconEyeOff    // <--- Asegúrate de haberlos agregado a Icons.jsx
} from '../../components/ui/Icons';

const LogoOrquesta = () => (
    <svg width="64" height="64" className="w-16 h-16 text-indigo-600 mb-4 block mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
);

export default function LoginView() {
    const { login, recoverPassword, changePassword } = useAuth();
    
    // Estados de vista: 'LOGIN', 'FORGOT', 'CHANGE'
    const [viewMode, setViewMode] = useState('LOGIN');
    
    // Inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Inputs específicos Cambio de Clave
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [showPassword, setShowPassword] = useState(false); // Toggle para ver clave

    // Helper para resetear estados al cambiar de vista
    const switchView = (mode) => {
        setMsg({ type: '', text: '' });
        setViewMode(mode);
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPassword(false);
    };

    // --- MANEJO DEL LOGIN ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ type: '', text: '' });

        const result = await login(email, password);
        if (!result.success) {
            setMsg({ type: 'error', text: result.error });
            setLoading(false);
        }
    };

    // --- MANEJO DE RECUPERACIÓN ---
    const handleRecover = async (e) => {
        e.preventDefault();
        if (!email) return setMsg({ type: 'error', text: 'Ingresa tu email primero.' });
        
        setLoading(true);
        setMsg({ type: '', text: '' });

        const result = await recoverPassword(email);
        setLoading(false);

        if (result.success) {
            // SIMULACIÓN DE EMAIL
            alert(`[DEV MODE - EMAIL SIMULADO]\n\nHola ${result.userName}.\nTu clave temporal es: ${result.tempPass}`);
            setMsg({ type: 'success', text: 'Revisa tu correo (alerta simulada) para ver la clave temporal.' });
            setTimeout(() => switchView('LOGIN'), 3000);
        } else {
            setMsg({ type: 'error', text: result.error });
        }
    };

    // --- MANEJO DE CAMBIO DE CLAVE ---
    const handleChangePass = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });

        if (newPassword.length < 4) {
            return setMsg({ type: 'error', text: 'La nueva contraseña es muy corta.' });
        }
        if (newPassword !== confirmNewPassword) {
            return setMsg({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
        }

        setLoading(true);
        const result = await changePassword(email, password, newPassword);
        setLoading(false);

        if (result.success) {
            setMsg({ type: 'success', text: '¡Contraseña actualizada! Inicia sesión ahora.' });
            setTimeout(() => switchView('LOGIN'), 2000);
        } else {
            setMsg({ type: 'error', text: result.error });
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
            <div className="z-10 w-full max-w-md px-6">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative">
                    
                    {/* Header */}
                    <div className="p-8 pb-0 flex flex-col items-center text-center">
                        <div className="bg-indigo-50 p-4 rounded-full mb-4 inline-block"><LogoOrquesta /></div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Orquesta Manager</h1>
                        <p className="text-slate-500 text-sm mt-2">
                            {viewMode === 'LOGIN' && 'Acceso Administrativo'}
                            {viewMode === 'FORGOT' && 'Recuperar Acceso'}
                            {viewMode === 'CHANGE' && 'Cambiar Contraseña'}
                        </p>
                    </div>

                    <div className="p-8 pt-6">
                        {/* Mensajes */}
                        {msg.text && (
                            <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 border ${
                                msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                                {msg.type === 'error' ? <IconAlertCircle size={16}/> : <IconCheck size={16}/>} 
                                {msg.text}
                            </div>
                        )}

                        {/* --- VISTA LOGIN --- */}
                        {viewMode === 'LOGIN' && (
                            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
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
                                    <div className="flex justify-between items-center mb-1.5 ml-1">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clave de Acceso</label>
                                        <button type="button" onClick={() => switchView('FORGOT')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                                            ¿Olvidaste tu clave?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium pr-10" 
                                            placeholder="••••••••" 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <button disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                    {loading ? <IconLoader className="animate-spin" size={18}/> : 'Ingresar'}
                                </button>

                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => switchView('CHANGE')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                        ¿Deseas cambiar tu contraseña?
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* --- VISTA OLVIDÉ CLAVE --- */}
                        {viewMode === 'FORGOT' && (
                            <form onSubmit={handleRecover} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <p className="text-xs text-slate-500 mb-4">Ingresa tu email y te enviaremos una clave temporal.</p>
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

                                <button disabled={loading} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                    {loading ? <IconLoader className="animate-spin" size={18}/> : 'Recuperar Contraseña'}
                                </button>

                                <button type="button" onClick={() => switchView('LOGIN')} className="w-full py-2 text-slate-500 text-sm hover:text-slate-800 flex items-center justify-center gap-2">
                                    <IconArrowLeft size={16}/> Volver al Login
                                </button>
                            </form>
                        )}

                        {/* --- VISTA CAMBIAR CLAVE --- */}
                        {viewMode === 'CHANGE' && (
                            <form onSubmit={handleChangePass} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <p className="text-xs text-slate-500 mb-4">Cambia tu contraseña actual por una nueva.</p>
                                
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium"
                                        placeholder="Tu email"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Contraseña Actual</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium pr-10" 
                                            placeholder="••••••••" 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                        />
                                         <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-2">
                                    <label className="block text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-1.5 ml-1">Nueva Contraseña</label>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium mb-3" 
                                        placeholder="Nueva clave" 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        required 
                                    />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 outline-none transition-all text-slate-700 font-medium ${
                                            confirmNewPassword && newPassword !== confirmNewPassword 
                                            ? 'border-red-200 focus:border-red-500 focus:ring-red-200' 
                                            : 'border-indigo-100 focus:border-indigo-500 focus:ring-indigo-500/20'
                                        }`}
                                        placeholder="Repetir nueva clave" 
                                        value={confirmNewPassword} 
                                        onChange={e => setConfirmNewPassword(e.target.value)} 
                                        required 
                                    />
                                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                                        <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">Las contraseñas no coinciden</p>
                                    )}
                                </div>

                                <button disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                    {loading ? <IconLoader className="animate-spin" size={18}/> : 'Confirmar Cambio'}
                                </button>

                                <button type="button" onClick={() => switchView('LOGIN')} className="w-full py-2 text-slate-500 text-sm hover:text-slate-800 flex items-center justify-center gap-2">
                                    <IconArrowLeft size={16}/> Volver al Login
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}