const { useState, useEffect, useMemo } = React;

const App = () => {
    const safeGetJSON = (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch(e) { return fallback; }
    };
    const safeSetJSON = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
    };
    const safeRemove = (key) => {
        try { localStorage.removeItem(key); } catch(e) {}
    };

    const [user, setUser] = useState(() => safeGetJSON('wiz_user_session', null));
    const [isInitializing, setIsInitializing] = useState(() => !safeGetJSON('wiz_user_session', null));
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        try { return localStorage.getItem('wiz_dark_mode') === 'true'; } catch(e) { return false; }
    });

    const [amils, setAmils] = useState(() => safeGetJSON('wiz_cache_Amil', typeof fallbackAmils !== 'undefined' ? fallbackAmils : []));
    const [contacts, setContacts] = useState(() => safeGetJSON('wiz_cache_Kontak', []));
    const [programs, setPrograms] = useState(() => safeGetJSON('wiz_cache_Program', []));
    const [donations, setDonations] = useState(() => safeGetJSON('wiz_cache_Donasi', []));
    const [tasks, setTasks] = useState(() => safeGetJSON('wiz_cache_Tugas', []));
    const [pundis, setPundis] = useState(() => safeGetJSON('wiz_cache_Pundi', []));
    const [riwayatPundis, setRiwayatPundis] = useState(() => safeGetJSON('wiz_cache_RiwayatPundi', []));

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            try { localStorage.setItem('wiz_dark_mode', 'true'); } catch(e) {}
        } else {
            document.documentElement.classList.remove('dark');
            try { localStorage.setItem('wiz_dark_mode', 'false'); } catch(e) {}
        }
    }, [darkMode]);

    const fetchAllData = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        try {
            const url = typeof API_URL !== 'undefined' ? API_URL : '';
            if (!url) return;
            const res = await fetch(url);
            const result = await res.json();
            if (result.status === 'success' && result.data) {
                const d = result.data;
                if (d.Amil && d.Amil.length > 0) {
                    setAmils(d.Amil);
                    safeSetJSON('wiz_cache_Amil', d.Amil);
                    const savedSession = safeGetJSON('wiz_user_session', null);
                    if (savedSession) {
                        const found = d.Amil.find(a => String(a.email).toLowerCase() === String(savedSession.email).toLowerCase());
                        if (found && String(found.status || '').toLowerCase() === 'aktif') {
                            setUser(found);
                            safeSetJSON('wiz_user_session', found);
                        }
                    }
                }
                if (d.Kontak) { setContacts(d.Kontak); safeSetJSON('wiz_cache_Kontak', d.Kontak); }
                if (d.Program) { setPrograms(d.Program); safeSetJSON('wiz_cache_Program', d.Program); }
                if (d.Donasi) { setDonations(d.Donasi); safeSetJSON('wiz_cache_Donasi', d.Donasi); }
                if (d.Tugas) { setTasks(d.Tugas); safeSetJSON('wiz_cache_Tugas', d.Tugas); }
                if (d.Pundi) { setPundis(d.Pundi); safeSetJSON('wiz_cache_Pundi', d.Pundi); }
                if (d.RiwayatPundi) { setRiwayatPundis(d.RiwayatPundi); safeSetJSON('wiz_cache_RiwayatPundi', d.RiwayatPundi); }
                setIsOfflineMode(false);
            }
        } catch(e) {
            setIsOfflineMode(true);
        } finally {
            setIsInitializing(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    const handleLogin = (email, password, setError) => {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanPassword = String(password || '').trim();

        const foundUser = (amils || []).find(a => {
            return String(a.email || '').trim().toLowerCase() === cleanEmail && String(a.password || '').trim() === cleanPassword;
        });

        if (foundUser) {
            if (String(foundUser.status || '').toLowerCase() !== 'aktif') {
                return setError('Akses ditolak: Akun non-aktif.');
            }
            safeSetJSON('wiz_user_session', foundUser);
            setUser(foundUser);
            setError('');
        } else {
            setError('Email atau kata sandi tidak valid.');
        }
    };

    const handleLogout = () => {
        safeRemove('wiz_user_session');
        setUser(null);
    };

    const syncDataToSheet = async (sheetName, newData) => {
        safeSetJSON('wiz_cache_' + sheetName, newData);
        try {
            const url = typeof API_URL !== 'undefined' ? API_URL : '';
            if (url) {
                await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'syncData', sheetName, data: newData }) });
            }
        } catch(e) { setIsOfflineMode(true); }
    };

    if (isInitializing) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-wiz-light dark:bg-gray-900">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-wiz-green mb-3"></i>
                <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">Menyiapkan Workspace WIZ...</h3>
            </div>
        );
    }

    if (!user) {
        const LoginScreenComponent = window.LoginScreen || (typeof LoginScreen !== 'undefined' ? LoginScreen : null);
        if (LoginScreenComponent) {
            return (
                <LoginScreenComponent 
                    onLogin={handleLogin} 
                    amilsData={amils} 
                    darkMode={darkMode} 
                    setDarkMode={setDarkMode} 
                    onRefresh={() => fetchAllData(true)} 
                    isRefreshing={isRefreshing} 
                />
            );
        }
        return <div className="p-8 text-center text-sm">Memuat form login...</div>;
    }

    const isAdmin = String(user.role || '').toLowerCase() === 'admin';
    const navItems = [
        { id: 'dashboard', label: 'Beranda Utama', icon: 'fa-solid fa-border-all' },
        { id: 'pundi', label: 'Manajemen Pundi', icon: 'fa-solid fa-box-open' },
        { id: 'scanner', label: 'Pindai QR Pundi', icon: 'fa-solid fa-qrcode', badge: 'Kamera' },
        { id: 'donatur_donasi', label: 'Donatur & Donasi', icon: 'fa-solid fa-hand-holding-heart' }
    ];

    return (
        <div className="flex h-screen bg-wiz-light dark:bg-gray-900 overflow-hidden">
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}
            
            {/* SIDEBAR DESKTOP & MOBILE DRAWER */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col transition-transform duration-200 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 text-center font-black text-xl text-wiz-green">
                    WIZ<span className="text-wiz-orange">BERAU</span>
                </div>
                
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                activeTab === item.id 
                                    ? 'bg-wiz-green text-white shadow-md' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`${item.icon} w-5 text-center text-base`}></i>
                                <span>{item.label}</span>
                            </div>
                            {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase ${
                                    activeTab === item.id ? 'bg-white/20 text-white' : 'bg-wiz-orange/15 text-wiz-orange'
                                }`}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={handleLogout} className="w-full py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center justify-center gap-2">
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> Akhiri Sesi
                    </button>
                </div>
            </aside>

            {/* KONTEN UTAMA */}
            <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 lg:pb-0">
                {/* HEADER ATAS */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden text-gray-600 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setIsMobileMenuOpen(true)}>
                            <i className="fa-solid fa-bars text-xl"></i>
                        </button>
                        <h2 className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-100 capitalize">
                            {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Tombol Pintas Kamera Langsung di Header */}
                        <button 
                            onClick={() => setActiveTab('scanner')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                                activeTab === 'scanner'
                                    ? 'bg-wiz-green text-white border-wiz-green shadow-md'
                                    : 'bg-wiz-green/10 hover:bg-wiz-green text-wiz-green hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 border-wiz-green/30'
                            }`}
                            title="Buka Kamera Scan QR"
                        >
                            <i className="fa-solid fa-qrcode text-sm"></i>
                            <span className="hidden sm:inline">Scan QR</span>
                        </button>

                        <button 
                            onClick={() => setDarkMode(!darkMode)} 
                            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            title={darkMode ? "Mode Terang" : "Mode Gelap"}
                        >
                            <i className={`fa-solid ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon'}`}></i>
                        </button>

                        <div className="text-right text-xs pl-1">
                            <p className="font-bold text-gray-800 dark:text-gray-100 truncate max-w-[120px]">{user.name}</p>
                            <p className="text-wiz-orange uppercase font-bold text-[10px]">{user.role}</p>
                        </div>
                    </div>
                </header>

                {/* AREA TAMPILAN VIEW */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto pb-12">
                        {/* Tab 1: Dashboard Utama */}
                        {activeTab === 'dashboard' && (
                            window.DashboardView ? (
                                <window.DashboardView data={{ programs, donations, tasks, amils, pundis, riwayatPundis, contacts }} darkMode={darkMode} />
                            ) : typeof DashboardView !== 'undefined' ? (
                                <DashboardView data={{ programs, donations, tasks, amils, pundis, riwayatPundis, contacts }} darkMode={darkMode} />
                            ) : null
                        )}

                        {/* Tab 2: Manajemen Pundi */}
                        {activeTab === 'pundi' && (
                            window.PundiView ? (
                                <window.PundiView
                                    pundis={pundis} setPundis={setPundis}
                                    riwayatPundis={riwayatPundis} setRiwayatPundis={setRiwayatPundis}
                                    contacts={contacts} programs={programs}
                                    user={user} syncDataToSheet={syncDataToSheet}
                                    darkMode={darkMode} amils={amils} setActiveTab={setActiveTab}
                                />
                            ) : typeof PundiView !== 'undefined' ? (
                                <PundiView
                                    pundis={pundis} setPundis={setPundis}
                                    riwayatPundis={riwayatPundis} setRiwayatPundis={setRiwayatPundis}
                                    contacts={contacts} programs={programs}
                                    user={user} syncDataToSheet={syncDataToSheet}
                                    darkMode={darkMode} amils={amils} setActiveTab={setActiveTab}
                                />
                            ) : null
                        )}

                        {/* Tab 3: Pindai QR Scanner */}
                        {activeTab === 'scanner' && (
                            window.ScannerView ? (
                                <window.ScannerView
                                    pundis={pundis} riwayatPundis={riwayatPundis}
                                    setRiwayatPundis={setRiwayatPundis}
                                    user={user} syncDataToSheet={syncDataToSheet} setActiveTab={setActiveTab}
                                />
                            ) : typeof ScannerView !== 'undefined' ? (
                                <ScannerView
                                    pundis={pundis} riwayatPundis={riwayatPundis}
                                    setRiwayatPundis={setRiwayatPundis}
                                    user={user} syncDataToSheet={syncDataToSheet} setActiveTab={setActiveTab}
                                />
                            ) : (
                                <div className="p-8 text-center text-gray-500">Memuat Pemindai QR...</div>
                            )
                        )}

                        {/* Tab 4: Donatur & Donasi */}
                        {activeTab === 'donatur_donasi' && (
                            window.DonaturDanDonasiView ? (
                                <window.DonaturDanDonasiView
                                    contactConfig={{ title: 'Kontak', data: contacts, onSave: (d) => syncDataToSheet('Kontak', [...contacts, d]) }}
                                    donationConfig={{ title: 'Donasi', data: donations, onSave: (d) => syncDataToSheet('Donasi', [...donations, d]) }}
                                    isAdmin={isAdmin}
                                />
                            ) : typeof DonaturDanDonasiView !== 'undefined' ? (
                                <DonaturDanDonasiView
                                    contactConfig={{ title: 'Kontak', data: contacts, onSave: (d) => syncDataToSheet('Kontak', [...contacts, d]) }}
                                    donationConfig={{ title: 'Donasi', data: donations, onSave: (d) => syncDataToSheet('Donasi', [...donations, d]) }}
                                    isAdmin={isAdmin}
                                />
                            ) : null
                        )}
                    </div>
                </div>

                {/* BOTTOM NAVIGATION KHUSUS HP (MUDAH DIJANGKAU JARI) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center justify-around shadow-lg">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold ${
                            activeTab === 'dashboard' ? 'text-wiz-green' : 'text-gray-400 dark:text-gray-400'
                        }`}
                    >
                        <i className="fa-solid fa-border-all text-base mb-0.5"></i>
                        <span>Beranda</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('pundi')}
                        className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold ${
                            activeTab === 'pundi' ? 'text-wiz-green' : 'text-gray-400 dark:text-gray-400'
                        }`}
                    >
                        <i className="fa-solid fa-box-open text-base mb-0.5"></i>
                        <span>Pundi</span>
                    </button>

                    {/* Tombol Kamera di Tengah (Besar & Menonjol) */}
                    <button
                        onClick={() => setActiveTab('scanner')}
                        className="flex flex-col items-center -mt-5"
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                            activeTab === 'scanner' ? 'bg-wiz-orange shadow-wiz-orange/40 ring-4 ring-orange-200 dark:ring-orange-950' : 'bg-wiz-green shadow-wiz-green/40 ring-4 ring-emerald-100 dark:ring-emerald-950'
                        }`}>
                            <i className="fa-solid fa-qrcode text-xl"></i>
                        </div>
                        <span className={`text-[10px] font-black mt-1 ${activeTab === 'scanner' ? 'text-wiz-orange' : 'text-wiz-green'}`}>
                            Scan QR
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('donatur_donasi')}
                        className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold ${
                            activeTab === 'donatur_donasi' ? 'text-wiz-green' : 'text-gray-400 dark:text-gray-400'
                        }`}
                    >
                        <i className="fa-solid fa-hand-holding-dollar text-base mb-0.5"></i>
                        <span>Donasi</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
