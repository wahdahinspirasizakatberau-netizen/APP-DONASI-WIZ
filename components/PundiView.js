// Komponen Manajemen Pundi WIZ (Dashboard, Tugas Penarikan, Master Pundi, Riwayat Sedekah, Cetak)
// Versi Stabil + Target Harian Bulanan Tahunan + Zona Wilayah Bebas Ketik + Checkbox Akumulatif

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

    // Modal List Pundi Belum Dijemput
    const [isBelumDijemputModalOpen, setIsBelumDijemputModalOpen] = useState(false);

    // Modal & Konfigurasi Pengaturan Target Mandiri Pundi (Harian, Bulanan, Tahunan & Periode Mulai - Akhir)
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [targetConfig, setTargetConfig] = useState(() => {
        const curYear = new Date().getFullYear();
        const defaultCfg = {
            umumHarian: 830000,
            umumBulanan: 25000000,
            umumTahunan: 300000000,
            pribadiHarian: 330000,
            pribadiBulanan: 10000000,
            pribadiTahunan: 120000000,
            startDate: `${curYear}-01-01`,
            endDate: `${curYear}-12-31`
        };
        try {
            const saved = localStorage.getItem('wiz_target_pundi_config');
            if (saved) return { ...defaultCfg, ...JSON.parse(saved) };
            return defaultCfg;
        } catch(e) {
            return defaultCfg;
        }
    });

    // Opsi Default Zona Wilayah
    const ZONA_DEFAULT_OPTIONS = [
        'SEKITAR TANJUNG',
        'MALAM',
        'KOTAK AMAL',
        'PASAR',
        'SEGAH',
        'TANJUNG BATU',
        'BIDUK-BIDUK'
    ];

    // Kumpulan Opsi Zona (Default + Semua Zona Baru yang Diketik Manual di Pundis)
    const allZonaOptions = useMemo(() => {
        const set = new Set(ZONA_DEFAULT_OPTIONS);
        (pundis || []).forEach(p => {
            if (p.zona && String(p.zona).trim()) {
                set.add(String(p.zona).trim().toUpperCase());
            }
        });
        return Array.from(set);
    }, [pundis]);

    // State Checkbox Tugas Penarikan
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

    // Filter Master Pundi
    const [searchMaster, setSearchMaster] = useState('');
    const [statusMasterFilter, setStatusMasterFilter] = useState('Semua');
    const [creatorMasterFilter, setCreatorMasterFilter] = useState('Semua');
    const [tipeMasterFilter, setTipeMasterFilter] = useState('Semua');
    const [zonaMasterFilter, setZonaMasterFilter] = useState('Semua');
    const [masterSortOrder, setMasterSortOrder] = useState('asc');

    // Filter Tugas Penarikan
    const [searchTugas, setSearchTugas] = useState('');
    const [statusTugasFilter, setStatusTugasFilter] = useState('Semua');
    const [tipeTugasFilter, setTipeTugasFilter] = useState('Semua');
    const [zonaTugasFilter, setZonaTugasFilter] = useState('Semua');
    const [urutAwal, setUrutAwal] = useState('');
    const [urutAkhir, setUrutAkhir] = useState('');

    // Filter Riwayat
    const [searchRiwayat, setSearchRiwayat] = useState('');
    const [statusRiwayatFilter, setStatusRiwayatFilter] = useState('Semua');
    const [monthRiwayatFilter, setMonthRiwayatFilter] = useState('Semua');
    const [amilRiwayatFilter, setAmilRiwayatFilter] = useState('Semua');

    // Filter Dashboard
    const [dashMonth, setDashMonth] = useState(new Date().getMonth());
    const [dashYear, setDashYear] = useState(new Date().getFullYear());
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const yearOptions = Array.from({length: 7}, (_, i) => new Date().getFullYear() - 3 + i);

    const isAdmin = user?.role === 'Admin';
    const effectiveAmil = isAdmin ? selectedAmilFilter : user?.name;

    const saveTargetConfig = (e) => {
        e.preventDefault();
        const form = e.target;
        const newCfg = {
            startDate: form.startDate.value || targetConfig.startDate,
            endDate: form.endDate.value || targetConfig.endDate,
            umumHarian: Number(form.targetUmumHarian.value.replace(/\D/g, '')) || 0,
            umumBulanan: Number(form.targetUmumBulanan.value.replace(/\D/g, '')) || 0,
            umumTahunan: Number(form.targetUmumTahunan.value.replace(/\D/g, '')) || 0,
            pribadiHarian: Number(form.targetPribadiHarian.value.replace(/\D/g, '')) || 0,
            pribadiBulanan: Number(form.targetPribadiBulanan.value.replace(/\D/g, '')) || 0,
            pribadiTahunan: Number(form.targetPribadiTahunan.value.replace(/\D/g, '')) || 0
        };
        setTargetConfig(newCfg);
        try {
            localStorage.setItem('wiz_target_pundi_config', JSON.stringify(newCfg));
        } catch(err) {}
        setIsTargetModalOpen(false);
    };

    const handleOpenEditRiwayat = (row) => {
        setEditingRiwayat(row);
        setIsEditRiwayatOpen(true);
    };

    const saveEditRiwayat = (formData) => {
        const updated = (riwayatPundis || []).map(r => {
            if (String(r.id) === String(editingRiwayat.id)) {
                return {
                    ...r,
                    ...formData,
                    amount: Number(formData.amount || 0),
                    receiptUrl: formData.receiptUrl || r.receiptUrl || ''
                };
            }
            return r;
        });
        setRiwayatPundis(updated);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updated);
        setIsEditRiwayatOpen(false);
        setEditingRiwayat(null);
    };

    const deleteRiwayat = (row) => {
        const updated = (riwayatPundis || []).filter(r => String(r.id) !== String(row.id));
        setRiwayatPundis(updated);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updated);
    };

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
        (riwayatPundis || []).forEach(r => {
            if (r.amilName) names.add(r.amilName);
        });
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
    
    // STATS & PERHITUNGAN TARGET TERPADU
    const stats = useMemo(() => {
        const activeBoxes = visiblePundis.filter(p => p.status === 'Aktif');
        const totalAktif = activeBoxes.length;
        const totalUmum = activeBoxes.filter(p => (p.tipePundi || 'Pundi Umum') === 'Pundi Umum').length;
        const totalPribadi = activeBoxes.filter(p => p.tipePundi === 'Pundi Pribadi').length;
        
        // Filter riwayat sesuai bulan & tahun yang dipilih di Dashboard
        const riwayatPeriode = visibleRiwayatPundis.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            if (isNaN(d.getTime())) return false;
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === Number(dashMonth);
            const matchYear = d.getFullYear() === Number(dashYear);
            return matchMonth && matchYear;
        });

        const riwayatBerhasil = riwayatPeriode.filter(r => r.status === 'Berhasil');
        const totalDanaBulanIni = riwayatBerhasil.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        let danaUmum = 0;
        let danaPribadi = 0;
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

        // Pundi yang belum dijemput
        const pundiBelumDijemputList = activeBoxes.filter(p =>
            !pickedUpBoxIds.has(String(p.id)) &&
            !pickedUpBoxIds.has(String(p.noUrut)) &&
            !inProgressBoxIds.has(String(p.id)) &&
            !inProgressBoxIds.has(String(p.noUrut))
        );
        const belumDijemputCount = pundiBelumDijemputList.length;

        // Target Periode
        const isAllMonths = dashMonth === 'Semua';
        const targetUmumPeriode = isAllMonths ? (targetConfig.umumTahunan || (targetConfig.umumBulanan * 12)) : targetConfig.umumBulanan;
        const targetPribadiPeriode = isAllMonths ? (targetConfig.pribadiTahunan || (targetConfig.pribadiBulanan * 12)) : targetConfig.pribadiBulanan;
        const totalTargetPeriode = targetUmumPeriode + targetPribadiPeriode;

        const totalTargetHarian = (targetConfig.umumHarian || 0) + (targetConfig.pribadiHarian || 0);
        const totalTargetTahunan = (targetConfig.umumTahunan || 0) + (targetConfig.pribadiTahunan || 0);

        const percentUmum = targetUmumPeriode > 0 ? Math.min(Math.round((danaUmum / targetUmumPeriode) * 100), 100) : 0;
        const percentPribadi = targetPribadiPeriode > 0 ? Math.min(Math.round((danaPribadi / targetPribadiPeriode) * 100), 100) : 0;
        const percentTotal = totalTargetPeriode > 0 ? Math.min(Math.round((totalDanaBulanIni / totalTargetPeriode) * 100), 100) : 0;

        return { 
            totalAktif, totalUmum, totalPribadi, 
            totalDanaBulanIni, danaUmum, danaPribadi, 
            berhasil, sedangDijemput, belumDijemputCount, pundiBelumDijemputList, 
            targetUmumPeriode, targetPribadiPeriode, totalTargetPeriode,
            totalTargetHarian, totalTargetTahunan,
            percentUmum, percentPribadi, percentTotal
        };
    }, [visiblePundis, visibleRiwayatPundis, dashMonth, dashYear, targetConfig]);

    const activePundisSorted = [...visiblePundis].filter(p => p.status === 'Aktif').sort((a, b) => Number(a.noUrut) - Number(b.noUrut));

    // FILTER MASTER PUNDI
    const filteredMasterPundis = useMemo(() => {
        const filtered = visiblePundis.filter(p => {
            const creator = p.createdBy || (contacts || []).find(c => c.name === p.donorName)?.createdBy || '';
            const term = searchMaster.toLowerCase().trim();
            const matchSearch = !term ||
                String(p.noUrut || '').toLowerCase().includes(term) ||
                String(p.donorName || '').toLowerCase().includes(term) ||
                String(p.usaha || '').toLowerCase().includes(term) ||
                String(p.alamat || '').toLowerCase().includes(term) ||
                String(p.tipePundi || '').toLowerCase().includes(term) ||
                String(p.zona || '').toLowerCase().includes(term) ||
                String(p.phone || '').toLowerCase().includes(term);
            const matchStatus = statusMasterFilter === 'Semua' || p.status === statusMasterFilter;
            const matchCreator = creatorMasterFilter === 'Semua' || creator === creatorMasterFilter;
            const matchTipe = tipeMasterFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeMasterFilter;
            const matchZona = zonaMasterFilter === 'Semua' || String(p.zona || '').toUpperCase() === String(zonaMasterFilter).toUpperCase();
            return matchSearch && matchStatus && matchCreator && matchTipe && matchZona;
        });

        return filtered.sort((a, b) => {
            const numA = Number(a.noUrut) || 0;
            const numB = Number(b.noUrut) || 0;
            return masterSortOrder === 'asc' ? numA - numB : numB - numA;
        });
    }, [visiblePundis, searchMaster, statusMasterFilter, creatorMasterFilter, tipeMasterFilter, zonaMasterFilter, masterSortOrder, contacts]);

    // FILTER TUGAS PENARIKAN
    const filteredTugasPundis = useMemo(() => {
        return activePundisSorted.filter(p => {
            const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
            const pStatus = currentRecord ? currentRecord.status : 'Belum';
            
            const term = searchTugas.toLowerCase().trim();
            const matchSearch = !term ||
                String(p.noUrut || '').toLowerCase().includes(term) ||
                String(p.donorName || '').toLowerCase().includes(term) ||
                String(p.usaha || '').toLowerCase().includes(term) ||
                String(p.alamat || '').toLowerCase().includes(term) ||
                String(p.zona || '').toLowerCase().includes(term);
            
            let matchStatus = false;
            if (statusTugasFilter === 'Semua') matchStatus = true;
            else if (statusTugasFilter === 'Belum' && pStatus === 'Belum') matchStatus = true;
            else if (statusTugasFilter === 'Dijemput' && pStatus === 'Dijemput') matchStatus = true;
            else if (statusTugasFilter === 'Sudah Ditarik' && pStatus === 'Berhasil') matchStatus = true;

            const matchTipe = tipeTugasFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeTugasFilter;
            const matchZona = zonaTugasFilter === 'Semua' || String(p.zona || '').toUpperCase() === String(zonaTugasFilter).toUpperCase();

            const pNo = Number(p.noUrut);
            const matchUrutAwal = urutAwal === '' || isNaN(Number(urutAwal)) || pNo >= Number(urutAwal);
            const matchUrutAkhir = urutAkhir === '' || isNaN(Number(urutAkhir)) || pNo <= Number(urutAkhir);

            return matchSearch && matchStatus && matchTipe && matchZona && matchUrutAwal && matchUrutAkhir;
        });
    }, [activePundisSorted, visibleRiwayatPundis, searchTugas, statusTugasFilter, tipeTugasFilter, zonaTugasFilter, urutAwal, urutAkhir, currentMonth, currentYear]);

    // CHECKBOX AKUMULATIF (PILIHAN DATA TIDAK HILANG SAAT CARI DATA LAIN)
    const toggleSelectTask = (id) => {
        const newSet = new Set(selectedTaskIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedTaskIds(newSet);
    };

    const toggleSelectAllFiltered = () => {
        const newSet = new Set(selectedTaskIds);
        const isAllFilteredSelected = filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => newSet.has(p.id));

        if (isAllFilteredSelected) {
            // Hilangkan centang HANYA untuk yang sedang tampil di pencarian
            filteredTugasPundis.forEach(p => newSet.delete(p.id));
        } else {
            // Tambahkan semua data hasil filter pencarian ini ke dalam centangan
            filteredTugasPundis.forEach(p => newSet.add(p.id));
        }
        setSelectedTaskIds(newSet);
    };

    // FILTER RIWAYAT
    const filteredRiwayatPundis = useMemo(() => {
        return visibleRiwayatPundis.filter(r => {
            const term = searchRiwayat.toLowerCase().trim();
            const matchSearch = !term ||
                String(r.noUrut || '').toLowerCase().includes(term) ||
                String(r.donorName || '').toLowerCase().includes(term) ||
                String(r.usaha || '').toLowerCase().includes(term) ||
                String(r.notes || '').toLowerCase().includes(term);
            const matchStatus = statusRiwayatFilter === 'Semua' || r.status === statusRiwayatFilter;
            const matchAmil = amilRiwayatFilter === 'Semua' || r.amilName === amilRiwayatFilter;
            
            let matchMonth = true;
            if (monthRiwayatFilter !== 'Semua') {
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    matchMonth = key === monthRiwayatFilter;
                }
            }
            return matchSearch && matchStatus && matchAmil && matchMonth;
        });
    }, [visibleRiwayatPundis, searchRiwayat, statusRiwayatFilter, monthRiwayatFilter, amilRiwayatFilter]);
    
    const nextNoUrut = useMemo(() => {
        return (pundis || []).reduce((max, p) => Math.max(max, Number(p.noUrut) || 0), 0) + 1;
    }, [pundis]);

    const handleQuickScan = (val) => {
        const cleanVal = String(val).trim();
        if (!cleanVal) return;

        let foundPundi = null;
        if (cleanVal.includes('WIZ-PUNDI-')) {
            const extractedId = cleanVal.split('WIZ-PUNDI-')[1].trim();
            foundPundi = (pundis || []).find(p => String(p.id) === String(extractedId));
        } else if (!isNaN(cleanVal) && cleanVal.length > 0) {
            foundPundi = (pundis || []).find(p => String(p.noUrut) === cleanVal);
        }

        if (foundPundi) {
            setIsQuickScanOpen(false);
            setSelectedPundi(foundPundi);
            setTimeout(() => setIsInputModalOpen(true), 400);
        } else {
            const el = document.createElement('div');
            el.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all text-center`;
            el.innerText = "❌ QR Pundi tidak ditemukan di sistem.";
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }
    };

    const markAsDijemput = (pundisToUpdate) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let newRiwayat = [...(riwayatPundis || [])];
        let isChanged = false;

        pundisToUpdate.forEach(p => {
            const existingIdx = newRiwayat.findIndex(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
            if (existingIdx >= 0) {
                if (newRiwayat[existingIdx].status === 'Belum' || !newRiwayat[existingIdx].status) {
                    newRiwayat[existingIdx] = { ...newRiwayat[existingIdx], status: 'Dijemput' };
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
        let dataToPrint = [];
        if (selectedTaskIds.size > 0) {
            dataToPrint = activePundisSorted.filter(p => selectedTaskIds.has(p.id));
        } else {
            dataToPrint = filteredTugasPundis;
        }

        if (dataToPrint.length === 0) return;

        markAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        const tglCetak = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const totalItem = dataToPrint.length;
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '-');
        
        const fontSize = totalItem > 25 ? '8px' : totalItem > 15 ? '9px' : '10px';
        const cellPadding = totalItem > 25 ? '2.5px 4px' : totalItem > 15 ? '3.5px 5px' : '5px 6px';

        const rangeKeterangan = selectedTaskIds.size > 0 
            ? `(${selectedTaskIds.size} Pilihan Ceklis)` 
            : (urutAwal || urutAkhir ? `(Urut ${urutAwal || '1'} - ${urutAkhir || 'Akhir'})` : '');

        let html = `
        <html>
        <head>
            <title>Checklist Penarikan Pundi ZIS - WIZ Berau</title>
            <style>
                @page { size: A4 portrait; margin: 6mm 7mm; }
                * { box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #111; font-size: ${fontSize}; line-height: 1.15; background: #fff; }
                .header-wrap { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #27745F; padding-bottom: 5px; margin-bottom: 6px; }
                .header-left { display: flex; align-items: center; gap: 8px; }
                .header-brand { font-size: 15px; font-weight: 900; letter-spacing: -0.5px; }
                .brand-wiz { color: #27745F; }
                .brand-berau { color: #F59121; }
                .header-title h2 { margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1f2937; letter-spacing: 0.3px; }
                .header-title p { margin: 1px 0 0 0; font-size: 8.5px; color: #4b5563; }
                .header-meta { text-align: right; font-size: 8px; color: #374151; line-height: 1.3; background: #f8faf9; border: 1px solid #e2e8f0; padding: 3px 6px; border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 2px; table-layout: fixed; }
                th, td { border: 1px solid #94a3b8; padding: ${cellPadding}; text-align: left; vertical-align: middle; }
                th { background-color: #27745F; color: #ffffff; font-weight: 800; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.2px; }
                tr { page-break-inside: avoid; }
                .text-center { text-align: center; }
                .run-no { font-weight: bold; color: #475569; width: 5%; }
                .no-col { font-weight: 900; color: #166534; font-size: 10px; background: #f0fdf4; }
                .cell-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .alamat-text { font-size: 8px; color: #475569; line-height: 1.1; }
                .check-box { width: 13px; height: 13px; border: 1.2px solid #64748b; display: inline-block; border-radius: 2px; vertical-align: middle; }
                .footer-wrap { margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px; page-break-inside: avoid; }
                .summary-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 8px; line-height: 1.35; }
                .ttd-block { width: 180px; text-align: center; font-size: 8px; }
                .ttd-space { height: 28px; }
                .ttd-line { border-bottom: 1px solid #333; font-weight: bold; padding-bottom: 2px; }
            </style>
        </head>
        <body>
            <div class="header-wrap">
                <div class="header-left">
                    <div class="header-brand"><span class="brand-wiz">WIZ</span><span class="brand-berau">BERAU</span></div>
                    <div class="header-title">
                        <h2>Lembar Checklist Penarikan Pundi ZIS</h2>
                        <p>Wahdah Inspirasi Zakat Gerai Berau • Bulan: ${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <div class="header-meta">
                    <div><b>Tanggal:</b> ${tglCetak}</div>
                    <div><b>Petugas:</b> ${printPetugasName}</div>
                    <div><b>Total Dicetak:</b> ${totalItem} Pundi ${rangeKeterangan}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="text-center run-no">No</th>
                        <th class="text-center" style="width: 10%;">Reg</th>
                        <th style="width: 22%;">Nama Usaha / Titik</th>
                        <th style="width: 20%;">Donatur & Kontak</th>
                        <th style="width: 23%;">Alamat Titik</th>
                        <th style="width: 13%;">Nominal (Rp)</th>
                        <th class="text-center" style="width: 7%;">Cek</th>
                    </tr>
                </thead>
                <tbody>
                    ${dataToPrint.map((p, idx) => `
                        <tr>
                            <td class="text-center run-no">${idx + 1}</td>
                            <td class="text-center no-col">#${p.noUrut || '-'}</td>
                            <td><b style="color: #0f172a;">${p.usaha || '-'}</b> ${p.zona ? `<span style="font-size:7px; background:#e0f2fe; color:#0369a1; padding:1px 3px; border-radius:3px;">${p.zona}</span>` : ''}</td>
                            <td>
                                <div class="cell-truncate"><b>${p.donorName || '-'}</b></div>
                                <div style="font-size: 7.5px; color: #64748b;">${p.phone || '-'}</div>
                            </td>
                            <td class="alamat-text">${p.alamat || '-'}</td>
                            <td style="font-size: 8.5px; color: #64748b;">Rp</td>
                            <td class="text-center"><span class="check-box"></span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer-wrap">
                <div class="summary-box">
                    <b>Catatan Sistem:</b> Data yang dicetak ini telah <b>otomatis berubah statusnya menjadi "Dalam Penjemputan"</b> di aplikasi.<br/>
                    Setelah penjemputan selesai, buka aplikasi menu Tugas dan klik <b>"Hitung Uang"</b> untuk memasukkan nominal.
                </div>
                <div class="ttd-block">
                    <p style="margin: 0;">Berau, ${tglCetak}</p>
                    <div class="ttd-space"></div>
                    <div class="ttd-line">(${printPetugasName})</div>
                    <span style="color: #64748b; font-size: 7.5px;">Petugas Penjemput Pundi</span>
                </div>
            </div>
        </body>
        </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const handlePrintNotaA4 = () => {
        let dataToPrint = [];
        if (selectedTaskIds.size > 0) {
            dataToPrint = activePundisSorted.filter(p => selectedTaskIds.has(p.id));
        } else {
            dataToPrint = filteredTugasPundis;
        }

        if (dataToPrint.length === 0) return;

        markAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        const tglHariIni = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '...................');

        const chunks = [];
        for (let i = 0; i < dataToPrint.length; i += 10) {
            chunks.push(dataToPrint.slice(i, i + 10));
        }

        let pagesHtml = chunks.map((group, pageIdx) => `
            <div class="a4-page">
                ${group.map((p, itemIdx) => {
                    const runningNumber = (pageIdx * 10) + itemIdx + 1;
                    return `
                    <div class="nota-card">
                        <div class="nota-header">
                            <div class="nota-brand">
                                <span class="brand-wiz">WIZ</span><span class="brand-berau">BERAU</span>
                                <span class="nota-title">BUKTI INFAQ / SEDEKAH PUNDI</span>
                            </div>
                            <div class="badge-urut">Cetak #${runningNumber} | Reg #${p.noUrut}</div>
                        </div>
                        
                        <div class="nota-body">
                            <div class="qr-col">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=WIZ-PUNDI-${p.id}&margin=0" alt="QR Pundi" class="qr-img" />
                                <span class="qr-id">ID: ${p.id}</span>
                            </div>
                            <div class="info-col">
                                <div class="info-row"><span class="label">Donatur</span>: <b>${p.donorName}</b></div>
                                <div class="info-row"><span class="label">Usaha</span>: <span>${p.usaha || '-'}</span></div>
                                <div class="info-row"><span class="label">Alamat</span>: <span class="alamat-text">${p.alamat || '-'}</span></div>
                                <div class="info-row"><span class="label">Tanggal</span>: <span>${tglHariIni}</span></div>
                                <div class="nominal-box">
                                    <span class="nominal-label">Jumlah:</span>
                                    <span class="nominal-line">Rp .............................................</span>
                                </div>
                            </div>
                        </div>

                        <div class="nota-footer">
                            <div class="ttd-col">
                                <p>Donatur / Toko</p>
                                <div class="ttd-line"></div>
                            </div>
                            <div class="ttd-doa">"Semoga Allah memberkahi harta yang dizakatkan & disedekahkan"</div>
                            <div class="ttd-col">
                                <p>Amil Petugas</p>
                                <div class="ttd-line">(${printPetugasName})</div>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `).join('');

        let html = `
        <html>
        <head>
            <title>Cetak Nota Pundi A4 - WIZ Berau</title>
            <style>
                @page { size: A4 portrait; margin: 6mm 7mm; }
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: #fff; }
                .a4-page { width: 100%; height: 284mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(5, 54mm); gap: 3.5mm; page-break-after: always; break-after: page; }
                .a4-page:last-child { page-break-after: avoid; break-after: avoid; }
                .nota-card { border: 1px dashed #4b5563; border-radius: 6px; padding: 5px 7px; display: flex; flex-direction: column; justify-content: space-between; background: #fff; overflow: hidden; position: relative; }
                .nota-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #27745F; padding-bottom: 3px; margin-bottom: 3px; }
                .nota-brand { font-size: 11px; font-weight: 900; line-height: 1.1; }
                .brand-wiz { color: #27745F; }
                .brand-berau { color: #F59121; margin-right: 5px; }
                .nota-title { font-size: 8px; font-weight: bold; color: #374151; letter-spacing: 0.3px; }
                .badge-urut { background: #27745F; color: #ffffff; font-weight: 900; font-size: 11px; padding: 1px 6px; border-radius: 4px; letter-spacing: 0.5px; }
                .nota-body { display: flex; gap: 6px; align-items: center; flex: 1; }
                .qr-col { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 135px; flex-shrink: 0; padding-right: 6px; }
                .qr-img { width: 130px; height: 130px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px; }
                .qr-id { font-size: 6.5px; color: #6b7280; margin-top: 2px; font-family: monospace; font-weight: bold; }
                .info-col { flex: 1; font-size: 8.5px; line-height: 1.25; }
                .info-row { margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-row .label { display: inline-block; width: 38px; color: #4b5563; font-weight: 600; }
                .alamat-text { color: #4b5563; font-size: 8px; }
                .nominal-box { margin-top: 2px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px 4px; display: flex; align-items: center; }
                .nominal-label { font-weight: 800; color: #166534; font-size: 8.5px; margin-right: 4px; }
                .nominal-line { font-weight: 900; color: #15803d; font-size: 9.5px; }
                .nota-footer { display: flex; justify-content: space-between; align-items: flex-end; font-size: 7.5px; border-top: 0.5px dotted #9ca3af; padding-top: 2px; margin-top: 2px; }
                .ttd-col { text-align: center; width: 65px; }
                .ttd-col p { margin: 0; color: #4b5563; font-weight: 600; font-size: 7px; }
                .ttd-line { height: 14px; border-bottom: 1px dotted #6b7280; margin-top: 1px; font-size: 7px; color: #374151; display: flex; align-items: flex-end; justify-content: center; }
                .ttd-doa { font-size: 6.5px; font-style: italic; color: #6b7280; text-align: center; max-width: 110px; line-height: 1.1; }
            </style>
        </head>
        <body>
            ${pagesHtml}
        </body>
        </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 800);
    };

    const savePundi = (formData, isEdit) => {
        const now = new Date().toISOString();
        const existing = isEdit ? (pundis || []).find(p => String(p.id) === String(formData.id)) : null;
        let newData = { 
            ...(existing || {}),
            ...formData, 
            tipePundi: formData.tipePundi || (existing && existing.tipePundi) || 'Pundi Umum',
            zona: (formData.zona || (existing && existing.zona) || 'SEKITAR TANJUNG').toString().trim().toUpperCase(),
            updatedAt: now 
        };
        if (!isEdit) {
            newData.id = Date.now();
            newData.createdAt = now;
            newData.createdBy = user?.name || 'Amil';
        }
        const updatedList = isEdit 
            ? (pundis || []).map(p => String(p.id) === String(newData.id) ? newData : p) 
            : [...(pundis || []), newData];
        setPundis(updatedList);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('Pundi', updatedList);
    };

    const deletePundi = (row) => {
        const updatedList = (pundis || []).filter(p => String(p.id) !== String(row.id));
        setPundis(updatedList);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('Pundi', updatedList);
    };

    const submitInputHasil = (formData) => {
        const now = new Date().toISOString();
        const transaction = {
            id: Date.now(),
            date: formData.date || now.split('T')[0],
            pundiId: selectedPundi.id,
            noUrut: selectedPundi.noUrut,
            donorName: selectedPundi.donorName,
            usaha: selectedPundi.usaha,
            amount: Number(formData.amount || 0),
            status: formData.status,
            amilName: user?.name || 'Amil',
            notes: formData.notes || '',
            receiptUrl: formData.receiptUrl || ''
        };
        const updatedRiwayat = [...(riwayatPundis || []), transaction];
        setRiwayatPundis(updatedRiwayat);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updatedRiwayat);
        setIsInputModalOpen(false);
    };

    const MasterPundiSchema = [
        { name: 'noUrut', label: 'Nomor Urut Penarikan (Angka)', type: 'number', required: true },
        { name: 'tipePundi', label: 'Jenis / Tipe Pundi', type: 'select', options: ['Pundi Umum', 'Pundi Pribadi'], required: true },
        { name: 'zona', label: 'Zona Wilayah Pundi (Pilih / Ketik Manual)', type: 'datalist', options: allZonaOptions, required: true },
        { name: 'donorName', label: 'Nama Donatur (Ketik Manual)', type: 'text', required: true },
        { name: 'phone', label: 'Nomor Telp / WhatsApp', type: 'text', required: true },
        { name: 'usaha', label: 'Nama Usaha / Lokasi Titik', required: true },
        { name: 'status', label: 'Status Pundi', type: 'select', options: ['Aktif', 'Ditarik'], required: true },
        { name: 'alamat', label: 'Alamat Spesifik Pundi', type: 'berau_address', fullWidth: true, required: true },
        { name: 'mapUrl', label: 'Titik Lokasi Google Maps (GPS)', type: 'map_location', fullWidth: true }
    ];

    const MasterPundiColumns = [
        { key: 'noUrut', label: 'No. Urut', render: r => <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg font-black text-gray-700 dark:text-gray-300">{r.noUrut}</span> },
        { key: 'donorName', label: 'Identitas & Lokasi', render: r => (
            <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-gray-800 dark:text-gray-100">{r.donorName}</p>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.tipePundi === 'Pundi Pribadi' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>
                        {r.tipePundi || 'Pundi Umum'}
                    </span>
                    {r.zona && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <i className="fa-solid fa-location-dot mr-0.5"></i> {r.zona}
                        </span>
                    )}
                </div>
                <p className="text-xs text-wiz-orange dark:text-amber-400 font-medium mt-0.5"><i className="fa-solid fa-store mr-1"></i> {r.usaha}</p>
                {r.phone && <p className="text-[11px] text-gray-500 mt-0.5"><i className="fa-brands fa-whatsapp text-green-500 mr-1"></i> {r.phone}</p>}
            </div>
        )},
        { key: 'alamat', label: 'Alamat & Titik Peta', render: r => (
            <div className="space-y-1">
                <span className="truncate max-w-[200px] block text-gray-500">{r.alamat}</span>
                {r.mapUrl ? (() => {
                    const mapUrls = typeof parseMapUrls === 'function' ? parseMapUrls(r.mapUrl) : { navUrl: r.mapUrl, webUrl: r.mapUrl };
                    return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                                href={mapUrls.navUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-wiz-green/10 text-wiz-green dark:text-emerald-400 text-[11px] font-bold hover:bg-wiz-green hover:text-white transition-colors border border-wiz-green/20"
                                title="Buka di HP"
                            >
                                <i className="fa-solid fa-mobile-screen"></i> Di HP
                            </a>
                            <a
                                href={mapUrls.webUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800"
                                title="Buka di Web Maps"
                            >
                                <i className="fa-solid fa-globe"></i> Web Maps
                            </a>
                        </div>
                    );
                })() : (
                    <span className="text-[10px] text-gray-400 italic">Belum ada titik GPS</span>
                )}
            </div>
        )},
        { key: 'status', label: 'Status', render: r => <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Aktif' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-red-50 text-red-500'}`}>{r.status}</span> },
        { key: 'createdBy', label: 'Dibuat Oleh', render: r => {
            const creator = r.createdBy || (contacts || []).find(c => c.name === r.donorName)?.createdBy;
            return (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center text-[10px] font-bold">
                        {creator ? creator.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{creator || '-'}</span>
                </div>
            );
        }},
        { key: 'print', label: 'QR', render: r => (
            <button onClick={() => setPrintQR(r)} className="p-2 text-wiz-orange hover:bg-wiz-orange/10 rounded-lg transition-colors" title="Cetak Stiker QR">
                <i className="fa-solid fa-qrcode text-lg"></i>
            </button>
        )}
    ];

    return (
        <div className="space-y-6 slide-up relative">
            {/* Header Manajemen Pundi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100"><i className="fa-solid fa-box-open text-wiz-orange mr-2"></i> Manajemen Pundi WIZ</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem kontrol dan pencatatan donatur kotak pundi.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsTargetModalOpen(true)}
                        variant="secondary"
                        className="shadow-sm font-bold text-xs py-2.5 px-3.5 border-wiz-green/30 text-wiz-green hover:bg-wiz-green/10"
                        icon="fa-solid fa-bullseye"
                    >
                        🎯 Atur / Target Pundi
                    </Button>

                    <Button 
                        onClick={() => setActiveTab('scanner')} 
                        variant="primary" 
                        className="hidden lg:flex shadow-md shadow-wiz-green/30 px-5"
                        icon="fa-solid fa-camera"
                    >
                        Buka Kamera (Scan QR)
                    </Button>

                    {isAdmin ? (
                        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-wiz-green/10 text-wiz-green dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                                <i className="fa-solid fa-user-tag"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tampilkan Amil</p>
                                <select
                                    value={selectedAmilFilter}
                                    onChange={(e) => setSelectedAmilFilter(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-gray-800 dark:text-gray-100 outline-none cursor-pointer"
                                >
                                    <option value="Semua" className="dark:bg-gray-800">Semua Amil (Kolektif)</option>
                                    {allAmilNames.map((name, idx) => (
                                        <option key={idx} value={name} className="dark:bg-gray-800">Amil: {name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedAmilFilter !== 'Semua' && (
                                <button
                                    onClick={() => setSelectedAmilFilter('Semua')}
                                    className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors ml-1"
                                    title="Kembalikan ke Semua Amil"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-wiz-green/10 dark:bg-emerald-900/30 border border-wiz-green/20 dark:border-emerald-800/50 px-4 py-2 rounded-2xl">
                            <div className="w-9 h-9 rounded-xl bg-wiz-green text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                <i className="fa-solid fa-user-check"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-wiz-green_dark dark:text-emerald-300 uppercase tracking-wider">Amil Petugas</p>
                                <p className="text-sm font-black text-wiz-green dark:text-emerald-400">{user?.name}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Navigasi Sub Tab */}
            <div className="flex overflow-x-auto gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm w-full hide-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard Analitik', icon: 'fa-chart-pie' },
                    { id: 'tugas', label: 'Tugas Penarikan', icon: 'fa-clipboard-list' },
                    { id: 'master', label: 'Data Master Pundi', icon: 'fa-boxes-stacked' },
                    { id: 'riwayat', label: 'Riwayat Sedekah', icon: 'fa-money-bill-wave' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-wiz-green text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                    </button>
                ))}
            </div>

            {/* =========================================================
                TAB 1: DASHBOARD ANALITIK PUNDI
               ========================================================= */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-6 animate-in">
                    {/* Filter Periode Bulan & Tahun */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm"><i className="fa-solid fa-filter text-wiz-green mr-1.5"></i> Filter Periode Analitik</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Pilih bulan dan tahun untuk menyesuaikan data aktivitas dan penarikan.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select 
                                value={dashMonth} 
                                onChange={(e) => setDashMonth(e.target.value === 'Semua' ? 'Semua' : Number(e.target.value))} 
                                className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:ring-2 focus:ring-wiz-green"
                            >
                                <option value="Semua" className="dark:bg-gray-800">Semua Bulan</option>
                                {monthNames.map((m, idx) => <option key={idx} value={idx} className="dark:bg-gray-800">{m}</option>)}
                            </select>
                            <select 
                                value={dashYear} 
                                onChange={(e) => setDashYear(Number(e.target.value))} 
                                className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:ring-2 focus:ring-wiz-green"
                            >
                                {yearOptions.map(y => <option key={y} value={y} className="dark:bg-gray-800">{y}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Banner Target Terpadu Pundi Mandiri */}
                    <div className="p-6 bg-gradient-to-r from-wiz-green_dark via-wiz-green to-teal-700 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 text-9xl text-white/10 pointer-events-none">
                            <i className="fa-solid fa-bullseye"></i>
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider mb-2">
                                    <i className="fa-solid fa-bullseye"></i> Target: {dashMonth === 'Semua' ? `Semua Bulan ${dashYear}` : `${monthNames[dashMonth]} ${dashYear}`}
                                </div>
                                <h3 className="text-3xl font-black">{typeof formatRp === 'function' ? formatRp(stats.totalDanaBulanIni) : stats.totalDanaBulanIni}</h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/90 text-xs mt-1.5">
                                    <span>Target Periode: <b>{typeof formatRp === 'function' ? formatRp(stats.totalTargetPeriode) : stats.totalTargetPeriode}</b></span>
                                    <span>•</span>
                                    <span>Harian: <b>{typeof formatRp === 'function' ? formatRp(stats.totalTargetHarian) : stats.totalTargetHarian}</b></span>
                                    <span>•</span>
                                    <span>Tahunan: <b>{typeof formatRp === 'function' ? formatRp(stats.totalTargetTahunan) : stats.totalTargetTahunan}</b></span>
                                </div>
                                <p className="text-[11px] text-white/75 mt-1 flex items-center gap-1.5">
                                    <i className="fa-regular fa-calendar-check text-[10px]"></i>
                                    Masa Target: <b>{typeof formatDate === 'function' ? formatDate(targetConfig.startDate) : targetConfig.startDate}</b> s/d <b>{typeof formatDate === 'function' ? formatDate(targetConfig.endDate) : targetConfig.endDate}</b>
                                </p>
                            </div>

                            <div className="bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-white/75">Capaian</p>
                                    <p className="text-2xl font-black text-amber-300">{stats.percentTotal}%</p>
                                </div>
                                <button 
                                    onClick={() => setIsTargetModalOpen(true)}
                                    className="px-3 py-1.5 bg-white text-wiz-green hover:bg-gray-100 rounded-xl text-xs font-bold shadow-md transition-colors"
                                >
                                    Ubah Target
                                </button>
                            </div>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-2 mt-5 relative z-10 overflow-hidden">
                            <div className="bg-white h-2 rounded-full transition-all duration-1000 shadow-md" style={{ width: `${stats.percentTotal}%` }}></div>
                        </div>
                    </div>

                    {/* Grid Kartu Nominal Terkumpul & Target (Umum vs Pribadi & Belum Dijemput) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Pundi Umum */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-md">
                                        <i className="fa-solid fa-store mr-1"></i> Pundi Umum
                                    </span>
                                    <span className="text-xs font-black text-blue-600">{stats.percentUmum}%</span>
                                </div>
                                <p className="text-xs text-gray-400">Terkumpul Periode Ini:</p>
                                <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-0.5">
                                    {typeof formatRp === 'function' ? formatRp(stats.danaUmum) : stats.danaUmum}
                                </h4>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                                    <span>Target: {typeof formatRp === 'function' ? formatRp(stats.targetUmumPeriode) : stats.targetUmumPeriode}</span>
                                    <span>{stats.totalUmum} Kotak</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                                    <span>Harian: {typeof formatRp === 'function' ? formatRp(targetConfig.umumHarian) : targetConfig.umumHarian}</span>
                                    <span>Tahunan: {typeof formatRp === 'function' ? formatRp(targetConfig.umumTahunan) : targetConfig.umumTahunan}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats.percentUmum}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Pundi Pribadi */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 rounded-md">
                                        <i className="fa-solid fa-house-user mr-1"></i> Pundi Pribadi
                                    </span>
                                    <span className="text-xs font-black text-purple-600">{stats.percentPribadi}%</span>
                                </div>
                                <p className="text-xs text-gray-400">Terkumpul Periode Ini:</p>
                                <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-0.5">
                                    {typeof formatRp === 'function' ? formatRp(stats.danaPribadi) : stats.danaPribadi}
                                </h4>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                                    <span>Target: {typeof formatRp === 'function' ? formatRp(stats.targetPribadiPeriode) : stats.targetPribadiPeriode}</span>
                                    <span>{stats.totalPribadi} Kotak</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                                    <span>Harian: {typeof formatRp === 'function' ? formatRp(targetConfig.pribadiHarian) : targetConfig.pribadiHarian}</span>
                                    <span>Tahunan: {typeof formatRp === 'function' ? formatRp(targetConfig.pribadiTahunan) : targetConfig.pribadiTahunan}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.percentPribadi}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Pundi Belum Dijemput (Klik untuk lihat daftar) */}
                        <div 
                            onClick={() => setIsBelumDijemputModalOpen(true)}
                            className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-800 p-5 rounded-3xl border border-amber-200 dark:border-amber-800 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-amber-400 transition-all group"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-md">
                                        <i className="fa-solid fa-clock mr-1"></i> Belum Dijemput
                                    </span>
                                    <span className="text-xs text-amber-500 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                        Lihat <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Antrean Kotak:</p>
                                <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                    {stats.belumDijemputCount} <span className="text-xs font-bold text-gray-400">Kotak</span>
                                </h4>
                            </div>
                            <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-900/50 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold">
                                <span>Perlu dikunjungi</span>
                                <i className="fa-solid fa-hand-holding-box text-sm"></i>
                            </div>
                        </div>

                        {/* Status Lapangan */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2.5 py-0.5 rounded-md">
                                        <i className="fa-solid fa-truck mr-1"></i> Penjemputan
                                    </span>
                                    <i className="fa-solid fa-clipboard-check text-gray-300 text-lg"></i>
                                </div>
                                <p className="text-xs text-gray-400">Progress Penarikan:</p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl text-center">
                                        <span className="text-[10px] font-bold uppercase text-yellow-600">Dijemput</span>
                                        <p className="text-lg font-black text-yellow-700 dark:text-yellow-400">{stats.sedangDijemput}</p>
                                    </div>
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-center">
                                        <span className="text-[10px] font-bold uppercase text-wiz-green">Selesai</span>
                                        <p className="text-lg font-black text-wiz-green dark:text-emerald-400">{stats.berhasil}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-2 text-[11px] text-gray-400 text-center border-t border-gray-100 dark:border-gray-700/60">
                                Total Aktif: <b>{stats.totalAktif}</b> Kotak Pundi
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                TAB 2: TUGAS PENARIKAN (DENGAN FILTER ZONA & CHECKBOX)
               ========================================================= */}
            {activeSubTab === 'tugas' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 animate-in space-y-5">
                    {/* Header Tugas */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Antrean Penarikan Bulan Ini</h3>
                            <p className="text-sm text-gray-500">
                                {selectedTaskIds.size > 0 ? (
                                    <span className="font-bold text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2.5 py-0.5 rounded-md">
                                        {selectedTaskIds.size} Pundi Terpilih (Centang Tersimpan)
                                    </span>
                                ) : (
                                    <span>Tersedia {filteredTugasPundis.length} dari {activePundisSorted.length} pundi siap cetak/dikunjungi.</span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={toggleSelectAllFiltered} 
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                <i className={`fa-solid ${filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id)) ? 'fa-square-check text-wiz-green' : 'fa-square'}`}></i>
                                <span>{filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id)) ? 'Batal Pilih Hasil' : 'Pilih Semua Hasil'}</span>
                            </button>
                            <Button onClick={() => setIsQuickScanOpen(true)} icon="fa-solid fa-qrcode" variant="accent" className="text-xs shadow-md">Pindai</Button>
                            <Button onClick={handlePrintChecklist} icon="fa-solid fa-clipboard-check" variant="secondary" className="text-xs" disabled={filteredTugasPundis.length === 0 && selectedTaskIds.size === 0}>
                                Cetak Checklist ({selectedTaskIds.size > 0 ? selectedTaskIds.size : filteredTugasPundis.length})
                            </Button>
                            <Button onClick={handlePrintNotaA4} icon="fa-solid fa-receipt" variant="primary" className="text-xs" disabled={filteredTugasPundis.length === 0 && selectedTaskIds.size === 0}>
                                Cetak Nota ({selectedTaskIds.size > 0 ? selectedTaskIds.size : filteredTugasPundis.length})
                            </Button>
                        </div>
                    </div>

                    {/* Baris Filter Tugas (Pencarian + Tipe + Zona + Urut + Status) */}
                    <div className="bg-gray-50/70 dark:bg-gray-700/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Input Pencarian */}
                        <div className="w-full md:w-64 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <i className="fa-solid fa-magnifying-glass text-xs"></i>
                            </div>
                            <input
                                type="text"
                                value={searchTugas}
                                onChange={(e) => setSearchTugas(e.target.value)}
                                placeholder="Cari No, donatur, usaha, zona..."
                                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100"
                            />
                            {searchTugas && (
                                <button onClick={() => setSearchTugas('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600">
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            )}
                        </div>

                        {/* Filter Tipe, Zona, Rentang Urut, & Status */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between sm:justify-end">
                            {/* Filter Tipe */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <i className="fa-solid fa-tags text-xs text-wiz-green"></i>
                                <select
                                    value={tipeTugasFilter}
                                    onChange={(e) => setTipeTugasFilter(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                >
                                    <option value="Semua" className="dark:bg-gray-800">Semua Tipe</option>
                                    <option value="Pundi Umum" className="dark:bg-gray-800">Pundi Umum</option>
                                    <option value="Pundi Pribadi" className="dark:bg-gray-800">Pundi Pribadi</option>
                                </select>
                            </div>

                            {/* Filter Zona */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <i className="fa-solid fa-map-location-dot text-xs text-amber-500"></i>
                                <select
                                    value={zonaTugasFilter}
                                    onChange={(e) => setZonaTugasFilter(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                >
                                    <option value="Semua" className="dark:bg-gray-800">Semua Zona</option>
                                    {allZonaOptions.map(z => <option key={z} value={z} className="dark:bg-gray-800">{z}</option>)}
                                </select>
                            </div>

                            {/* Rentang Urut */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <i className="fa-solid fa-arrow-down-1-9 text-xs text-wiz-green"></i>
                                <input 
                                    type="number"
                                    value={urutAwal}
                                    onChange={(e) => setUrutAwal(e.target.value)}
                                    placeholder="Awal"
                                    className="w-12 px-1 py-0.5 text-xs text-center font-bold bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded outline-none"
                                />
                                <span className="text-xs text-gray-400 font-bold">-</span>
                                <input 
                                    type="number"
                                    value={urutAkhir}
                                    onChange={(e) => setUrutAkhir(e.target.value)}
                                    placeholder="Akhir"
                                    className="w-12 px-1 py-0.5 text-xs text-center font-bold bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded outline-none"
                                />
                            </div>

                            {/* Status */}
                            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800 shadow-sm">
                                {[
                                    { id: 'Semua', label: 'Semua' },
                                    { id: 'Belum', label: 'Belum' },
                                    { id: 'Dijemput', label: 'Dijemput' },
                                    { id: 'Sudah Ditarik', label: 'Selesai' }
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setStatusTugasFilter(item.id)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${statusTugasFilter === item.id ? 'bg-wiz-green text-white shadow-sm' : 'text-gray-500'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* TAMPILAN LIST TUGAS MOBILE */}
                    <div className="block md:hidden space-y-3">
                        {filteredTugasPundis.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-xs">
                                Tidak ada tugas pundi yang cocok dengan filter.
                            </div>
                        ) : filteredTugasPundis.map(p => {
                            const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
                            const tStatus = currentRecord ? currentRecord.status : 'Belum';
                            const isChecked = selectedTaskIds.has(p.id);

                            return (
                                <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isChecked ? 'bg-wiz-green/10 border-wiz-green ring-1 ring-wiz-green' : tStatus === 'Berhasil' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200' : tStatus === 'Dijemput' ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelectTask(p.id)}
                                                className="w-5 h-5 text-wiz-green rounded cursor-pointer accent-wiz-green"
                                            />
                                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${tStatus === 'Berhasil' ? 'bg-wiz-green text-white' : tStatus === 'Dijemput' ? 'bg-yellow-500 text-white' : 'bg-wiz-orange/15 text-wiz-orange'}`}>
                                                #{p.noUrut}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{p.usaha}</h4>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${p.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {p.tipePundi === 'Pundi Pribadi' ? 'Pribadi' : 'Umum'}
                                                    </span>
                                                    {p.zona && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                                            {p.zona}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{p.donorName}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <StatusBadge text={tStatus === 'Sudah Ditarik' ? 'Berhasil' : tStatus} />
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-start gap-1.5 line-clamp-2">
                                        <i className="fa-solid fa-location-dot text-red-400 mt-0.5 shrink-0"></i>
                                        <span>{p.alamat}</span>
                                    </p>

                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                                        <div className="flex items-center gap-1.5">
                                            {p.phone && (
                                                <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1">
                                                    <i className="fa-brands fa-whatsapp"></i> WA
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {tStatus === 'Berhasil' ? (
                                                <button onClick={() => handleOpenEditRiwayat(currentRecord)} className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-xl text-xs font-bold">
                                                    Edit Hasil
                                                </button>
                                            ) : tStatus === 'Dijemput' ? (
                                                <button onClick={() => handleOpenEditRiwayat(currentRecord)} className="px-3 py-1.5 text-white bg-wiz-green rounded-xl text-xs font-bold shadow-sm">
                                                    Hitung Uang
                                                </button>
                                            ) : (
                                                <Button onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} variant="accent" className="text-xs py-1.5 px-3">
                                                    Jemput
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* TAMPILAN TABEL DESKTOP */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-center" style={{ width: '40px' }}>
                                        <input 
                                            type="checkbox"
                                            checked={filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id))}
                                            onChange={toggleSelectAllFiltered}
                                            className="w-4 h-4 text-wiz-green rounded cursor-pointer accent-wiz-green"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-center">Urut</th>
                                    <th className="px-4 py-3">Lokasi / Usaha & Zona</th>
                                    <th className="px-4 py-3">Donatur & Alamat</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {filteredTugasPundis.length === 0 ? (
                                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Tidak ada data pundi yang cocok.</td></tr>
                                ) : filteredTugasPundis.map(p => {
                                    const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
                                    const tStatus = currentRecord ? currentRecord.status : 'Belum';
                                    const isChecked = selectedTaskIds.has(p.id);

                                    return (
                                        <tr key={p.id} className={`hover:bg-wiz-light dark:hover:bg-gray-700/50 ${isChecked ? 'bg-wiz-green/10' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelectTask(p.id)}
                                                    className="w-4 h-4 text-wiz-green rounded cursor-pointer accent-wiz-green"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-gray-400">#{p.noUrut}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-800 dark:text-gray-100">{p.usaha}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {p.tipePundi || 'Pundi Umum'}
                                                    </span>
                                                    {p.zona && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            {p.zona}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-xs text-gray-700 dark:text-gray-200">{p.donorName}</p>
                                                <p className="text-[11px] text-gray-400 truncate max-w-xs">{p.alamat}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <StatusBadge text={tStatus === 'Sudah Ditarik' ? 'Berhasil' : tStatus} />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {tStatus === 'Berhasil' ? (
                                                    <button onClick={() => handleOpenEditRiwayat(currentRecord)} className="px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold">
                                                        Edit Hasil
                                                    </button>
                                                ) : tStatus === 'Dijemput' ? (
                                                    <button onClick={() => handleOpenEditRiwayat(currentRecord)} className="px-2.5 py-1 text-white bg-wiz-green hover:bg-wiz-green_dark rounded-lg text-xs font-bold shadow-sm">
                                                        Hitung Uang
                                                    </button>
                                                ) : (
                                                    <Button onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} variant="accent" className="text-xs py-1 px-3">
                                                        Jemput
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =========================================================
                TAB 3: DATA MASTER PUNDI (DENGAN ZONA BEBAS KETIK)
               ========================================================= */}
            {activeSubTab === 'master' && (
                <div className="space-y-4 animate-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search Master */}
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                                <input
                                    type="text"
                                    value={searchMaster}
                                    onChange={(e) => setSearchMaster(e.target.value)}
                                    placeholder="Cari No, donatur, usaha, alamat, zona..."
                                    className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wiz-green"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Filter Zona Master */}
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-map-location-dot text-xs text-amber-500"></i>
                                    <select
                                        value={zonaMasterFilter}
                                        onChange={(e) => setZonaMasterFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Zona</option>
                                        {allZonaOptions.map(z => <option key={z} value={z} className="dark:bg-gray-800">{z}</option>)}
                                    </select>
                                </div>

                                {/* Filter Tipe */}
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-tags text-xs text-gray-400"></i>
                                    <select
                                        value={tipeMasterFilter}
                                        onChange={(e) => setTipeMasterFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Tipe</option>
                                        <option value="Pundi Umum" className="dark:bg-gray-800">Pundi Umum</option>
                                        <option value="Pundi Pribadi" className="dark:bg-gray-800">Pundi Pribadi</option>
                                    </select>
                                </div>

                                {/* Filter Status */}
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <select
                                        value={statusMasterFilter}
                                        onChange={(e) => setStatusMasterFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Status</option>
                                        <option value="Aktif" className="dark:bg-gray-800">Aktif</option>
                                        <option value="Ditarik" className="dark:bg-gray-800">Ditarik</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ModuleView 
                        title="Data Kotak Pundi" 
                        data={filteredMasterPundis} 
                        columns={MasterPundiColumns} 
                        schema={MasterPundiSchema} 
                        defaultValues={{ noUrut: nextNoUrut, status: 'Aktif', tipePundi: 'Pundi Umum', zona: 'SEKITAR TANJUNG' }}
                        onSave={savePundi} 
                        onDelete={isAdmin ? deletePundi : null} 
                        canDelete={isAdmin}
                    />
                </div>
            )}

            {/* =========================================================
                TAB 4: RIWAYAT SEDEKAH PUNDI
               ========================================================= */}
            {activeSubTab === 'riwayat' && (
                <div className="animate-in space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    value={searchRiwayat}
                                    onChange={(e) => setSearchRiwayat(e.target.value)}
                                    placeholder="Cari donatur, usaha, no pundi..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-calendar-days text-xs text-gray-400"></i>
                                    <select
                                        value={monthRiwayatFilter}
                                        onChange={(e) => setMonthRiwayatFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Bulan</option>
                                        {uniqueMonths.map(([key, label]) => <option key={key} value={key} className="dark:bg-gray-800">{label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <select
                                        value={statusRiwayatFilter}
                                        onChange={(e) => setStatusRiwayatFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Status</option>
                                        <option value="Berhasil" className="dark:bg-gray-800">Berhasil (Dihitung)</option>
                                        <option value="Dijemput" className="dark:bg-gray-800">Dijemput</option>
                                        <option value="Gagal" className="dark:bg-gray-800">Gagal</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Table 
                        columns={[
                            { key: 'date', label: 'Tanggal', render: r => typeof formatDate === 'function' ? formatDate(r.date) : r.date },
                            { key: 'donorName', label: 'Donatur & Usaha', render: r => <div><p className="font-bold">{r.donorName}</p><p className="text-xs text-gray-500">{r.usaha} (#{r.noUrut})</p></div> },
                            { key: 'amount', label: 'Nominal', render: r => <span className="font-bold text-wiz-green dark:text-emerald-400">{typeof formatRp === 'function' ? formatRp(r.amount) : r.amount}</span> },
                            { key: 'status', label: 'Status', render: r => <StatusBadge text={r.status} /> },
                            { key: 'amilName', label: 'Amil Petugas' },
                            { key: 'notes', label: 'Catatan', render: r => <span className="text-xs text-gray-500">{r.notes || '-'}</span> }
                        ]}
                        data={[...filteredRiwayatPundis].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))}
                        onEdit={handleOpenEditRiwayat}
                        onDelete={isAdmin ? deleteRiwayat : null}
                    />
                </div>
            )}

            {/* =========================================================
                MODAL 1: PENGATURAN TARGET KHUSUS PUNDI (MANDIRI)
               ========================================================= */}
            <Modal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} title="Pengaturan Target Pundi (Harian, Bulanan, Tahunan)">
                <form onSubmit={saveTargetConfig} className="space-y-4">
                    <div className="p-3.5 bg-wiz-green/5 dark:bg-emerald-950/30 rounded-2xl border border-wiz-green/20">
                        <p className="text-xs text-wiz-green dark:text-emerald-400 font-semibold leading-relaxed">
                            <i className="fa-solid fa-bullseye mr-1.5"></i> Tentukan target penarikan <b>Harian, Bulanan, dan Tahunan</b> serta masa berlaku target. Target bulanan akan otomatis terhubung ke perhitungan persentase Dashboard sesuai bulan yang Anda pilih.
                        </p>
                    </div>

                    {/* Masa Berlaku Target */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-600 space-y-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                            <i className="fa-regular fa-calendar-days text-wiz-green"></i> Masa Periode Target
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tanggal Mulai</label>
                                <input 
                                    type="date" 
                                    name="startDate" 
                                    required 
                                    defaultValue={targetConfig.startDate} 
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tanggal Akhir</label>
                                <input 
                                    type="date" 
                                    name="endDate" 
                                    required 
                                    defaultValue={targetConfig.endDate} 
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Target Pundi Umum */}
                    <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                                <i className="fa-solid fa-store"></i> Target Pundi Umum (Toko / Usaha)
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Harian (Rp)</label>
                                <input 
                                    type="text" 
                                    name="targetUmumHarian" 
                                    required 
                                    defaultValue={Number(targetConfig.umumHarian || 0).toLocaleString('id-ID')}
                                    onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl font-bold text-blue-600 text-xs outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulanan (Rp)</label>
                                <input 
                                    type="text" 
                                    name="targetUmumBulanan" 
                                    required 
                                    defaultValue={Number(targetConfig.umumBulanan || 0).toLocaleString('id-ID')}
                                    onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl font-bold text-blue-600 text-xs outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahunan (Rp)</label>
                                <input 
                                    type="text" 
                                    name="targetUmumTahunan" 
                                    required 
                                    defaultValue={Number(targetConfig.umumTahunan || 0).toLocaleString('id-ID')}
                                    onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl font-bold text-blue-600 text-xs outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Target Pundi Pribadi */}
                    <div className="bg-purple-50/60 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                                <i className="fa-solid fa-house-user"></i> Target Pundi Pribadi (Rumah Tangga)
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Harian (Rp)</label>
                                <input 
                                    type="text" 
                                    name="targetPribadiHarian" 
                                    required 
                                    defaultValue={Number(targetConfig.pribadiHarian || 0).toLocaleString('id-ID')}
                                    onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl font-bold text-purple-600 text-xs outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulanan (Rp)</label>
                                <input 
                                    type="text" 
                                    name="targetPribadiBulanan" 
                                    required 
                                    defaultValue={Number(targetConfig.pribadiBulanan || 0).toLocaleString('id-ID')}
                                    onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl font-bold text-purple-600 text-xs outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahunan (Rp)</label>
                                <input 
                                    type="text" 
                                    name="targetPribadiTahunan" 
                                    required 
                                    defaultValue={Number(targetConfig.pribadiTahunan || 0).toLocaleString('id-ID')}
                                    onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl font-bold text-purple-600 text-xs outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Button variant="secondary" onClick={() => setIsTargetModalOpen(false)}>Tutup</Button>
                        <Button type="submit" variant="primary">Simpan Target</Button>
                    </div>
                </form>
            </Modal>

            {/* =========================================================
                MODAL 2: DAFTAR PUNDI BELUM DIJEMPUT
               ========================================================= */}
            <Modal isOpen={isBelumDijemputModalOpen} onClose={() => setIsBelumDijemputModalOpen(false)} title={`Daftar Pundi Belum Dijemput (${stats.belumDijemputCount})`}>
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">Berikut adalah daftar kotak pundi aktif yang belum ditarik pada bulan yang dipilih:</p>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {stats.belumDijemputCount === 0 ? (
                            <div className="p-6 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl text-xs">
                                <i className="fa-solid fa-circle-check text-wiz-green text-3xl mb-2"></i>
                                <p className="font-bold">Alhamdulillah! Semua pundi aktif pada periode ini sudah berhasil ditarik.</p>
                            </div>
                        ) : (
                            stats.pundiBelumDijemputList.map(p => (
                                <div key={p.id} className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-black text-xs text-wiz-green">#{p.noUrut}</span>
                                            <span className="font-bold text-xs text-gray-800 dark:text-gray-100">{p.usaha}</span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">{p.tipePundi || 'Umum'}</span>
                                            {p.zona && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-600 font-bold">{p.zona}</span>}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{p.donorName} • {p.alamat}</p>
                                    </div>
                                    <Button 
                                        variant="accent" 
                                        className="text-[10px] py-1 px-2.5 shrink-0" 
                                        onClick={() => { setIsBelumDijemputModalOpen(false); setSelectedPundi(p); setIsInputModalOpen(true); }}
                                    >
                                        Jemput
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* =========================================================
                MODAL 3: INPUT / EDIT HASIL PENARIKAN PUNDI
               ========================================================= */}
            <Modal isOpen={isInputModalOpen || isEditRiwayatOpen} onClose={() => { setIsInputModalOpen(false); setIsEditRiwayatOpen(false); setSelectedPundi(null); setEditingRiwayat(null); }} title={selectedPundi ? `Penarikan: ${selectedPundi.usaha}` : `Edit Hasil: ${editingRiwayat?.usaha || ''}`}>
                {(selectedPundi || editingRiwayat) && (
                    <DynamicForm 
                        schema={[
                            { name: 'date', label: 'Tanggal Penarikan', type: 'date', required: true },
                            { name: 'status', label: 'Status Penjemputan', type: 'select', options: [{value: 'Dijemput', label: 'Kotak Dijemput (Hitung Nanti)'}, {value: 'Berhasil', label: 'Langsung Dihitung (Selesai)'}, {value: 'Gagal', label: 'Gagal / Pundi Kosong'}], required: true },
                            { name: 'amount', label: 'Nominal Uang (Rp) - Jika Dihitung', isCurrency: true },
                            { name: 'receiptUrl', label: 'Foto Bukti / Nota (Opsional)', type: 'file', fullWidth: true },
                            { name: 'notes', label: 'Catatan Keterangan', type: 'textarea' }
                        ]}
                        initialData={editingRiwayat}
                        defaultValues={{ date: new Date().toISOString().split('T')[0], status: 'Dijemput' }}
                        onSubmit={editingRiwayat ? saveEditRiwayat : submitInputHasil}
                        onCancel={() => { setIsInputModalOpen(false); setIsEditRiwayatOpen(false); setSelectedPundi(null); setEditingRiwayat(null); }}
                    />
                )}
            </Modal>

            {/* =========================================================
                MODAL 4: SCAN QR CEPAT
               ========================================================= */}
            <Modal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} title="Pindai QR Pundi (Penjemputan)">
                <div className="flex flex-col items-center justify-center pt-2 pb-4 px-2">
                    <p className="text-xs text-gray-500 text-center mb-4">Arahkan kamera ke stiker QR untuk menjemput kotak ini.</p>
                    <div className="w-full max-w-sm">
                        <Html5QrcodePlugin qrCodeSuccessCallback={handleQuickScan} />
                    </div>
                    <div className="w-full mt-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Atau Ketik Nomor Urut Manual</p>
                        <input
                            type="text"
                            onChange={(e) => handleQuickScan(e.target.value)}
                            placeholder="Contoh: 5"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-center font-mono text-sm focus:ring-2 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100 font-bold"
                        />
                    </div>
                </div>
            </Modal>

            {/* =========================================================
                MODAL 5: CETAK STIKER QR PUNDI
               ========================================================= */}
            <Modal isOpen={!!printQR} onClose={() => setPrintQR(null)} title="Cetak Stiker Pundi">
                {printQR && (
                    <div className="flex flex-col items-center space-y-6">
                        <div id="print-qr-area" className="w-72 bg-white border-2 border-wiz-green rounded-3xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-wiz-orange"></div>
                            <img src="https://drive.google.com/uc?id=1V34EDnLvk3ORldMA7-5v3AnS5RN5E3GH" alt="Logo WIZ" className="h-10 mb-4" />
                            <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight mb-1">{printQR.tipePundi === 'Pundi Pribadi' ? 'Pundi Pribadi' : 'Kotak Amal'}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Wahdah Inspirasi Zakat</p>
                            
                            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-4">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WIZ-PUNDI-${printQR.id}&margin=0`} alt="QR Code Pundi" className="w-32 h-32" />
                            </div>
                            
                            <div className="bg-wiz-green/10 text-wiz-green_dark w-full py-2.5 rounded-xl mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-70">Nomor Registrasi</p>
                                <p className="text-3xl font-black">{printQR.noUrut}</p>
                            </div>
                            <p className="font-bold text-gray-800 text-sm line-clamp-2 mt-2">{printQR.usaha}</p>
                            <p
