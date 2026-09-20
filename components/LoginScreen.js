// Komponen Layar Login Portal Amil WIZ Berau
// Versi Stabil + Proteksi Hooks React + Loading Verifikasi Server Langsung

const { useState } = React;

const LoginScreen = ({ onLogin, amilsData = [], darkMode, setDarkMode, onRefresh, isRefreshing }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Fallback komponen Button yang aman
    const Btn = typeof Button !== 'undefined' ? Button : (typeof window !== 'undefined' && window.Button ? window.Button : null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanEmail = String(email || '').trim();
        const cleanPassword = String(password || '').trim();

        if (!cleanEmail || !cleanPassword) {
            setError('Silakan lengkapi email dan kata sandi.');
            return;
        }

        setIsLoggingIn(true);
        setError('');

        try {
            if (typeof onLogin === 'function') {
                await onLogin(cleanEmail, cleanPassword, setError);
            }
        } catch (err) {
            console.error("Login error:", err);
            setError('Terjadi kendala koneksi saat memverifikasi akun.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-wiz-light dark:bg-gray-900 transition-colors duration-200">
            {/* Ornamen Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-wiz-green/10 dark:bg-wiz-green/20 blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-wiz-orange/10 dark:bg-wiz-orange/20 blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md p-4 relative z-10 slide-up">
                <div className="bg-white/85 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-3xl p-7 sm:p-8 border border-white/60 dark:border-gray-700">
                    
                    {/* Header Logo */}
                    <div className="flex flex-col items-center mb-7">
                        <div className="flex items-center justify-center mb-5">
                            <img 
                                src="https://drive.google.com/uc?id=1TcpcZtGKBKAOBAthf6Rea4HHDZ0l9tBU" 
                                alt="Logo WIZ" 
                                className="h-14 object-contain"
                                onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
                            />
                            <div style={{display: 'none'}} className="text-[2.75rem] font-black text-wiz-green dark:text-emerald-400 tracking-tighter">
                                WIZ<span className="text-wiz-orange">BERAU</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Portal Amil WIZ</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Masuk untuk mengelola data ZIS & Pundi WIZ Berau</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/60 p-3.5 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-xs font-semibold animate-in">
                                <i className="fa-solid fa-circle-exclamation text-sm mt-0.5 shrink-0"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Email Akses</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-envelope text-sm"></i>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoggingIn}
                                    required
                                    autoComplete="email"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-wiz-green/20 focus:border-wiz-green focus:bg-white dark:focus:bg-gray-700 transition-all outline-none disabled:opacity-60 font-medium"
                                    placeholder="nama@wiz.or.id"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Kata Sandi</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-lock text-sm"></i>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoggingIn}
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-wiz-green/20 focus:border-wiz-green focus:bg-white dark:focus:bg-gray-700 transition-all outline-none disabled:opacity-60 font-medium"
                                    placeholder="••••••••"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoggingIn}
                                        className="p-2 text-gray-400 hover:text-wiz-green dark:hover:text-emerald-400 focus:outline-none transition-colors rounded-lg disabled:opacity-50"
                                        title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            {Btn ? (
                                <Btn 
                                    type="submit" 
                                    variant="accent" 
                                    disabled={isLoggingIn} 
                                    className="w-full py-3.5 text-sm font-bold shadow-lg shadow-wiz-orange/25"
                                >
                                    {isLoggingIn ? (
                                        <span><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memverifikasi Akun...</span>
                                    ) : (
                                        <span>Masuk ke Dashboard <i className="fa-solid fa-arrow-right-to-bracket ml-1.5"></i></span>
                                    )}
                                </Btn>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoggingIn}
                                    className="w-full py-3.5 px-4 bg-gradient-to-r from-wiz-orange to-[#fca545] hover:from-wiz-orange_dark hover:to-wiz-orange text-white font-bold rounded-xl shadow-lg shadow-wiz-orange/25 transition-all active:scale-95 disabled:opacity-60 text-sm flex items-center justify-center gap-2"
                                >
                                    {isLoggingIn ? (
                                        <span><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memverifikasi Akun...</span>
                                    ) : (
                                        <span>Masuk ke Dashboard <i className="fa-solid fa-arrow-right-to-bracket ml-1.5"></i></span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Tombol Segarkan & Mode Malam */}
                        <div className="flex items-center justify-center gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700/70">
                            <button
                                type="button"
                                onClick={onRefresh}
                                disabled={isRefreshing || isLoggingIn}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 dark:bg-gray-700/60 hover:bg-wiz-green/10 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-gray-600 hover:border-wiz-green/30 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-wiz-green dark:hover:text-emerald-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                title="Segarkan Data Server"
                            >
                                <i className={`fa-solid fa-rotate text-xs ${isRefreshing ? 'fa-spin text-wiz-green dark:text-emerald-400' : ''}`}></i>
                                <span>{isRefreshing ? 'Sinkron...' : 'Segarkan'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDarkMode(!darkMode)}
                                disabled={isLoggingIn}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 dark:bg-gray-700/60 hover:bg-wiz-orange/10 dark:hover:bg-amber-950/40 border border-gray-200 dark:border-gray-600 hover:border-wiz-orange/30 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-wiz-orange dark:hover:text-amber-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                title={darkMode ? "Mode Terang" : "Mode Gelap"}
                            >
                                <i className={`fa-solid ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-gray-500 dark:text-gray-400'} text-xs`}></i>
                                <span>{darkMode ? 'Terang' : 'Malam'}</span>
                            </button>
                        </div>
                    </form>
                </div>
                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-5 font-medium tracking-wide uppercase">
                    &copy; 2026 Wahdah Inspirasi Zakat Berau
                </p>
            </div>
        </div>
    );
};

if (typeof window !== 'undefined') {
    window.LoginScreen = LoginScreen;
}
