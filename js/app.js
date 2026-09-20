// Controller Utama Aplikasi CRM WIZ Berau (Autentikasi Cepat & Penyaringan Data Amil vs Admin)

const { useState, useEffect, useMemo, useRef } = React;

const App = () => {
    const safeGetJSON = (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch(e) {
            return fallback;
        }
    };
    const safeSetJSON = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch(e) {}
    };
    const safeRemove = (key) => {
        try {
            localStorage.removeItem(key);
        } catch(e) {}
    };

    const [user, setUser] = useState(() => safeGetJSON('wiz_user_session', null));
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem('wiz_dark_mode') === 'true';
        } catch(e) { return false; }
    });
    
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ old: '', new: '' });
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');
    
    const [deletePrompt, setDeletePrompt] = useState(null);
    const [viewImage, setViewImage] = useState(null);

    // Muat data dari cache lokal untuk membuka aplikasi seketika (< 0.5 detik)
    const [amils, setAmils] = useState(() => safeGetJSON('wiz_cache_Amil', typeof fallbackAmils !== 'undefined' ? fallbackAmils : (typeof window !== 'undefined' && window.fallbackAmils ? window.fallbackAmils : [])));
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

    // Sinkronisasi data latar belakang dari Google Apps Script
    const fetchAllData = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        try {
            const targetUrl = typeof API_URL !== 'undefined' ? API_URL : (typeof window !== 'undefined' ? window.API_URL : '');
            if (!targetUrl) return;

            const res = await fetch(targetUrl);
            const result = await res.json();
            if (result.status === 'success' && result.data) {
                const d = result.data;
                if (Array.isArray(d.Amil) && d.Amil.length > 0) {
                    setAmils(d.Amil);
                    safeSetJSON('wiz_cache_Amil', d.Amil);
                    
                    const savedSession = safeGetJSON('wiz_user_session', null);
                    if (savedSession) {
                        const foundUser = d.Amil.find(a => String(a.email).toLowerCase() === String(savedSession.email).toLowerCase());
                        if (foundUser && foundUser.status === 'Aktif') {
                            setUser(foundUser);
                            safeSetJSON('wiz_user_session', foundUser);
                        } else if (foundUser && foundUser.status !== 'Aktif') {
                            handleLogout();
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
            } else { 
                setIsOfflineMode(true); 
            }
        } catch (err) {
            console.error("Gagal sinkron data awan:", err);
            setIsOfflineMode(true);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    // Autentikasi Cerdas: Cek di memori lokal, jika belum ada langsung fetch dari server online
    const handleLogin = async (email, password, setError) => {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanPassword = String(password || '').trim();

        let currentAmils = Array.isArray(amils) && amils.length > 0 ? amils : (typeof window !== 'undefined' && window.fallbackAmils ? window.fallbackAmils : []);

        let foundUser = currentAmils.find(a => {
            const amilEmail = String(a.email || '').trim().toLowerCase();
            const amilPass = String(a.password || '').trim();
            return amilEmail === cleanEmail && amilPass === cleanPassword;
        });

        // Jika tidak ditemukan di data cache, ambil langsung dari server Google Sheets secara instan
        if (!foundUser) {
            try {
                const targetUrl = typeof API_URL !== 'undefined' ? API_URL : (typeof window !== 'undefined' ? window.API_URL : '');
                if (targetUrl) {
                    const res = await fetch(targetUrl);
                    const result = await res.json();
                    if (result.status === 'success' && result.data && Array.isArray(result.data.Amil)) {
                        currentAmils = result.data.Amil;
                        setAmils(currentAmils);
                        safeSetJSON('wiz_cache_Amil', currentAmils);

                        if (result.data.Kontak) { setContacts(result.data.Kontak); safeSetJSON('wiz_cache_Kontak', result.data.Kontak); }
                        if (result.data.Program) { setPrograms(result.data.Program); safeSetJSON('wiz_cache_Program', result.data.Program); }
                        if (result.data.Donasi) { setDonations(result.data.Donasi); safeSetJSON('wiz_cache_Donasi', result.data.Donasi); }
                        if (result.data.Tugas) { setTasks(result.data.Tugas); safeSetJSON('wiz_cache_Tugas', result.data.Tugas); }
                        if (result.data.Pundi) { setPundis(result.data.Pundi); safeSetJSON('wiz_cache_Pundi', result.data.Pundi); }
                        if (result.data.RiwayatPundi) { setRiwayatPundis(result.data.RiwayatPundi); safeSetJSON('wiz_cache_RiwayatPundi', result.data.RiwayatPundi); }

                        foundUser = currentAmils.find(a => {
                            const amilEmail = String(a.email || '').trim().toLowerCase();
                            const amilPass = String(a.password || '').trim();
                            return amilEmail === cleanEmail && amilPass === cleanPassword;
                        });
                    }
                }
            } catch (err) {
                console.error("Gagal verifikasi online:", err);
            }
        }

        if (foundUser) {
            if (String(foundUser.status || '').trim().toLowerCase() !== 'aktif') {
                return setError('Akses ditolak: Akun non-aktif atau diblokir.');
            }
            safeSetJSON('wiz_user_session', foundUser);
            safeSetJSON('wiz_user_email', cleanEmail);
            setUser(foundUser);
            setError('');
        } else {
            setError('Email atau kata sandi tidak cocok. Pastikan data akun benar.');
        }
    };

    const handleLogout = () => {
        safeRemove('wiz_user_session');
        safeRemove('wiz_user_email');
        setUser(null);
    };

    const syncDataToSheet = async (sheetName, newData) => {
        safeSetJSON('wiz_cache_' + sheetName, newData);
        try {
            const targetUrl = typeof API_URL !== 'undefined' ? API_URL : (typeof window !== 'undefined' ? window.API_URL : '');
            if (targetUrl) {
                await fetch(targetUrl, { method: 'POST', body: JSON.stringify({ action: 'syncData', sheetName, data: newData }) });
            }
        } catch(err) { setIsOfflineMode(true); }
    };

    const handleChangePassword = (e) => {
        e.preventDefault();
        setPwdError(''); setPwdSuccess('');
        if (String(passwordForm.old) !== String(user.password)) return setPwdError('Sandi lama salah.');
        if (passwordForm.new.length < 6) return setPwdError('Sandi baru minimal 6 karakter.');

        const newAmilsData = amils.map(a => a.id === user.id ? { ...a, password: passwordForm.new } : a);
        const updatedUser = { ...user, password: passwordForm.new };
        setAmils(newAmilsData);
        setUser(updatedUser);
        safeSetJSON('wiz_user_session', updatedUser);
        safeSetJSON('wiz_cache_Amil', newAmilsData);
        syncDataToSheet('Amil', newAmilsData);
        setPwdSuccess('Kata sandi diperbarui.');
        setTimeout(() => { setIsPasswordModalOpen(false); setPasswordForm({ old: '', new: '' }); setPwdSuccess(''); }, 1500);
    };

    const createSaveHandler = (setter, state, sheetName) => (data, isEdit) => {
        let newDataToSave = { ...data };
        if (!isEdit && sheetName === 'Kontak' && user) newDataToSave.createdBy = user.name;
        if (!isEdit && sheetName === 'Donasi' && user && !newDataToSave.amilName) newDataToSave.amilName = user.name;
        let newData = isEdit ? state.map(item => item.id === newDataToSave.id ? newDataToSave : item) : [...state, newDataToSave];
        setter(newData);
        safeSetJSON('wiz_cache_' + sheetName, newData);
        syncDataToSheet(sheetName, newData);

        if (sheetName === 'Amil' && user && (newDataToSave.id === user.id || String(newDataToSave.email).toLowerCase() === String(user.email).toLowerCase())) {
            const updatedUser = { ...user, ...newDataToSave };
            setUser(updatedUser);
            safeSetJSON('wiz_user_session', updatedUser);
        }
    };

    const createDeleteHandler = (setter, state, sheetName) => (row) => setDeletePrompt({ row, setter, state, sheetName });

    const confirmDelete = () => {
        if(!deletePrompt) return;
        const { row, setter, state, sheetName } = deletePrompt;
        const newData = state.filter(item => item.id !== row.id);
        setter(newData);
        safeSetJSON('wiz_cache_' + sheetName, newData);
        syncDataToSheet(sheetName, newData);
        setDeletePrompt(null);
    };

    const isAdmin = user?.role === 'Admin';
    const currentUserName = user?.name || '';

    /* =========================================================================
       PENYARINGAN DATA KETAT:
       - JIKA ADMIN: Melihat seluruh data kolektif (Semua Amil).
       - JIKA AMIL BIASA: Hanya melihat data miliknya sendiri (Pundi, Donasi, Kontak, Tugas).
       ========================================================================= */
    const visibleContacts = useMemo(() => {
        if (isAdmin) return contacts;
        return (contacts || []).filter(c => c.createdBy === currentUserName);
    }, [contacts, isAdmin, currentUserName]);

    const visibleDonations = useMemo(() => {
        if (isAdmin) return donations;
        return (donations || []).filter(d => d.amilName === currentUserName);
    }, [donations, isAdmin, currentUserName]);

    const visibleTasks = useMemo(() => {
        if (isAdmin) return tasks;
        return (tasks || []).filter(t => t.assignedTo === currentUserName);
    }, [tasks, isAdmin, currentUserName]);

    const visiblePundis = useMemo(() => {
        if (isAdmin) return pundis;
        return (pundis || []).filter(p => {
            const creator = p.createdBy || (contacts || []).find(c => c.name === p.donorName)?.createdBy;
            return creator === currentUserName;
        });
    }, [pundis, isAdmin, currentUserName, contacts]);

    const visibleRiwayatPundis = useMemo(() => {
        if (isAdmin) return riwayatPundis;
        return (riwayatPundis || []).filter(r => r.amilName === currentUserName);
    }, [riwayatPundis, isAdmin, currentUserName]);

    const contactOptions = visibleContacts.map(c => c.name);

    // Kalkulasi Campaign
    const calculatedPrograms = useMemo(() => {
        const sourceRiwayat = isAdmin ? riwayatPundis : visibleRiwayatPundis;
        const sourceDonations = isAdmin ? donations : visibleDonations;

        const totalPundiCollected = (sourceRiwayat || [])
            .filter(r => r.status === 'Berhasil')
            .reduce((sum, r) => sum + Number(r.amount || 0), 0);

        return (programs || []).map(p => {
            const isPundiCampaign = (p.category && p.category.includes('Pundi')) || (p.name && p.name.toLowerCase().includes('pundi'));
            const isAmilSpecific = p.assignedAmil && p.assignedAmil !== 'Semua Amil (Target Kolektif)' && p.assignedAmil !== 'Semua Amil';
            
            const donationCollected = (sourceDonations || [])
                .filter(d => d.programName === p.name && d.status === 'Berhasil')
                .filter(d => !isAmilSpecific || d.amilName === p.assignedAmil)
                .reduce((sum, d) => sum + Number(d.amount || 0), 0);
                
            const pundiCollected = (sourceRiwayat || [])
                .filter(r => r.status === 'Berhasil')
                .filter(r => !isAmilSpecific || r.amilName === p.assignedAmil)
                .reduce((sum, r) => sum + Number(r.amount || 0), 0);

            const collected = isPundiCampaign ? (donationCollected + (isAmilSpecific ? pundiCollected : totalPundiCollected)) : donationCollected;
            return { ...p, collected, isPundiCampaign, isAmilSpecific };
        });
    }, [programs, donations, riwayatPundis, visibleDonations, visibleRiwayatPundis, isAdmin]);

    if (!user) {
        return (
            <LoginScreen 
                onLogin={handleLogin} 
                amilsData={amils} 
                darkMode={darkMode} 
                setDarkMode={setDarkMode} 
                onRefresh={() => fetchAllData(true)} 
                isRefreshing={isRefreshing} 
            />
        );
    }

    const handleSaveContact = (formData, isEdit) => {
        let newDataToSave = { ...formData };
        if (!isEdit && user) newDataToSave.createdBy = user.name;
        let newContacts = isEdit ? contacts.map(item => item.id === newDataToSave.id ? newDataToSave : item) : [...contacts, newDataToSave];
        setContacts(newContacts);
        syncDataToSheet('Kontak', newContacts);
    };

    const contactConfig = {
        title: 'Data Kontak Donatur', 
        data: visibleContacts,
        onSave: handleSaveContact, 
        onDelete: createDeleteHandler(setContacts, contacts, 'Kontak'),
        columns: [
            { key: 'name', label: 'Nama' },
            { key: 'phone', label: 'No. Telp / WA', render: r => <span className="font-medium text-gray-800 dark:text-gray-200">{r.phone}</span> },
            { key: 'sosmed', label: 'Media Sosial', render: r => (
                <div className="flex gap-3 text-lg">
                    {r.fb && String(r.fb).trim() !== '-' && <a href={String(r.fb).startsWith('http') ? r.fb : `https://facebook.com/${r.fb}`} target="_blank" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 transition-colors"><i className="fa-brands fa-facebook"></i></a>}
                    {r.ig && String(r.ig).trim() !== '-' && <a href={String(r.ig).startsWith('http') ? r.ig : `https://instagram.com/${r.ig}`} target="_blank" className="text-pink-500 hover:text-pink-700 dark:text-pink-400 transition-colors"><i className="fa-brands fa-instagram"></i></a>}
                    {r.tiktok && String(r.tiktok).trim() !== '-' && <a href={String(r.tiktok).startsWith('http') ? r.tiktok : `https://tiktok.com/@${r.tiktok}`} target="_blank" className="text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors"><i className="fa-brands fa-tiktok"></i></a>}
                </div>
            )},
            { key: 'address', label: 'Domisili', render: r => <span className="truncate max-w-[150px] inline-block text-gray-500 dark:text-gray-400">{r.address}</span> }
        ],
        schema: [
            { name: 'name', label: 'Nama Lengkap', required: true },
            { name: 'phone', label: 'No. HP Utama', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'fb', label: 'Link Facebook' },
            { name: 'ig', label: 'Link Instagram' },
            { name: 'tiktok', label: 'Link TikTok' },
            { name: 'address', label: 'Alamat Domisili', type: 'berau_address', fullWidth: true }
        ]
    };

    const programConfig = {
        title: 'Campaign WIZ BERAU', 
        data: calculatedPrograms,
        onSave: createSaveHandler(setPrograms, programs, 'Program'), 
        onDelete: createDeleteHandler(setPrograms, programs, 'Program'),
        columns: [
            { key: 'name', label: 'Nama Campaign', render: r => (
                <div>
                    <span className="font-bold text-gray-800 dark:text-gray-100">{r.name}</span>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">{r.category || 'Reguler'}</span>
                        {r.assignedAmil && r.assignedAmil !== 'Semua Amil' ? (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[11px] font-semibold rounded-md flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                                <i className="fa-solid fa-user-tag text-[10px]"></i> Amil: {r.assignedAmil}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-semibold rounded-md flex items-center gap-1">
                                <i className="fa-solid fa-users text-[10px]"></i> Semua Amil
                            </span>
                        )}
                    </div>
                </div>
            )},
            { key: 'target', label: 'Target', render: r => typeof formatRp === 'function' ? formatRp(r.target) : r.target },
            { key: 'collected', label: 'Terkumpul', render: r => (
                <div>
                    <span className="text-wiz-green dark:text-emerald-400 font-bold">{typeof formatRp === 'function' ? formatRp(r.collected) : r.collected}</span>
                    {r.target > 0 && (
                        <span className="ml-2 text-xs text-gray-400 font-medium">({Math.min(Math.round((r.collected / r.target) * 100), 100)}%)</span>
                    )}
                </div>
            )},
            { key: 'status', label: 'Status', render: r => <StatusBadge text={r.status} /> }
        ],
        schema: [
            { name: 'name', label: 'Nama Campaign / Program', required: true, fullWidth: true },
            { name: 'category', label: 'Kategori Program', type: 'select', options: ['Reguler (Donasi Umum)', 'Kemanusiaan', 'Pendidikan', 'Dakwah', 'Kesehatan'], required: true },
            { name: 'assignedAmil', label: 'Penanggung Jawab / Amil', type: 'select', options: ['Semua Amil', ...amils.map(a => a.name)], required: true },
            { name: 'target', label: 'Target Pendanaan', isCurrency: true, required: true },
            { name: 'deadline', label: 'Berakhir Pada', type: 'date', required: true },
            { name: 'status', label: 'Status Aktif', type: 'select', options: ['Aktif', 'Selesai', 'Dibatalkan'], required: true }
        ]
    };

    const donationConfig = {
        title: 'Data Penerimaan Donasi', 
        data: visibleDonations,
        defaultValues: { amilName: user?.name, date: new Date().toISOString().split('T')[0] },
        onSave: createSaveHandler(setDonations, donations, 'Donasi'), 
        onDelete: createDeleteHandler(setDonations, donations, 'Donasi'),
        columns: [
            { key: 'date', label: 'Tanggal', render: r => typeof formatDate === 'function' ? formatDate(r.date) : r.date },
            { key: 'donorName', label: 'Donatur', render: r => <span className="font-semibold">{r.donorName}</span> },
            { key: 'programName', label: 'Program' },
            { key: 'rekening', label: 'Bank' },
            { key: 'amount', label: 'Nominal', render: r => <span className="font-bold text-wiz-green dark:text-emerald-400 bg-wiz-green/5 dark:bg-wiz-green/20 px-2 py-1 rounded-md">{typeof formatRp === 'function' ? formatRp(r.amount) : r.amount}</span> },
            { key: 'status', label: 'Status', render: r => <StatusBadge text={r.status} /> },
            { key: 'amilName', label: 'PIC' },
            { key: 'receiptUrl', label: 'Bukti', render: r => {
                if (!r.receiptUrl || String(r.receiptUrl).trim() === '') return <span className="text-gray-300 dark:text-gray-600">-</span>;
                const directUrl = typeof getDirectImageUrl === 'function' ? getDirectImageUrl(r.receiptUrl) : r.receiptUrl;
                return (
                    <div className="relative group w-10 h-10">
                        <img 
                            src={directUrl} alt="Bukti" 
                            onClick={() => setViewImage({ direct: directUrl, original: r.receiptUrl })}
                            onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer group-hover:opacity-75 transition-opacity shadow-sm" 
                            title="Klik untuk perbesar"
                        />
                        <div 
                            style={{display: 'none'}} 
                            onClick={() => setViewImage({ direct: directUrl, original: r.receiptUrl })}
                            className="absolute inset-0 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-wiz-orange transition-colors"
                        >
                            <i className="fa-solid fa-expand text-lg"></i>
                        </div>
                    </div>
                );
            }}
        ],
        schema: [
            { name: 'donorName', label: 'Donatur Hamba Allah', type: 'select', options: contactOptions, required: true },
            { name: 'programName', label: 'Tujuan Program', type: 'select', options: programs.map(p => p.name), required: true },
            { name: 'rekening', label: 'Bank / Metode', type: 'select', options: ['BSI', 'Muamalat', 'QRIS', 'Tunai', 'Lainnya'], required: true },
            { name: 'amount', label: 'Nominal', isCurrency: true, required: true },
            { name: 'date', label: 'Tanggal Bayar', type: 'date', required: true },
            { name: 'status', label: 'Status Transfer', type: 'select', options: ['Berhasil', 'Menunggu Validasi', 'Gagal'], required: true },
            { name: 'amilName', label: 'PIC Amil', type: 'select', options: isAdmin ? amils.map(a => a.name) : [user?.name], required: true },
            { name: 'receiptUrl', label: 'Bukti Validasi (Opsional)', type: 'file', fullWidth: true }
        ]
    };

    const taskConfig = {
        title: 'Tugas Operasional', 
        data: visibleTasks,
        onSave: createSaveHandler(setTasks, tasks, 'Tugas'), 
        onDelete: createDeleteHandler(setTasks, tasks, 'Tugas'),
        columns: [
            { key: 'name', label: 'Uraian Tugas', render: r => <span className="font-semibold text-gray-700 dark:text-gray-200">{r.name}</span> },
            { key: 'assignedTo', label: 'Pelaksana' },
            { key: 'period', label: 'Siklus', render: r => <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-600 dark:text-gray-300">{r.period}</span> },
            { key: 'deadline', label: 'Batas', render: r => typeof formatDate === 'function' ? formatDate(r.deadline) : r.deadline },
            { key: 'status', label: 'Progress', render: r => <StatusBadge text={r.status} /> }
        ],
        schema: [
            { name: 'name', label: 'Deskripsi Pekerjaan', required: true, fullWidth: true },
            { name: 'assignedTo', label: 'Bebankan Kepada', type: 'select', options: amils.map(a => a.name), required: true },
            { name: 'period', label: 'Siklus Repetisi', type: 'select', options: ['Harian', 'Bulanan', 'Tahunan'], required: true },
            { name: 'deadline', label: 'Target Selesai', type: 'date', required: true },
            { name: 'status', label: 'Status Pengerjaan', type: 'select', options: ['Belum Selesai', 'Dalam Proses', 'Selesai'], required: true }
        ]
    };

    const amilConfig = {
        title: 'Pengaturan Akun Amil', 
        data: amils,
        onSave: createSaveHandler(setAmils, amils, 'Amil'), 
        onDelete: createDeleteHandler(setAmils, amils, 'Amil'),
        columns: [
            { 
                key: 'photoUrl', 
                label: 'Foto Profil', 
                render: r => {
                    const direct = typeof getDirectImageUrl === 'function' ? getDirectImageUrl(r.photoUrl) : r.photoUrl;
                    return (
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-wiz-green/10 text-wiz-green dark:text-emerald-400 flex items-center justify-center font-bold text-sm border-2 border-white dark:border-gray-700 shadow-sm">
                            {direct ? (
                                <img 
                                    src={direct} 
                                    alt={r.name} 
                                    className="w-full h-full object-cover cursor-pointer" 
                                    onClick={() => setViewImage ? setViewImage({ direct: direct, original: r.photoUrl }) : window.open(direct, '_blank')} 
                                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }} 
                                />
                            ) : null}
                            <span style={{ display: direct ? 'none' : 'block' }}>{r.name?.charAt(0) || 'A'}</span>
                        </div>
                    );
                }
            },
            { key: 'name', label: 'Nama Pengguna' },
            { key: 'email', label: 'Kredensial' },
            { key: 'role', label: 'Hak Akses', render: r => <span className={`font-bold ${r.role === 'Admin' ? 'text-wiz-orange dark:text-amber-400' : 'text-wiz-green dark:text-emerald-400'}`}>{r.role}</span> },
            { key: 'status', label: 'Status', render: r => <StatusBadge text={r.status} /> }
        ],
        schema: [
            { name: 'photoUrl', label: 'Foto Profil Amil (Upload)', type: 'file', fullWidth: true },
            { name: 'name', label: 'Nama Lengkap', required: true },
            { name: 'email', label: 'Email Akses', type: 'email', required: true },
            { name: 'password', label: 'Kata Sandi', required: true },
            { name: 'role', label: 'Hak Akses', type: 'select', options: ['Admin', 'Amil'], required: true },
            { name: 'status', label: 'Status Akun', type: 'select', options: ['Aktif', 'Nonaktif'], required: true }
        ]
    };

    const navItems = [
        { id: 'dashboard', label: 'Beranda Utama', icon: 'fa-solid fa-border-all' },
        { id: 'pundi', label: 'Manajemen Pundi', icon: 'fa-solid fa-box-open' },
        { id: 'scanner', label: 'Pindai QR Pundi', icon: 'fa-solid fa-qrcode' },
        { id: 'donatur_donasi', label: 'Donatur & Penerimaan', icon: 'fa-solid fa-hand-holding-heart' },
        { id: 'program', label: 'Campaign WIZ', icon: 'fa-solid fa-boxes-packing' },
        { id: 'tugas', label: 'Penugasan', icon: 'fa-solid fa-clipboard-check' },
    ];
    if (isAdmin) navItems.push({ id: 'amil', label: 'Pengaturan Sistem', icon: 'fa-solid fa-gear' });

    return (
        <div className="flex h-screen bg-wiz-light dark:bg-gray-900 overflow-hidden transition-colors duration-200">
            {isMobileMenuOpen && <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            
            {/* SIDEBAR DESKTOP */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
                <div className="px-6 py-8 flex items-center justify-center">
                    <img 
                        src="https://drive.google.com/uc?id=1TcpcZtGKBKAOBAthf6Rea4HHDZ0l9tBU" 
                        alt="Logo WIZ" 
                        className="h-10 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
                    />
                    <div style={{display: 'none'}} className="text-3xl font-black text-wiz-green dark:text-emerald-400 tracking-tighter">WIZ<span className="text-wiz-orange">BERAU</span></div>
                </div>
                
                <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                    <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 mt-2">Menu Navigasi</p>
                    {navItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 text-[14px] font-semibold
                                ${isActive ? 'bg-gradient-to-r from-wiz-green to-[#2e8870] text-white shadow-lg shadow-wiz-green/30 translate-x-1' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-wiz-green/5 dark:hover:bg-gray-700/60 hover:text-wiz-green dark:hover:text-emerald-400'}`}>
                                <i className={`${item.icon} w-5 text-center ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}></i> 
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-5 border-t border-gray-50 dark:border-gray-700">
                    {isOfflineMode && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-semibold mb-3 border border-red-100 dark:border-red-800/50">
                            <i className="fa-solid fa-wifi"></i> Luring / Offline
                        </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 border border-transparent hover:border-red-100 dark:hover:border-red-900/50">
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> Akhiri Sesi
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                            <i className="fa-solid fa-bars-staggered text-xl"></i>
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 capitalize leading-tight">{activeTab === 'amil' ? 'Pengaturan Sistem' : activeTab === 'donatur_donasi' ? 'Donatur & Penerimaan' : activeTab}</h2>
                            <p className="text-xs text-gray-400 font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button 
                            onClick={() => setDarkMode(!darkMode)} 
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-wiz-orange dark:hover:text-yellow-400 hover:bg-wiz-orange/10 dark:hover:bg-gray-700 rounded-full transition-all border border-transparent hover:border-wiz-orange/20"
                            title={darkMode ? "Mode Terang" : "Mode Gelap"}
                        >
                            <i className={`fa-solid ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon'} text-lg`}></i>
                        </button>

                        <button 
                            onClick={() => fetchAllData(true)} 
                            disabled={isRefreshing}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-wiz-green dark:hover:text-emerald-400 hover:bg-wiz-green/10 dark:hover:bg-gray-700 rounded-full transition-all border border-transparent hover:border-wiz-green/20"
                            title="Sinkronisasi Data"
                        >
                            <i className={`fa-solid fa-rotate text-lg ${isRefreshing ? 'fa-spin text-wiz-green dark:text-emerald-400' : ''}`}></i>
                        </button>
                        
                        <div className="relative group cursor-pointer">
                            <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-gray-200 dark:border-gray-700">
                                <div className="hidden sm:block text-right">
                                    <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{user.name}</p>
                                    <p className="text-[11px] font-semibold text-wiz-orange dark:text-amber-400 uppercase tracking-wide">{user.role}</p>
                                </div>
                                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-wiz-green to-[#2e8870] flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-gray-700 overflow-hidden">
                                    {user.photoUrl ? (
                                        <img 
                                            src={typeof getDirectImageUrl === 'function' ? getDirectImageUrl(user.photoUrl) : user.photoUrl} 
                                            alt={user.name} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }} 
                                        />
                                    ) : null}
                                    <span style={{ display: user.photoUrl ? 'none' : 'block' }}>
                                        {user.name?.charAt(0) || 'A'}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 hidden group-hover:block z-50 transform origin-top-right transition-all">
                                <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700 mb-1 sm:hidden">
                                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{user.name}</p>
                                    <p className="text-[10px] text-wiz-orange uppercase">{user.role}</p>
                                </div>
                                <button onClick={() => setIsPasswordModalOpen(true)} className="w-full text-left px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-wiz-light dark:hover:bg-gray-700 hover:text-wiz-green dark:hover:text-emerald-400 transition-colors flex items-center gap-3">
                                    <i className="fa-solid fa-shield-halved"></i> Ganti Sandi
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto pb-28 sm:pb-28">
                        {/* Beranda: Menampilkan data tersaring untuk Amil, dan seluruh data untuk Admin */}
                        {activeTab === 'dashboard' && (
                            <DashboardView 
                                data={{ 
                                    programs, 
                                    donations: visibleDonations, 
                                    tasks: visibleTasks, 
                                    amils, 
                                    pundis: visiblePundis, 
                                    riwayatPundis: visibleRiwayatPundis, 
                                    contacts: visibleContacts 
                                }} 
                                darkMode={darkMode} 
                            />
                        )}
                        {activeTab === 'donatur_donasi' && <DonaturDanDonasiView contactConfig={contactConfig} donationConfig={donationConfig} isAdmin={isAdmin} />}
                        {activeTab === 'pundi' && <PundiView pundis={pundis} setPundis={setPundis} riwayatPundis={riwayatPundis} setRiwayatPundis={setRiwayatPundis} contacts={contacts} programs={programs} user={user} syncDataToSheet={syncDataToSheet} darkMode={darkMode} setViewImage={setViewImage} amils={amils} setActiveTab={setActiveTab} />}
                        {activeTab === 'scanner' && <ScannerView pundis={pundis} riwayatPundis={riwayatPundis} setRiwayatPundis={setRiwayatPundis} user={user} syncDataToSheet={syncDataToSheet} setActiveTab={setActiveTab} />}
                        {activeTab === 'program' && <ModuleView {...programConfig} canAdd={isAdmin} canEdit={isAdmin} canDelete={isAdmin} />}
                        {activeTab === 'tugas' && <ModuleView {...taskConfig} canAdd={isAdmin} canEdit={isAdmin} canDelete={isAdmin} />}
                        {activeTab === 'amil' && isAdmin && <ModuleView {...amilConfig} />}
                    </div>
                </div>

                {/* BOTTOM NAVBAR MOBILE */}
                <div className="fixed bottom-0 left-0 right-0 lg:left-72 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200/80 dark:border-gray-700/80 px-2 py-1.5 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.1)] flex items-center justify-around transition-all">
                    {[
                        { id: 'dashboard', label: 'Beranda', icon: 'fa-solid fa-border-all' },
                        { id: 'pundi', label: 'Pundi', icon: 'fa-solid fa-box-open' },
                        { id: 'scanner', label: 'Pindai QR', icon: 'fa-solid fa-qrcode', isCenter: true },
                        { id: 'donatur_donasi', label: 'Donatur', icon: 'fa-solid fa-hand-holding-heart' },
                        { id: 'tugas', label: 'Tugas', icon: 'fa-solid fa-clipboard-check' }
                    ].map(item => {
                        const isActive = activeTab === item.id;
                        if (item.isCenter) {
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                    className="relative -top-5 flex flex-col items-center justify-center group focus:outline-none"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-tr from-wiz-green via-[#27745F] to-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-wiz-green/50 border-4 border-white dark:border-gray-800 group-hover:scale-110 active:scale-95 transition-all">
                                        <i className={`${item.icon} text-2xl`}></i>
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 transition-colors ${isActive ? 'text-wiz-green dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>{item.label}</span>
                                </button>
                            );
                        }
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all focus:outline-none ${
                                    isActive
                                        ? 'text-wiz-green dark:text-emerald-400 scale-105 font-bold'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-0.5 transition-all ${
                                    isActive ? 'bg-wiz-green/10 dark:bg-emerald-950/40' : ''
                                }`}>
                                    <i className={`${item.icon} text-base`}></i>
                                </div>
                                <span className="text-[10px] tracking-tight">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* MODAL GANTI SANDI */}
            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Pengaturan Keamanan">
                <form onSubmit={handleChangePassword} className="space-y-4">
                    {pwdError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-xl border border-red-100 dark:border-red-800 font-medium flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> {pwdError}</p>}
                    {pwdSuccess && <p className="text-sm text-wiz-green dark:text-emerald-400 bg-wiz-green/10 dark:bg-wiz-green/20 p-3 rounded-xl border border-wiz-green/20 font-medium flex items-center gap-2"><i className="fa-solid fa-circle-check"></i> {pwdSuccess}</p>}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase">Sandi Saat Ini</label>
                        <input type="password" required value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-wiz-green/20 focus:border-wiz-green text-gray-800 dark:text-gray-100 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase">Sandi Baru</label>
                        <input type="password" required value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-wiz-green/20 focus:border-wiz-green text-gray-800 dark:text-gray-100 outline-none" />
                    </div>
                    <div className="flex justify-end pt-4 mt-2">
                        <Button type="submit" variant="primary">Perbarui Sandi</Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL KONFIRMASI HAPUS */}
            <Modal isOpen={!!deletePrompt} onClose={() => setDeletePrompt(null)}>
                <div className="p-4 flex flex-col items-center justify-center text-center">
                    <div className="bg-red-50 dark:bg-red-950/50 p-5 rounded-full text-red-500 mb-5 relative">
                        <div className="absolute inset-0 bg-red-400 opacity-20 rounded-full animate-ping"></div>
                        <i className="fa-solid fa-trash-can text-4xl relative z-10"></i>
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">Konfirmasi Hapus</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm font-medium">Data ini akan dihapus secara permanen dari server awan Google Sheets Anda.</p>
                    <div className="flex gap-3 w-full">
                        <Button variant="secondary" className="flex-1 py-3" onClick={() => setDeletePrompt(null)}>Batal</Button>
                        <Button variant="danger" className="flex-1 py-3" onClick={confirmDelete}>Ya, Hapus Permanen</Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL PREVIEW BERKAS / GAMBAR */}
            {viewImage && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/90 dark:bg-black/95 backdrop-blur-md animate-in" onClick={() => setViewImage(null)}>
                    <div className="relative max-w-4xl w-full h-[85vh] flex justify-center items-center slide-up">
                        <button onClick={() => setViewImage(null)} className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                        
                        <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-center border border-white/20 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 -z-10">
                                <i className="fa-solid fa-spinner fa-spin text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Memuat berkas dari Drive...</p>
                            </div>
                            <iframe 
                                src={typeof getDrivePreviewUrl === 'function' ? getDrivePreviewUrl(viewImage.original) : viewImage.original} 
                                className="w-full h-full border-0 relative z-10 bg-transparent" 
                                allow="autoplay"
                                title="Penampil Berkas"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Render App ke DOM
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
