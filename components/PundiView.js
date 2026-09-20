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

    // Modal & Konfigurasi Pengaturan Target Mandiri Pundi
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [targetConfig, setTargetConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('wiz_target_pundi_config');
            return saved ? JSON.parse(saved) : { umum: 25000000, pribadi: 10000000 };
        } catch(e) {
            return { umum: 25000000, pribadi: 10000000 };
        }
    });

    const ZONA_OPTIONS = [
        'SEKITAR TANJUNG',
        'MALAM',
        'KOTAK AMAL',
        'PASAR',
        'SEGAH',
        'TANJUNG BATU',
        'BIDUK-BIDUK'
    ];

    // State Filter Master Pundi
    const [searchMaster, setSearchMaster] = useState('');
    const [statusMasterFilter, setStatusMasterFilter] = useState('Semua');
    const [creatorMasterFilter, setCreatorMasterFilter] = useState('Semua');
    const [tipeMasterFilter, setTipeMasterFilter] = useState('Semua');
    const [zonaMasterFilter, setZonaMasterFilter] = useState('Semua');
    const [masterSortOrder, setMasterSortOrder] = useState('asc');

    // State Filter Tugas Penarikan & Checkbox Akumulatif
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
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
    const yearOptions = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i);

    const isAdmin = user?.role === 'Admin';
    const effectiveAmil = isAdmin ? selectedAmilFilter : user?.name;

    const saveTargetConfig = (e) => {
        e.preventDefault();
        const form = e.target;
        const newCfg = {
            umum: Number(form.targetUmum.value.replace(/\D/g, '')) || 0,
            pribadi: Number(form.targetPribadi.value.replace(/\D/g, '')) || 0
        };
        setTargetConfig(newCfg);
        try {
            localStorage.setItem('wiz_target_pundi_config', JSON.stringify(newCfg));
        } catch(err) {}
        setIsTargetModalOpen(false);
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

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const stats = useMemo(() => {
        const activeBoxes = visiblePundis.filter(p => p.status === 'Aktif');
        const totalAktif = activeBoxes.length;
        const totalUmum = activeBoxes.filter(p => (p.tipePundi || 'Pundi Umum') === 'Pundi Umum').length;
        const totalPribadi = activeBoxes.filter(p => p.tipePundi === 'Pundi Pribadi').length;

        // Filter riwayat transaksi sesuai bulan & tahun analitik yang dipilih
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
            const tipe = (matchedPundi && matchedPundi.tipePundi) || r.tipePundi || 'Pundi Umum';
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

        // Pundi yang belum ditarik pada bulan ini
        const pundiBelumDijemputList = activeBoxes.filter(p =>
            !pickedUpBoxIds.has(String(p.id)) &&
            !pickedUpBoxIds.has(String(p.noUrut)) &&
            !inProgressBoxIds.has(String(p.id)) &&
            !inProgressBoxIds.has(String(p.noUrut))
        );
        const belumDijemputCount = pundiBelumDijemputList.length;

        // Perhitungan target terbagi / bulanan
        const isAllMonths = dashMonth === 'Semua';
        const targetUmumPeriode = isAllMonths ? targetConfig.umum * 12 : targetConfig.umum;
        const targetPribadiPeriode = isAllMonths ? targetConfig.pribadi * 12 : targetConfig.pribadi;
        const totalTargetPeriode = targetUmumPeriode + targetPribadiPeriode;

        const percentUmum = targetUmumPeriode > 0 ? Math.min(Math.round((danaUmum / targetUmumPeriode) * 100), 100) : 0;
        const percentPribadi = targetPribadiPeriode > 0 ? Math.min(Math.round((danaPribadi / targetPribadiPeriode) * 100), 100) : 0;
        const percentTotal = totalTargetPeriode > 0 ? Math.min(Math.round((totalDanaBulanIni / totalTargetPeriode) * 100), 100) : 0;

        return {
            totalAktif, totalUmum, totalPribadi,
            totalDanaBulanIni, danaUmum, danaPribadi,
            berhasil, sedangDijemput, belumDijemputCount, pundiBelumDijemputList,
            targetUmumPeriode, targetPribadiPeriode, totalTargetPeriode,
            percentUmum, percentPribadi, percentTotal
        };
    }, [visiblePundis, visibleRiwayatPundis, dashMonth, dashYear, targetConfig]);

    const activePundisSorted = useMemo(() => {
        return [...visiblePundis].filter(p => p.status === 'Aktif').sort((a, b) => Number(a.noUrut) - Number(b.noUrut));
    }, [visiblePundis]);

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
            const matchZona = zonaMasterFilter === 'Semua' || (p.zona || 'SEKITAR TANJUNG') === zonaMasterFilter;

            return matchSearch && matchStatus && matchCreator && matchTipe && matchZona;
        });

        return filtered.sort((a, b) => {
            const numA = Number(a.noUrut) || 0;
            const numB = Number(b.noUrut) || 0;
            return masterSortOrder === 'asc' ? numA - numB : numB - numA;
        });
    }, [visiblePundis, searchMaster, statusMasterFilter, creatorMasterFilter, tipeMasterFilter, zonaMasterFilter, masterSortOrder, contacts]);

    const filteredTugasPundis = useMemo(() => {
        return activePundisSorted.filter(p => {
            const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
            const pStatus = currentRecord ? currentRecord.status : 'Belum';

            const term = searchTugas.toLowerCase().trim();
            const matchSearch = !term ||
                String(p.noUrut || '').toLowerCase().includes(term) ||
                String(p.donorName || '').toLowerCase().includes(term) ||
                String(p.usaha || '').toLowerCase().includes(term) ||
                String(p.zona || '').toLowerCase().includes(term) ||
                String(p.alamat || '').toLowerCase().includes(term);

            let matchStatus = false;
            if (statusTugasFilter === 'Semua') matchStatus = true;
            else if (statusTugasFilter === 'Belum' && pStatus === 'Belum') matchStatus = true;
            else if (statusTugasFilter === 'Dijemput' && pStatus === 'Dijemput') matchStatus = true;
            else if (statusTugasFilter === 'Sudah Ditarik' && pStatus === 'Berhasil') matchStatus = true;

            const matchTipe = tipeTugasFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeTugasFilter;
            const matchZona = zonaTugasFilter === 'Semua' || (p.zona || 'SEKITAR TANJUNG') === zonaTugasFilter;

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
        const isAllFilteredSelected = filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => newSet.has(p.id));

        if (isAllFilteredSelected) {
            filteredTugasPundis.forEach(p => newSet.delete(p.id));
        } else {
            filteredTugasPundis.forEach(p => newSet.add(p.id));
        }
        setSelectedTaskIds(newSet);
    };

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
            foundPundi = pundis.find(p => String(p.id) === String(extractedId));
        } else if (!isNaN(cleanVal) && cleanVal.length > 0) {
            foundPundi = pundis.find(p => String(p.noUrut) === cleanVal);
        }

        if (foundPundi) {
            setIsQuickScanOpen(false);
            setSelectedPundi(foundPundi);
            setTimeout(() => setIsInputModalOpen(true), 400);
        }
    };

    const markAsDijemput = (pundisToUpdate) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let newRiwayat = [...riwayatPundis];
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
                    date: todayStr,
                    pundiId: p.id,
                    noUrut: p.noUrut,
                    donorName: p.donorName,
                    usaha: p.usaha,
                    amount: 0,
                    status: 'Dijemput',
                    amilName: user?.name || 'Amil',
                    notes: `Dicetak - Zona ${p.zona || 'SEKITAR TANJUNG'}`,
                    receiptUrl: ''
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

        const zonaKeterangan = zonaTugasFilter !== 'Semua' ? `[Zona: ${zonaTugasFilter}] ` : '';

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
                .badge-zona { display: inline-block; padding: 1px 3px; font-size: 7px; font-weight: bold; background: #fef3c7; color: #92400e; border-radius: 3px; margin-top: 1px; }
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
                    <div><b>Total:</b> ${totalItem} Pundi ${zonaKeterangan}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="text-center run-no">No</th>
                        <th class="text-center" style="width: 9%;">Reg</th>
                        <th style="width: 22%;">Nama Usaha / Titik</th>
                        <th style="width: 20%;">Donatur & Kontak</th>
                        <th style="width: 24%;">Alamat & Zona</th>
                        <th style="width: 14%;">Nominal (Rp)</th>
                        <th class="text-center" style="width: 7%;">Cek</th>
                    </tr>
                </thead>
                <tbody>
                    ${dataToPrint.map((p, idx) => `
                        <tr>
                            <td class="text-center run-no">${idx + 1}</td>
                            <td class="text-center no-col">#${p.noUrut || '-'}</td>
                            <td><b style="color: #0f172a;">${p.usaha || '-'}</b></td>
                            <td>
                                <div class="cell-truncate"><b>${p.donorName || '-'}</b></div>
                                <div style="font-size: 7.5px; color: #64748b;">${p.phone || '-'}</div>
                            </td>
                            <td class="alamat-text">
                                <div>${p.alamat || '-'}</div>
                                <span class="badge-zona">${p.zona || 'SEKITAR TANJUNG'}</span>
                            </td>
                            <td style="font-size: 8.5px; color: #64748b;">Rp</td>
                            <td class="text-center"><span class="check-box"></span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer-wrap">
                <div class="summary-box">
                    <b>Catatan Sistem:</b> Data yang dicetak ini telah <b>otomatis ditandai "Dalam Penjemputan"</b> di aplikasi.<br/>
                    Setelah penjemputan selesai, klik tombol <b>"Hitung Uang"</b> untuk mencatat nominal perolehan.
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
                            <div class="badge-urut">#${runningNumber} | No. ${p.noUrut}</div>
                        </div>
                        
                        <div class="nota-body">
                            <div class="qr-col">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=WIZ-PUNDI-${p.id}&margin=0" alt="QR Pundi" class="qr-img" />
                                <span class="qr-id">ID: ${p.id}</span>
                            </div>
                            <div class="info-col">
                                <div class="info-row"><span class="label">Donatur</span>: <b>${p.donorName}</b></div>
                                <div class="info-row"><span class="label">Usaha</span>: <span>${p.usaha || '-'}</span></div>
                                <div class="info-row"><span class="label">Zona</span>: <span style="font-weight: bold; color: #92400e;">${p.zona || 'SEKITAR TANJUNG'}</span></div>
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
                            <div class="ttd-doa">"Semoga Allah memberkahi harta yang disedekahkan"</div>
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
                .badge-urut { background: #27745F; color: #ffffff; font-weight: 900; font-size: 10px; padding: 1px 6px; border-radius: 4px; letter-spacing: 0.5px; }
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
        const existing = isEdit ? pundis.find(p => String(p.id) === String(formData.id)) : null;
        let newData = { 
            ...(existing || {}),
            ...formData, 
            tipePundi: formData.tipePundi || (existing && existing.tipePundi) || 'Pundi Umum',
            zona: formData.zona || (existing && existing.zona) || 'SEKITAR TANJUNG',
            updatedAt: now 
        };
        if (!isEdit) {
            newData.id = Date.now();
            newData.createdAt = now;
            newData.createdBy = user?.name || 'Amil';
        }
        const updatedList = isEdit 
            ? pundis.map(p => String(p.id) === String(newData.id) ? newData : p) 
            : [...pundis, newData];
        setPundis(updatedList);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('Pundi', updatedList);
    };

    const deletePundi = (row) => {
        const updatedList = pundis.filter(p => String(p.id) !== String(row.id));
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
        const updatedRiwayat = [...riwayatPundis, transaction];
        setRiwayatPundis(updatedRiwayat);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updatedRiwayat);
        setIsInputModalOpen(false);
    };

    const saveEditRiwayat = (formData) => {
        const updated = riwayatPundis.map(r => {
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
        const updated = riwayatPundis.filter(r => String(r.id) !== String(row.id));
        setRiwayatPundis(updated);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updated);
    };

    const MasterPundiSchema = [
        { name: 'noUrut', label: 'Nomor Urut Penarikan (Angka)', type: 'number', required: true },
        { name: 'tipePundi', label: 'Jenis / Tipe Pundi', type: 'select', options: ['Pundi Umum', 'Pundi Pribadi'], required: true },
        { name: 'zona', label: 'Zona Wilayah Pundi', type: 'select', options: ZONA_OPTIONS, required: true },
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
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {r.zona || 'SEKITAR TANJUNG'}
                    </span>
                </div>
                <p className="text-xs text-wiz-orange dark:text-amber-400 font-medium mt-0.5"><i className="fa-solid fa-store mr-1"></i> {r.usaha}</p>
                {r.phone && <p className="text-[11px] text-gray-500 mt-0.5"><i className="fa-brands fa-whatsapp text-green-500 mr-1"></i> {r.phone}</p>}
            </div>
        )},
        { key: 'alamat', label: 'Alamat & Titik Peta', render: r => (
            <div className="space-y-1">
                <span className="truncate max-w-[200px] block text-gray-500">{r.alamat}</span>
                {r.mapUrl && typeof parseMapUrls === 'function' ? (() => {
                    const mapUrls = parseMapUrls(r.mapUrl);
                    return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <a href={mapUrls.navUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-wiz-green/10 text-wiz-green dark:text-emerald-400 text-[11px] font-bold hover:bg-wiz-green hover:text-white transition-colors border border-wiz-green/20">
                                <i className="fa-solid fa-mobile-screen"></i> Di HP
                            </a>
                            <a href={mapUrls.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800">
                                <i className="fa-solid fa-globe"></i> Web Maps
                            </a>
                        </div>
                    );
                })() : null}
            </div>
        )},
        { key: 'status', label: 'Status', render: r => <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Aktif' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-red-50 text-red-500'}`}>{r.status}</span> },
        { key: 'print', label: 'QR', render: r => (
            <button onClick={() => setPrintQR(r)} className="p-2 text-wiz-orange hover:bg-wiz-orange/10 rounded-lg transition-colors" title="Cetak Stiker QR">
                <i className="fa-solid fa-qrcode text-lg"></i>
            </button>
        )}
    ];

    return (
        <div className="space-y-6 slide-up relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <i className="fa-solid fa-box-open text-wiz-orange"></i> Manajemen Pundi WIZ
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem kontrol kotak pundi, target penarikan, dan pemetaan rute zona.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsTargetModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-wiz-orange to-amber-500 hover:from-wiz-orange_dark hover:to-wiz-orange text-white text-xs sm:text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
                        title="Atur / Lihat Target Bulanan Pundi"
                    >
                        <i className="fa-solid fa-bullseye text-sm"></i>
                        <span>🎯 Atur / Target Pundi</span>
                    </button>

                    {isAdmin ? (
                        <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3.5 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <i className="fa-solid fa-user-tag text-wiz-green"></i>
                            <select
                                value={selectedAmilFilter}
                                onChange={(e) => setSelectedAmilFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-100 outline-none cursor-pointer"
                            >
                                <option value="Semua" className="dark:bg-gray-800">Semua Amil</option>
                                {allAmilNames.map((name, idx) => (
                                    <option key={idx} value={name} className="dark:bg-gray-800">Amil: {name}</option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* TAB MENU NAVIGASI PUNDI */}
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
                TAB 1: DASHBOARD ANALITIK (SINKRON TARGET BULANAN & NOMINAL)
               ========================================================= */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-6 animate-in pb-8">
                    {/* Filter Periode Bulan & Tahun */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                                <span className="p-1.5 bg-wiz-green/10 text-wiz-green rounded-lg"><i className="fa-solid fa-filter"></i></span>
                                Filter Periode Analitik Pundi
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">Target & perolehan pundi otomatis tersinkronisasi pada bulan yang dipilih.</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select 
                                value={dashMonth} 
                                onChange={(e) => setDashMonth(e.target.value === 'Semua' ? 'Semua' : Number(e.target.value))} 
                                className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:ring-2 focus:ring-wiz-green"
                            >
                                <option value="Semua" className="dark:bg-gray-800">Semua Bulan (Kumulatif)</option>
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
                                    <i className="fa-solid fa-bullseye"></i> Target Pundi: {dashMonth === 'Semua' ? `Semua Bulan ${dashYear}` : `${monthNames[dashMonth]} ${dashYear}`}
                                </div>
                                <h3 className="text-3xl font-black">{typeof formatRp === 'function' ? formatRp(stats.totalDanaBulanIni) : stats.totalDanaBulanIni}</h3>
                                <p className="text-white/80 text-xs mt-1">
                                    Target Ditargetkan: <b>{typeof formatRp === 'function' ? formatRp(stats.totalTargetPeriode) : stats.totalTargetPeriode}</b>
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
                                    <span>{stats.totalUmum} Kotak Aktif</span>
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
                                    <span>{stats.totalPribadi} Kotak Aktif</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.percentPribadi}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Pundi Belum Dijemput (Klik untuk lihat daftar) */}
                        <div 
                            onClick={() => setIsBelumDijemputModalOpen(true)}
                            className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-800 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-amber-400 transition-all group"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-md">
                                        <i className="fa-solid fa-clock mr-1"></i> Belum Dijemput
                                    </span>
                                    <span className="text-xs text-amber-500 font-bold group-hover:translate-x-1 transition-transform">
                                        Lihat Data <i className="fa-solid fa-arrow-right ml-1"></i>
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Kotak Belum Ditarik:</p>
                                <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                    {stats.belumDijemputCount} <span className="text-sm font-semibold opacity-70">Kotak</span>
                                </h4>
                            </div>
                            <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-900/40 text-[11px] text-gray-500">
                                <span>Klik kartu ini untuk melihat rincian toko/rumah yang belum ditarik.</span>
                            </div>
                        </div>

                        {/* Status Lapangan */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2.5 py-0.5 rounded-md">
                                        <i className="fa-solid fa-truck-fast mr-1"></i> Penjemputan
                                    </span>
                                    <i className="fa-solid fa-clipboard-check text-gray-300"></i>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl border border-yellow-200 dark:border-yellow-800/40 text-center">
                                        <p className="text-[10px] font-bold text-yellow-700 uppercase">Dijemput</p>
                                        <p className="text-lg font-black text-yellow-600 mt-0.5">{stats.sedangDijemput}</p>
                                    </div>
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 text-center">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Selesai</p>
                                        <p className="text-lg font-black text-wiz-green mt-0.5">{stats.berhasil}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 text-[11px] text-gray-400 text-center">
                                Total: {stats.totalAktif} Kotak Pundi Aktif
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                TAB 2: TUGAS PENARIKAN (DENGAN FILTER ZONA & CHECKBOX)
               ========================================================= */}
            {activeSubTab === 'tugas' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 animate-in space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Antrean Penarikan Pundi</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {selectedTaskIds.size > 0 ? (
                                    <span className="font-bold text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2 py-0.5 rounded-md">
                                        {selectedTaskIds.size} Pundi Dipilih
                                    </span>
                                ) : (
                                    <span>Tersedia {filteredTugasPundis.length} kotak siap diproses penjemputan.</span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={toggleSelectAllFiltered} 
                                className="px-3.5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                <i className={`fa-solid ${filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id)) ? 'fa-square-check text-wiz-green' : 'fa-square'}`}></i>
                                <span>{filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id)) ? 'Batal Pilih' : 'Pilih Semua'}</span>
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

                    {/* Baris Filter: Pencarian, Tipe, Zona, Nomor Urut, Status */}
                    <div className="bg-gray-50/80 dark:bg-gray-700/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="w-full md:w-64 relative">
                            <i className="fa-solid fa-magnifying-glass absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-xs pointer-events-none"></i>
                            <input
                                type="text"
                                value={searchTugas}
                                onChange={(e) => setSearchTugas(e.target.value)}
                                placeholder="Cari donatur, usaha, zona..."
                                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-wiz-green text-gray-800 dark:text-gray-100 font-medium"
                            />
                            {searchTugas && (
                                <button onClick={() => setSearchTugas('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600">
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between sm:justify-end">
                            {/* Filter Zona */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <i className="fa-solid fa-map-location-dot text-xs text-amber-500"></i>
                                <select
                                    value={zonaTugasFilter}
                                    onChange={(e) => setZonaTugasFilter(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                >
                                    <option value="Semua" className="dark:bg-gray-800">Semua Zona</option>
                                    {ZONA_OPTIONS.map(z => <option key={z} value={z} className="dark:bg-gray-800">{z}</option>)}
                                </select>
                            </div>

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

                            {/* Filter Rentang Nomor */}
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <span className="text-xs font-bold text-gray-400">No:</span>
                                <input 
                                    type="number" value={urutAwal} onChange={(e) => setUrutAwal(e.target.value)} placeholder="Awal"
                                    className="w-12 p-0.5 text-xs text-center font-bold bg-gray-50 dark:bg-gray-700 border rounded outline-none"
                                />
                                <span className="text-xs text-gray-400">-</span>
                                <input 
                                    type="number" value={urutAkhir} onChange={(e) => setUrutAkhir(e.target.value)} placeholder="Akhir"
                                    className="w-12 p-0.5 text-xs text-center font-bold bg-gray-50 dark:bg-gray-700 border rounded outline-none"
                                />
                            </div>

                            {/* Filter Status */}
                            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800 shadow-sm">
                                {['Semua', 'Belum', 'Dijemput', 'Sudah Ditarik'].map(st => (
                                    <button
                                        key={st} onClick={() => setStatusTugasFilter(st)}
                                        className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${statusTugasFilter === st ? 'bg-wiz-green text-white shadow-sm' : 'text-gray-400'}`}
                                    >
                                        {st === 'Sudah Ditarik' ? 'Selesai' : st}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Area Daftar Tugas (Scroll Mandiri) */}
                    <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto pr-1 space-y-3 pb-8 custom-scrollbar">
                        {filteredTugasPundis.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed text-xs">
                                Tidak ada tugas pundi yang cocok dengan filter.
                            </div>
                        ) : filteredTugasPundis.map(p => {
                            const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
                            const tStatus = currentRecord ? currentRecord.status : 'Belum';
                            const isChecked = selectedTaskIds.has(p.id);

                            return (
                                <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isChecked ? 'bg-wiz-green/5 border-wiz-green ring-1 ring-wiz-green' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelectTask(p.id)}
                                                className="w-5 h-5 text-wiz-green rounded-lg focus:ring-wiz-green cursor-pointer accent-wiz-green"
                                            />
                                            <span className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs bg-wiz-green/10 text-wiz-green">
                                                #{p.noUrut}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{p.usaha}</h4>
                                                    <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                                        <i className="fa-solid fa-map-pin mr-1"></i> {p.zona || 'SEKITAR TANJUNG'}
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                                        {p.tipePundi || 'Umum'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{p.donorName} • {p.alamat}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tStatus === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green' : tStatus === 'Dijemput' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {tStatus === 'Berhasil' ? 'Selesai' : tStatus}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <button onClick={() => setSelectedPundi({...p, isViewOnly: true})} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold">
                                            <i className="fa-solid fa-eye text-wiz-orange mr-1"></i> Detail
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            {tStatus === 'Dijemput' ? (
                                                <button onClick={() => handleOpenEditRiwayat(currentRecord)} className="px-3 py-1 bg-wiz-green text-white rounded-lg text-xs font-bold shadow-sm">
                                                    <i className="fa-solid fa-calculator mr-1"></i> Hitung Uang
                                                </button>
                                            ) : (
                                                <Button onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} variant="accent" className="text-xs py-1 px-3">
                                                    Jemput
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* =========================================================
                TAB 3: DATA MASTER PUNDI (DENGAN KOLOM & FILTER ZONA)
               ========================================================= */}
            {activeSubTab === 'master' && (
                <div className="space-y-4 animate-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <i className="fa-solid fa-magnifying-glass absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-xs pointer-events-none"></i>
                                <input
                                    type="text"
                                    value={searchMaster}
                                    onChange={(e) => setSearchMaster(e.target.value)}
                                    placeholder="Cari No. Urut, donatur, usaha, zona, alamat..."
                                    className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wiz-green text-gray-800 dark:text-gray-100"
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
                                        {ZONA_OPTIONS.map(z => <option key={z} value={z} className="dark:bg-gray-800">{z}</option>)}
                                    </select>
                                </div>

                                {/* Filter Tipe Master */}
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

                                <button onClick={() => setMasterSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-xs font-bold">
                                    <i className={`fa-solid ${masterSortOrder === 'asc' ? 'fa-arrow-down-1-9' : 'fa-arrow-up-9-1'} text-wiz-green`}></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto custom-scrollbar rounded-2xl border border-gray-100 dark:border-gray-700 pb-8">
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
                </div>
            )}

            {/* TAB 4: RIWAYAT SEDEKAH */}
            {activeSubTab === 'riwayat' && (
                <div className="animate-in space-y-4">
                    <div className="max-h-[65vh] overflow-y-auto custom-scrollbar rounded-2xl border border-gray-100 dark:border-gray-700 pb-8">
                        <Table 
                            columns={[
                                { key: 'date', label: 'Tanggal', render: r => typeof formatDate === 'function' ? formatDate(r.date) : r.date },
                                { key: 'donorName', label: 'Donatur & Usaha', render: r => <div><p className="font-bold">{r.donorName}</p><p className="text-xs text-gray-500">{r.usaha} (No. {r.noUrut})</p></div> },
                                { key: 'amount', label: 'Nominal', render: r => <span className="font-bold text-wiz-green">{typeof formatRp === 'function' ? formatRp(r.amount) : r.amount}</span> },
                                { key: 'status', label: 'Status', render: r => <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.status === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span> },
                                { key: 'amilName', label: 'Amil' },
                                { key: 'notes', label: 'Catatan', render: r => <span className="text-xs text-gray-400">{r.notes || '-'}</span> }
                            ]}
                            data={[...filteredRiwayatPundis].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))}
                            onEdit={handleOpenEditRiwayat}
                            onDelete={isAdmin ? deleteRiwayat : null}
                        />
                    </div>
                </div>
            )}

            {/* =========================================================
                MODAL 1: PENGATURAN TARGET KHUSUS PUNDI (MANDIRI)
               ========================================================= */}
            <Modal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} title="Pengaturan Target Bulanan Pundi">
                <form onSubmit={saveTargetConfig} className="space-y-4">
                    <div className="p-3 bg-wiz-green/5 dark:bg-emerald-950/30 rounded-2xl border border-wiz-green/20">
                        <p className="text-xs text-wiz-green dark:text-emerald-400 font-semibold leading-relaxed">
                            <i className="fa-solid fa-circle-info mr-1"></i> Tentukan target penarikan bulanan untuk kotak Pundi Umum dan Pundi Pribadi. Target ini otomatis dikonversi proporsional sesuai periode bulan yang Anda pantau di Dashboard.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Target Bulanan Pundi Umum (Rp)
                        </label>
                        <input 
                            type="text" 
                            name="targetUmum" 
                            required 
                            defaultValue={Number(targetConfig.umum || 0).toLocaleString('id-ID')}
                            onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-black text-blue-600 text-base outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Perkiraan Target Tahunan: {typeof formatRp === 'function' ? formatRp((targetConfig.umum || 0) * 12) : ''}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Target Bulanan Pundi Pribadi (Rp)
                        </label>
                        <input 
                            type="text" 
                            name="targetPribadi" 
                            required 
                            defaultValue={Number(targetConfig.pribadi || 0).toLocaleString('id-ID')}
                            onInput={(e) => e.target.value = Number(e.target.value.replace(/\D/g, '')).toLocaleString('id-ID')}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-black text-purple-600 text-base outline-none focus:ring-2 focus:ring-purple-500" 
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Perkiraan Target Tahunan: {typeof formatRp === 'function' ? formatRp((targetConfig.pribadi || 0) * 12) : ''}</p>
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
            <Modal isOpen={isBelumDijemputModalOpen} onClose={() => setIsBelumDijemputModalOpen(false)} title={`Pundi Belum Dijemput (${stats.belumDijemputCount})`}>
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">Daftar kotak aktif yang belum ditarik pada bulan/tahun yang dipilih.</p>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {stats.belumDijemputCount === 0 ? (
                            <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-2xl text-xs">
                                Semua pundi aktif pada periode ini sudah diproses.
                            </div>
                        ) : stats.pundiBelumDijemputList.map(p => (
                            <div key={p.id} className="p-3 bg-white dark:bg-gray-800 border rounded-2xl flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-black text-wiz-green text-xs">#{p.noUrut}</span>
                                        <span className="font-bold text-xs">{p.usaha}</span>
                                        <span className="text-[9px] px-1.5 rounded bg-amber-100 text-amber-800">{p.zona || 'SEKITAR TANJUNG'}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{p.donorName} • {p.alamat}</p>
                                </div>
                                <button onClick={() => { setSelectedPundi({...p, isViewOnly: true}); setIsInputModalOpen(true); }} className="px-2.5 py-1 bg-wiz-green/10 text-wiz-green rounded-lg text-xs font-bold">
                                    Detail
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* MODAL 3: DETAIL PUNDI & INPUT HASIL */}
            <Modal isOpen={isInputModalOpen || isEditRiwayatOpen} onClose={() => { setIsInputModalOpen(false); setIsEditRiwayatOpen(false); setSelectedPundi(null); setEditingRiwayat(null); }} title={selectedPundi && !selectedPundi.isViewOnly ? `Laporan: ${selectedPundi.usaha}` : editingRiwayat ? `Edit Laporan: ${editingRiwayat.usaha}` : 'Detail Pundi'}>
                {selectedPundi && selectedPundi.isViewOnly ? (
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border space-y-2 text-sm">
                            <div className="flex justify-between pb-2 border-b"><span className="text-gray-400">No. Registrasi:</span><span className="font-black text-wiz-green">#{selectedPundi.noUrut}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Usaha:</span><span className="font-bold">{selectedPundi.usaha}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Donatur:</span><span className="font-bold">{selectedPundi.donorName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Zona:</span><span className="font-bold text-amber-600">{selectedPundi.zona || 'SEKITAR TANJUNG'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Tipe:</span><span className="font-bold">{selectedPundi.tipePundi || 'Pundi Umum'}</span></div>
                            <div className="pt-2 border-t"><span className="text-gray-400 block mb-1">Alamat:</span><p className="bg-white dark:bg-gray-800 p-2 rounded-xl text-xs">{selectedPundi.alamat}</p></div>
                        </div>
                    </div>
                ) : (selectedPundi || editingRiwayat) && (
                    <form onSubmit={(e) => { e.preventDefault(); if (editingRiwayat) saveEditRiwayat({ date: e.target.date.value, status: e.target.status.value, amount: e.target.amount.value.replace(/\D/g, ''), notes: e.target.notes.value }); else submitInputHasil({ date: e.target.date.value, status: e.target.status.value, amount: e.target.amount.value.replace(/\D/g, ''), notes: e.target.notes.value }); }} className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label><input type="date" name="date" required defaultValue={editingRiwayat?.date ? String(editingRiwayat.date).split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label><select name="status" defaultValue={editingRiwayat?.status || 'Dijemput'} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm"><option value="Dijemput">Dalam Penjemputan</option><option value="Berhasil">Selesai Dihitung</option><option value="Gagal">Gagal / Kosong</option></select></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nominal (Rp)</label><input type="text" name="amount" defaultValue={editingRiwayat?.amount || ''} placeholder="0" className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl font-bold text-wiz-green text-sm" onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan</label><textarea name="notes" defaultValue={editingRiwayat?.notes || ''} rows="2" className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm"></textarea></div>
                        <div className="flex justify-end gap-2 pt-3 border-t"><Button variant="secondary" onClick={() => { setIsInputModalOpen(false); setIsEditRiwayatOpen(false); setSelectedPundi(null); setEditingRiwayat(null); }}>Batal</Button><Button type="submit" variant="primary">Simpan Laporan</Button></div>
                    </form>
                )}
            </Modal>

            {/* MODAL 4: SCAN QR */}
            <Modal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} title="Pindai QR Pundi">
                <div className="flex flex-col items-center justify-center p-2">
                    <div className="w-full max-w-sm"><Html5QrcodePlugin qrCodeSuccessCallback={handleQuickScan} /></div>
                    <div className="w-full mt-4"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nomor Urut Manual</p><input type="text" onChange={(e) => handleQuickScan(e.target.value)} placeholder="Contoh: 5" className="w-full p-2.5 border rounded-xl text-center font-bold" /></div>
                </div>
            </Modal>

            {/* MODAL 5: CETAK QR STIKER */}
            <Modal isOpen={!!printQR} onClose={() => setPrintQR(null)} title="Cetak Stiker Pundi">
                {printQR && (
                    <div className="flex flex-col items-center space-y-4">
                        <div id="print-qr-area" className="w-72 bg-white border-2 border-wiz-green rounded-3xl p-6 flex flex-col items-center text-center shadow-lg">
                            <h4 className="font-black text-gray-800 text-base uppercase mb-1">KOTAK ZIS WIZ</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 mb-3">Zona: {printQR.zona || 'SEKITAR TANJUNG'}</span>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WIZ-PUNDI-${printQR.id}&margin=0`} alt="QR Code" className="w-32 h-32 border rounded-xl p-2 mb-3" />
                            <div className="bg-wiz-green/10 text-wiz-green w-full py-2 rounded-xl mb-2 font-black text-2xl">#{printQR.noUrut}</div>
                            <p className="font-bold text-sm text-gray-800">{printQR.usaha}</p>
                            <p className="text-[10px] text-gray-400">{printQR.donorName} ({printQR.tipePundi || 'Pundi Umum'})</p>
                        </div>
                        <div className="flex gap-2 w-full">
                            <Button variant="secondary" className="flex-1" onClick={() => setPrintQR(null)}>Tutup</Button>
                            <Button variant="primary" className="flex-1" onClick={() => {
                                const w = window.open('', '_blank');
                                w.document.write(`<html><head><title>Stiker QR</title><script src="https://cdn.tailwindcss.com"><\/script></head><body class="flex items-center justify-center p-8 bg-white">${document.getElementById('print-qr-area').outerHTML}<script>setTimeout(()=>{window.print();},800);<\/script></body></html>`);
                                w.document.close();
                            }}>Cetak</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

if (typeof window !== 'undefined') {
    window.PundiView = PundiView;
}
