const { useState, useEffect, useMemo, useRef } = React;

const PundiView = ({ pundis = [], setPundis, riwayatPundis = [], setRiwayatPundis, contacts = [], programs = [], user, syncDataToSheet, darkMode, setViewImage, amils = [], setActiveTab }) => {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    const [selectedAmilFilter, setSelectedAmilFilter] = useState(user?.name || 'Semua');
    
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [selectedPundi, setSelectedPundi] = useState(null);
    const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
    const [printQR, setPrintQR] = useState(null);

    const [editingRiwayat, setEditingRiwayat] = useState(null);
    const [isEditRiwayatOpen, setIsEditRiwayatOpen] = useState(false);
    const [isBelumDijemputModalOpen, setIsBelumDijemputModalOpen] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

    const [targetConfig, setTargetConfig] = useState(() => {
        const curYear = new Date().getFullYear();
        const defaultCfg = {
            umumHarian: 830000, umumBulanan: 25000000, umumTahunan: 300000000,
            pribadiHarian: 330000, pribadiBulanan: 10000000, pribadiTahunan: 120000000,
            startDate: `${curYear}-01-01`, endDate: `${curYear}-12-31`
        };
        try {
            const saved = localStorage.getItem('wiz_target_pundi_config');
            return saved ? { ...defaultCfg, ...JSON.parse(saved) } : defaultCfg;
        } catch(e) { return defaultCfg; }
    });

    const ZONA_DEFAULT_OPTIONS = ['SEKITAR TANJUNG', 'MALAM', 'KOTAK AMAL', 'PASAR', 'SEGAH', 'TANJUNG BATU', 'BIDUK-BIDUK'];
    const allZonaOptions = useMemo(() => {
        const set = new Set(ZONA_DEFAULT_OPTIONS);
        (pundis || []).forEach(p => {
            if (p.zona && String(p.zona).trim()) set.add(String(p.zona).trim().toUpperCase());
        });
        return Array.from(set);
    }, [pundis]);

    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

    const [searchMaster, setSearchMaster] = useState('');
    const [statusMasterFilter, setStatusMasterFilter] = useState('Semua');
    const [creatorMasterFilter, setCreatorMasterFilter] = useState('Semua');
    const [tipeMasterFilter, setTipeMasterFilter] = useState('Semua');
    const [zonaMasterFilter, setZonaMasterFilter] = useState('Semua');
    const [masterSortOrder, setMasterSortOrder] = useState('asc');

    const [searchTugas, setSearchTugas] = useState('');
    const [statusTugasFilter, setStatusTugasFilter] = useState('Semua');
    const [tipeTugasFilter, setTipeTugasFilter] = useState('Semua');
    const [zonaTugasFilter, setZonaTugasFilter] = useState('Semua');
    const [urutAwal, setUrutAwal] = useState('');
    const [urutAkhir, setUrutAkhir] = useState('');

    const [searchRiwayat, setSearchRiwayat] = useState('');
    const [statusRiwayatFilter, setStatusRiwayatFilter] = useState('Semua');
    const [monthRiwayatFilter, setMonthRiwayatFilter] = useState('Semua');
    const [amilRiwayatFilter, setAmilRiwayatFilter] = useState('Semua');

    const [dashMonth, setDashMonth] = useState(new Date().getMonth());
    const [dashYear, setDashYear] = useState(new Date().getFullYear());
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const yearOptions = Array.from({length: 7}, (_, i) => new Date().getFullYear() - 3 + i);

    const isAdmin = user?.role === 'Admin';
    const effectiveAmil = isAdmin ? selectedAmilFilter : user?.name;

    const visiblePundis = useMemo(() => {
        const safePundis = Array.isArray(pundis) ? pundis : [];
        if (isAdmin && effectiveAmil === 'Semua') return safePundis;
        return safePundis.filter(p => {
            const creator = p.createdBy || (Array.isArray(contacts) && contacts.find(c => c.name === p.donorName)?.createdBy);
            return creator === effectiveAmil;
        });
    }, [pundis, isAdmin, effectiveAmil, contacts]);

    const visibleRiwayatPundis = useMemo(() => {
        const safeRiwayat = Array.isArray(riwayatPundis) ? riwayatPundis : [];
        if (isAdmin && effectiveAmil === 'Semua') return safeRiwayat;
        return safeRiwayat.filter(r => r.amilName === effectiveAmil);
    }, [riwayatPundis, isAdmin, effectiveAmil]);

    const allAmilNames = useMemo(() => {
        const names = new Set((amils || []).map(a => a.name));
        (pundis || []).forEach(p => {
            const c = p.createdBy || (contacts || []).find(cnt => cnt.name === p.donorName)?.createdBy;
            if (c) names.add(c);
        });
        (riwayatPundis || []).forEach(r => { if (r.amilName) names.add(r.amilName); });
        return Array.from(names).filter(Boolean);
    }, [amils, pundis, riwayatPundis, contacts]);

    const uniqueMonths = useMemo(() => {
        const map = new Map();
        visibleRiwayatPundis.forEach(r => {
            const d = new Date(r.date);
            if (!isNaN(d.getTime())) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
                map.set(key, label);
            }
        });
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }, [visibleRiwayatPundis]);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const stats = useMemo(() => {
        const activeBoxes = visiblePundis.filter(p => p.status === 'Aktif');
        const totalAktif = activeBoxes.length;
        const totalUmum = activeBoxes.filter(p => (p.tipePundi || 'Pundi Umum') === 'Pundi Umum').length;
        const totalPribadi = activeBoxes.filter(p => p.tipePundi === 'Pundi Pribadi').length;

        const riwayatPeriode = visibleRiwayatPundis.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            if (isNaN(d.getTime())) return false;
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === Number(dashMonth);
            return matchMonth && d.getFullYear() === Number(dashYear);
        });

        const riwayatBerhasil = riwayatPeriode.filter(r => r.status === 'Berhasil');
        const totalDanaBulanIni = riwayatBerhasil.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        let danaUmum = 0; let danaPribadi = 0;
        riwayatBerhasil.forEach(r => {
            const matchedPundi = activeBoxes.find(p => String(p.id) === String(r.pundiId) || String(p.noUrut) === String(r.noUrut));
            const tipe = (matchedPundi && matchedPundi.tipePundi) || 'Pundi Umum';
            const amt = Number(r.amount || 0);
            if (tipe === 'Pundi Pribadi') danaPribadi += amt;
            else danaUmum += amt;
        });

        const pickedUpBoxIds = new Set();
        const inProgressBoxIds = new Set();
        riwayatPeriode.forEach(r => {
            const pid = String(r.pundiId || r.noUrut);
            if (r.status === 'Berhasil') pickedUpBoxIds.add(pid);
            else if (r.status === 'Dijemput') inProgressBoxIds.add(pid);
        });

        const berhasil = riwayatBerhasil.length;
        const sedangDijemput = activeBoxes.filter(p => inProgressBoxIds.has(String(p.id)) || inProgressBoxIds.has(String(p.noUrut))).length;
        const pundiBelumDijemputList = activeBoxes.filter(p => !pickedUpBoxIds.has(String(p.id)) && !pickedUpBoxIds.has(String(p.noUrut)) && !inProgressBoxIds.has(String(p.id)) && !inProgressBoxIds.has(String(p.noUrut)));
        const belumDijemputCount = pundiBelumDijemputList.length;

        const isAll = dashMonth === 'Semua';
        const targetUmumPeriode = isAll ? (targetConfig.umumTahunan || (targetConfig.umumBulanan * 12)) : targetConfig.umumBulanan;
        const targetPribadiPeriode = isAll ? (targetConfig.pribadiTahunan || (targetConfig.pribadiBulanan * 12)) : targetConfig.pribadiBulanan;
        const totalTargetPeriode = targetUmumPeriode + targetPribadiPeriode;

        const percentUmum = targetUmumPeriode > 0 ? Math.min(Math.round((danaUmum / targetUmumPeriode) * 100), 100) : 0;
        const percentPribadi = targetPribadiPeriode > 0 ? Math.min(Math.round((danaPribadi / targetPribadiPeriode) * 100), 100) : 0;
        const percentTotal = totalTargetPeriode > 0 ? Math.min(Math.round((totalDanaBulanIni / totalTargetPeriode) * 100), 100) : 0;

        return {
            totalAktif, totalUmum, totalPribadi, totalDanaBulanIni, danaUmum, danaPribadi,
            berhasil, sedangDijemput, belumDijemputCount, pundiBelumDijemputList,
            targetUmumPeriode, targetPribadiPeriode, totalTargetPeriode,
            percentUmum, percentPribadi, percentTotal
        };
    }, [visiblePundis, visibleRiwayatPundis, dashMonth, dashYear, targetConfig]);

    const activePundisSorted = [...visiblePundis].filter(p => p.status === 'Aktif').sort((a, b) => Number(a.noUrut) - Number(b.noUrut));

    const filteredTugasPundis = useMemo(() => {
        return activePundisSorted.filter(p => {
            const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
            const pStatus = currentRecord ? currentRecord.status : 'Belum';
            const term = searchTugas.toLowerCase().trim();
            const matchSearch = !term || String(p.noUrut || '').toLowerCase().includes(term) || String(p.donorName || '').toLowerCase().includes(term) || String(p.usaha || '').toLowerCase().includes(term) || String(p.alamat || '').toLowerCase().includes(term) || String(p.zona || '').toLowerCase().includes(term);

            let matchStatus = true;
            if (statusTugasFilter === 'Belum') matchStatus = pStatus === 'Belum';
            else if (statusTugasFilter === 'Dijemput') matchStatus = pStatus === 'Dijemput';
            else if (statusTugasFilter === 'Sudah Ditarik') matchStatus = pStatus === 'Berhasil';

            const matchTipe = tipeTugasFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeTugasFilter;
            const matchZona = zonaTugasFilter === 'Semua' || String(p.zona || '').toUpperCase() === String(zonaTugasFilter).toUpperCase();
            const pNo = Number(p.noUrut);
            const matchUrutAwal = urutAwal === '' || isNaN(Number(urutAwal)) || pNo >= Number(urutAwal);
            const matchUrutAkhir = urutAkhir === '' || isNaN(Number(urutAkhir)) || pNo <= Number(urutAkhir);

            return matchSearch && matchStatus && matchTipe && matchZona && matchUrutAwal && matchUrutAkhir;
        });
    }, [activePundisSorted, visibleRiwayatPundis, searchTugas, statusTugasFilter, tipeTugasFilter, zonaTugasFilter, urutAwal, urutAkhir, currentMonth, currentYear]);

    const toggleSelectTask = (id) => {
        const newSet = new Set(selectedTaskIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedTaskIds(newSet);
    };

    const toggleSelectAllFiltered = () => {
        const newSet = new Set(selectedTaskIds);
        const isAllSelected = filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => newSet.has(p.id));
        if (isAllSelected) {
            filteredTugasPundis.forEach(p => newSet.delete(p.id));
        } else {
            filteredTugasPundis.forEach(p => newSet.add(p.id));
        }
        setSelectedTaskIds(newSet);
    };

    const markAsDijemput = (pundisToUpdate) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let newRiwayat = [...(riwayatPundis || [])];
        let isChanged = false;

        pundisToUpdate.forEach(p => {
            const idx = newRiwayat.findIndex(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
            if (idx >= 0) {
                if (newRiwayat[idx].status === 'Belum' || !newRiwayat[idx].status) {
                    newRiwayat[idx] = { ...newRiwayat[idx], status: 'Dijemput' };
                    isChanged = true;
                }
            } else {
                newRiwayat.push({
                    id: Date.now() + Math.floor(Math.random() * 10000) + Number(p.noUrut || 0),
                    date: todayStr, pundiId: p.id, noUrut: p.noUrut, donorName: p.donorName, usaha: p.usaha,
                    amount: 0, status: 'Dijemput', amilName: user?.name || 'Amil', notes: 'Otomatis dicetak', receiptUrl: ''
                });
                isChanged = true;
            }
        });

        if (isChanged) {
            setRiwayatPundis(newRiwayat);
            if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', newRiwayat);
        }
    };

    const handlePrintChecklist = () => {
        let dataToPrint = selectedTaskIds.size > 0 ? activePundisSorted.filter(p => selectedTaskIds.has(p.id)) : filteredTugasPundis;
        if (dataToPrint.length === 0) return;
        markAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        const tglCetak = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '-');
        const rangeKeterangan = selectedTaskIds.size > 0 ? `(${selectedTaskIds.size} Pilihan Ceklis Manual)` : (urutAwal || urutAkhir ? `(Urut ${urutAwal || '1'} - ${urutAkhir || 'Akhir'})` : '');

        let html = `
        <html><head><title>Checklist Penarikan Pundi</title>
        <style>
            @page { size: A4 portrait; margin: 6mm 7mm; }
            * { box-sizing: border-box; } body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.15; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; }
            th { background-color: #27745F; color: #fff; text-transform: uppercase; font-size: 8.5px; }
            .check-box { width: 13px; height: 13px; border: 1.2px solid #64748b; display: inline-block; border-radius: 2px; }
        </style></head><body>
            <div style="display:flex; justify-content:space-between; border-bottom:2px solid #27745F; padding-bottom:5px;">
                <div><h2 style="margin:0; font-size:13px; color:#27745F;">LEMBAR CHECKLIST PENARIKAN PUNDI ZIS</h2><p style="margin:2px 0 0 0; font-size:9px;">WIZ Gerai Berau • Bulan: ${monthNames[currentMonth]} ${currentYear}</p></div>
                <div style="font-size:8px; text-align:right;">Tanggal: <b>${tglCetak}</b><br/>Petugas: <b>${printPetugasName}</b><br/>Total: <b>${dataToPrint.length} Pundi ${rangeKeterangan}</b></div>
            </div>
            <table><thead><tr>
                <th style="width:5%; text-align:center;">No</th><th style="width:10%; text-align:center;">Reg</th><th style="width:25%;">Usaha & Zona</th><th style="width:25%;">Donatur & Kontak</th><th style="width:25%;">Alamat</th><th style="width:10%; text-align:center;">Cek</th>
            </tr></thead><tbody>
                ${dataToPrint.map((p, idx) => `<tr>
                    <td style="text-align:center;">${idx + 1}</td><td style="text-align:center; font-weight:bold;">#${p.noUrut || '-'}</td>
                    <td><b>${p.usaha || '-'}</b> ${p.zona ? `<span style="font-size:7px; background:#e0f2fe; color:#0369a1; padding:1px 3px; border-radius:2px;">${p.zona}</span>` : ''}</td>
                    <td><b>${p.donorName || '-'}</b><br/><span style="color:#64748b; font-size:7.5px;">${p.phone || '-'}</span></td>
                    <td style="font-size:8px; color:#475569;">${p.alamat || '-'}</td>
                    <td style="text-align:center;"><span class="check-box"></span></td>
                </tr>`).join('')}
            </tbody></table>
            <p style="font-size:8px; color:#64748b; margin-top:8px;">* Status di sistem otomatis berubah menjadi <b>Dalam Penjemputan</b>.</p>
        </body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
        <div className="space-y-6 slide-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100"><i className="fa-solid fa-box-open text-wiz-orange mr-2"></i> Manajemen Pundi WIZ</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem kontrol dan pencatatan donatur kotak pundi.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => setIsTargetModalOpen(true)} variant="secondary" icon="fa-solid fa-bullseye" className="text-xs border-wiz-green/30 text-wiz-green">
                        🎯 Atur / Target Pundi
                    </Button>
                    <Button onClick={() => setActiveTab('scanner')} variant="primary" icon="fa-solid fa-camera" className="hidden lg:flex shadow-md">
                        Buka Kamera (Scan QR)
                    </Button>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm w-full hide-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard Analitik', icon: 'fa-chart-pie' },
                    { id: 'tugas', label: 'Tugas Penarikan', icon: 'fa-clipboard-list' },
                    { id: 'master', label: 'Data Master Pundi', icon: 'fa-boxes-stacked' },
                    { id: 'riwayat', label: 'Riwayat Sedekah', icon: 'fa-money-bill-wave' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-wiz-green text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB DASHBOARD ANALITIK */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-6 animate-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm"><i className="fa-solid fa-filter text-wiz-green mr-1.5"></i> Filter Periode Analitik:</h3>
                        <div className="flex items-center gap-2">
                            <select value={dashMonth} onChange={e => setDashMonth(e.target.value === 'Semua' ? 'Semua' : Number(e.target.value))} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-xs font-bold">
                                <option value="Semua">Semua Bulan</option>
                                {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                            </select>
                            <select value={dashYear} onChange={e => setDashYear(Number(e.target.value))} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-xs font-bold">
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-md"><i className="fa-solid fa-store mr-1"></i> Pundi Umum</span>
                            <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-2">{typeof formatRp === 'function' ? formatRp(stats.danaUmum) : stats.danaUmum}</h4>
                            <div className="flex justify-between text-[11px] text-gray-500 mt-3 mb-1">
                                <span>Target: {typeof formatRp === 'function' ? formatRp(stats.targetUmumPeriode) : stats.targetUmumPeriode}</span>
                                <span className="font-bold text-blue-600">{stats.percentUmum}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats.percentUmum}%` }}></div></div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 rounded-md"><i className="fa-solid fa-house-user mr-1"></i> Pundi Pribadi</span>
                            <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-2">{typeof formatRp === 'function' ? formatRp(stats.danaPribadi) : stats.danaPribadi}</h4>
                            <div className="flex justify-between text-[11px] text-gray-500 mt-3 mb-1">
                                <span>Target: {typeof formatRp === 'function' ? formatRp(stats.targetPribadiPeriode) : stats.targetPribadiPeriode}</span>
                                <span className="font-bold text-purple-600">{stats.percentPribadi}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.percentPribadi}%` }}></div></div>
                        </div>

                        <div onClick={() => setIsBelumDijemputModalOpen(true)} className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-800 p-5 rounded-3xl border border-amber-200 dark:border-amber-800 shadow-sm cursor-pointer hover:shadow-md transition-all">
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-md"><i className="fa-solid fa-clock mr-1"></i> Belum Dijemput</span>
                            <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{stats.belumDijemputCount} <span className="text-xs font-bold text-gray-400">Kotak</span></h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-3 flex items-center justify-between">Lihat daftar titik <i className="fa-solid fa-arrow-right text-[10px]"></i></p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB TUGAS PENARIKAN */}
            {activeSubTab === 'tugas' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 shadow-sm space-y-4 animate-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">Antrean Penarikan Bulan Ini</h3>
                            <p className="text-xs text-gray-500">
                                {selectedTaskIds.size > 0 ? (
                                    <span className="font-bold text-wiz-green bg-wiz-green/10 px-2 py-0.5 rounded">{selectedTaskIds.size} Pundi Terpilih</span>
                                ) : `Tersedia ${filteredTugasPundis.length} kotak pundi aktif.`}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={toggleSelectAllFiltered} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200">
                                <i className={`fa-solid ${filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id)) ? 'fa-square-check text-wiz-green' : 'fa-square'} mr-1`}></i>
                                {filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id)) ? 'Batal Pilih' : 'Pilih Semua'}
                            </button>
                            <Button onClick={handlePrintChecklist} icon="fa-solid fa-print" variant="primary" className="text-xs">
                                Cetak Checklist ({selectedTaskIds.size > 0 ? selectedTaskIds.size : filteredTugasPundis.length})
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <input type="text" value={searchTugas} onChange={e => setSearchTugas(e.target.value)} placeholder="Cari nama toko, donatur, zona..." className="px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-xl text-xs flex-1 outline-none" />
                        <select value={zonaTugasFilter} onChange={e => setZonaTugasFilter(e.target.value)} className="px-2 py-1.5 bg-white dark:bg-gray-800 border rounded-xl text-xs font-bold">
                            <option value="Semua">Semua Zona</option>
                            {allZonaOptions.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        {filteredTugasPundis.map(p => {
                            const isChecked = selectedTaskIds.has(p.id);
                            return (
                                <div key={p.id} onClick={() => toggleSelectTask(p.id)} className={`p-3.5 border rounded-2xl flex items-center gap-3 cursor-pointer transition-colors ${isChecked ? 'bg-wiz-green/10 border-wiz-green' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50'}`}>
                                    <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-4 h-4 text-wiz-green accent-wiz-green cursor-pointer" />
                                    <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-xs">#{p.noUrut}</span>
                                    <div className="flex-1">
                                        <p className="font-bold text-xs sm:text-sm">{p.usaha} {p.zona && <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded ml-1">{p.zona}</span>}</p>
                                        <p className="text-[11px] text-gray-500">{p.donorName} • {p.alamat}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {p.tipePundi || 'Pundi Umum'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB DATA MASTER PUNDI */}
            {activeSubTab === 'master' && (
                <div className="animate-in">
                    <ModuleView
                        title="Data Kotak Pundi"
                        data={visiblePundis}
                        columns={[
                            { key: 'noUrut', label: 'No', render: r => <b className="text-wiz-green">#{r.noUrut}</b> },
                            { key: 'usaha', label: 'Usaha / Titik', render: r => <div><b>{r.usaha}</b><br/><span className="text-[10px] text-gray-400">{r.donorName}</span></div> },
                            { key: 'tipePundi', label: 'Tipe' },
                            { key: 'zona', label: 'Zona Wilayah', render: r => <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-bold">{r.zona || 'SEKITAR TANJUNG'}</span> },
                            { key: 'status', label: 'Status', render: r => <StatusBadge text={r.status} /> }
                        ]}
                        schema={[
                            { name: 'noUrut', label: 'Nomor Urut', type: 'number', required: true },
                            { name: 'tipePundi', label: 'Tipe Pundi', type: 'select', options: ['Pundi Umum', 'Pundi Pribadi'], required: true },
                            { name: 'zona', label: 'Zona Wilayah (Pilih / Ketik Bebas)', type: 'datalist', options: allZonaOptions, required: true },
                            { name: 'donorName', label: 'Nama Donatur', required: true },
                            { name: 'usaha', label: 'Nama Usaha / Lokasi', required: true },
                            { name: 'phone', label: 'No. WhatsApp' },
                            { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Ditarik'], required: true },
                            { name: 'alamat', label: 'Alamat Lengkap', type: 'textarea', fullWidth: true }
                        ]}
                        defaultValues={{ noUrut: (pundis.length || 0) + 1, status: 'Aktif', tipePundi: 'Pundi Umum', zona: 'SEKITAR TANJUNG' }}
                        onSave={(data, isEdit) => {
                            const updated = isEdit ? pundis.map(p => p.id === data.id ? data : p) : [...pundis, { ...data, id: Date.now() }];
                            setPundis(updated);
                            if (typeof syncDataToSheet === 'function') syncDataToSheet('Pundi', updated);
                        }}
                    />
                </div>
            )}

            {/* TAB RIWAYAT SEDEKAH */}
            {activeSubTab === 'riwayat' && (
                <div className="animate-in">
                    <Table
                        columns={[
                            { key: 'date', label: 'Tanggal', render: r => typeof formatDate === 'function' ? formatDate(r.date) : r.date },
                            { key: 'usaha', label: 'Titik Pundi', render: r => <div><b>{r.usaha}</b> (#{r.noUrut})</div> },
                            { key: 'amount', label: 'Nominal', render: r => <b className="text-wiz-green">{typeof formatRp === 'function' ? formatRp(r.amount) : r.amount}</b> },
                            { key: 'status', label: 'Status', render: r => <StatusBadge text={r.status} /> },
                            { key: 'amilName', label: 'Amil Petugas' }
                        ]}
                        data={visibleRiwayatPundis}
                    />
                </div>
            )}

            {/* MODAL PENGATURAN TARGET */}
            <Modal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} title="Pengaturan Target Pundi">
                <form onSubmit={e => {
                    e.preventDefault();
                    const form = e.target;
                    const newCfg = {
                        ...targetConfig,
                        umumBulanan: Number(form.targetUmum.value.replace(/\D/g, '')) || 0,
                        pribadiBulanan: Number(form.targetPribadi.value.replace(/\D/g, '')) || 0
                    };
                    setTargetConfig(newCfg);
                    try { localStorage.setItem('wiz_target_pundi_config', JSON.stringify(newCfg)); } catch(err) {}
                    setIsTargetModalOpen(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Bulanan Pundi Umum (Rp)</label>
                        <input type="text" name="targetUmum" defaultValue={Number(targetConfig.umumBulanan).toLocaleString('id-ID')} onInput={e => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')} className="w-full p-2.5 border rounded-xl font-bold text-blue-600 bg-gray-50 dark:bg-gray-700 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Bulanan Pundi Pribadi (Rp)</label>
                        <input type="text" name="targetPribadi" defaultValue={Number(targetConfig.pribadiBulanan).toLocaleString('id-ID')} onInput={e => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')} className="w-full p-2.5 border rounded-xl font-bold text-purple-600 bg-gray-50 dark:bg-gray-700 outline-none" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setIsTargetModalOpen(false)}>Batal</Button><Button type="submit" variant="primary">Simpan Target</Button></div>
                </form>
            </Modal>
        </div>
    );
};

window.PundiView = PundiView;
