// Komponen Manajemen Pundi WIZ (Self-Contained, Bebas Error, Detail Data, Cetak & Scroll Mandiri)

const { useState, useEffect, useMemo, useRef } = React || window.React || {};

const formatRp = (num) => {
    if (typeof window.formatRp === 'function') return window.formatRp(num);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
};

const formatDate = (dateString) => {
    if (typeof window.formatDate === 'function') return window.formatDate(dateString);
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
};

const parseMapUrls = (input) => {
    if (typeof window.parseMapUrls === 'function') return window.parseMapUrls(input);
    const raw = String(input || '').trim();
    if (!raw) return { navUrl: '#', webUrl: '#' };
    return { navUrl: raw, webUrl: raw };
};

const SafeButton = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon, disabled = false }) => {
    const base = "flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all disabled:opacity-50 shadow-sm cursor-pointer active:scale-95";
    const bg = variant === 'primary' 
        ? 'bg-[#27745F] text-white hover:bg-[#1B5444] shadow-emerald-900/10' 
        : variant === 'accent' 
        ? 'bg-[#F59121] text-white hover:bg-[#D87A15] shadow-orange-900/10' 
        : variant === 'secondary' 
        ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50' 
        : variant === 'danger'
        ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${bg} ${className}`}>
            {icon && <i className={icon}></i>}
            {children}
        </button>
    );
};

const SafeModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in">
            <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 flex flex-col">
                {title && (
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur z-20">
                        <h2 className="text-base sm:text-lg font-bold truncate pr-2">{title}</h2>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                )}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
};

const PundiView = ({
    pundis = [],
    setPundis = () => {},
    riwayatPundis = [],
    setRiwayatPundis = () => {},
    contacts = [],
    programs = [],
    user = {},
    syncDataToSheet = () => {},
    darkMode = false,
    setViewImage = () => {},
    amils = [],
    setActiveTab = () => {}
}) => {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    const [selectedAmilFilter, setSelectedAmilFilter] = useState(user?.role === 'Admin' ? 'Semua' : (user?.name || 'Semua'));

    // State Modal & Aksi
    const [detailPundi, setDetailPundi] = useState(null);
    const [isBelumDijemputModalOpen, setIsBelumDijemputModalOpen] = useState(false);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [selectedPundi, setSelectedPundi] = useState(null);
    const [printQR, setPrintQR] = useState(null);

    const [isPundiModalOpen, setIsPundiModalOpen] = useState(false);
    const [editingPundi, setEditingPundi] = useState(null);

    const [editingRiwayat, setEditingRiwayat] = useState(null);
    const [isEditRiwayatOpen, setIsEditRiwayatOpen] = useState(false);

    // State Checklist Pilihan Tugas Penarikan
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

    // Filter Master Pundi
    const [searchMaster, setSearchMaster] = useState('');
    const [statusMasterFilter, setStatusMasterFilter] = useState('Semua');
    const [tipeMasterFilter, setTipeMasterFilter] = useState('Semua');

    // Filter Tugas Penarikan
    const [searchTugas, setSearchTugas] = useState('');
    const [statusTugasFilter, setStatusTugasFilter] = useState('Semua');
    const [tipeTugasFilter, setTipeTugasFilter] = useState('Semua');
    const [urutAwal, setUrutAwal] = useState('');
    const [urutAkhir, setUrutAkhir] = useState('');

    // Filter Riwayat
    const [searchRiwayat, setSearchRiwayat] = useState('');
    const [statusRiwayatFilter, setStatusRiwayatFilter] = useState('Semua');

    // Filter Periode Dashboard Analitik
    const [dashMonth, setDashMonth] = useState(new Date().getMonth());
    const [dashYear, setDashYear] = useState(new Date().getFullYear());
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const yearOptions = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i);

    const isAdmin = user?.role === 'Admin';
    const effectiveAmil = isAdmin ? selectedAmilFilter : (user?.name || '');

    const visiblePundis = useMemo(() => {
        const safeList = Array.isArray(pundis) ? pundis : [];
        if (isAdmin && effectiveAmil === 'Semua') return safeList;
        return safeList.filter(p => {
            const creator = p.createdBy || (Array.isArray(contacts) && contacts.find(c => c.name === p.donorName)?.createdBy);
            return creator === effectiveAmil;
        });
    }, [pundis, isAdmin, effectiveAmil, contacts]);

    const visibleRiwayatPundis = useMemo(() => {
        const safeList = Array.isArray(riwayatPundis) ? riwayatPundis : [];
        if (isAdmin && effectiveAmil === 'Semua') return safeList;
        return safeList.filter(r => r.amilName === effectiveAmil);
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

    const activePundiCampaign = useMemo(() => {
        return (programs || []).find(p => p.status === 'Aktif' && ((p.category && p.category.includes('Pundi')) || (p.name && p.name.toLowerCase().includes('pundi'))));
    }, [programs]);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const stats = useMemo(() => {
        const activeBoxes = visiblePundis.filter(p => p.status === 'Aktif');
        const totalAktif = activeBoxes.length;
        const totalUmum = activeBoxes.filter(p => (p.tipePundi || 'Pundi Umum') === 'Pundi Umum').length;
        const totalPribadi = activeBoxes.filter(p => p.tipePundi === 'Pundi Pribadi').length;

        // Riwayat Penarikan yang sesuai filter periode dashboard (Konversi aman Number)
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
            const matchedPundi = visiblePundis.find(p => String(p.id) === String(r.pundiId) || String(p.noUrut) === String(r.noUrut));
            const tipe = (matchedPundi && matchedPundi.tipePundi) || 'Pundi Umum';
            const amt = Number(r.amount || 0);
            if (tipe === 'Pundi Pribadi') {
                danaPribadi += amt;
            } else {
                danaUmum += amt;
            }
        });

        const pickedUpBoxIds = new Set();
        const inProgressBoxIds = new Set();

        riwayatPeriode.forEach(r => {
            const pid = String(r.pundiId || r.noUrut);
            if (r.status === 'Berhasil') {
                pickedUpBoxIds.add(pid);
            } else if (r.status === 'Dijemput') {
                inProgressBoxIds.add(pid);
            }
        });

        const ditarikBerhasilCount = riwayatBerhasil.length;
        const sedangDijemputCount = activeBoxes.filter(p => inProgressBoxIds.has(String(p.id)) || inProgressBoxIds.has(String(p.noUrut))).length;

        const pundiBelumDijemputList = activeBoxes.filter(p =>
            !pickedUpBoxIds.has(String(p.id)) &&
            !pickedUpBoxIds.has(String(p.noUrut)) &&
            !inProgressBoxIds.has(String(p.id)) &&
            !inProgressBoxIds.has(String(p.noUrut))
        );
        const belumDijemputCount = pundiBelumDijemputList.length;

        let targetPeriode = 0;
        if (activePundiCampaign) {
            targetPeriode = dashMonth === 'Semua'
                ? Number(activePundiCampaign.target || 0)
                : Math.round(Number(activePundiCampaign.target || 0) / 12);
        }

        return {
            totalAktif,
            totalUmum,
            totalPribadi,
            totalDanaBulanIni,
            danaUmum,
            danaPribadi,
            ditarikBerhasilCount,
            sedangDijemputCount,
            belumDijemputCount,
            pundiBelumDijemputList,
            targetPeriode
        };
    }, [visiblePundis, visibleRiwayatPundis, dashMonth, dashYear, activePundiCampaign]);

    const activePundisSorted = useMemo(() => {
        return [...visiblePundis]
            .filter(p => p.status === 'Aktif')
            .sort((a, b) => Number(a.noUrut || 0) - Number(b.noUrut || 0));
    }, [visiblePundis]);

    const filteredTugasPundis = useMemo(() => {
        return activePundisSorted.filter(p => {
            const currentRecord = visibleRiwayatPundis.find(r =>
                String(r.pundiId) === String(p.id) &&
                r.date && new Date(r.date).getMonth() === currentMonth &&
                new Date(r.date).getFullYear() === currentYear
            );
            const pStatus = currentRecord ? currentRecord.status : 'Belum';

            const term = searchTugas.toLowerCase().trim();
            const matchSearch = !term ||
                String(p.noUrut || '').toLowerCase().includes(term) ||
                String(p.donorName || '').toLowerCase().includes(term) ||
                String(p.usaha || '').toLowerCase().includes(term) ||
                String(p.alamat || '').toLowerCase().includes(term);

            let matchStatus = false;
            if (statusTugasFilter === 'Semua') matchStatus = true;
            else if (statusTugasFilter === 'Belum' && pStatus === 'Belum') matchStatus = true;
            else if (statusTugasFilter === 'Dijemput' && pStatus === 'Dijemput') matchStatus = true;
            else if (statusTugasFilter === 'Sudah Ditarik' && pStatus === 'Berhasil') matchStatus = true;

            const matchTipe = tipeTugasFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeTugasFilter;

            const pNo = Number(p.noUrut || 0);
            const matchUrutAwal = urutAwal === '' || isNaN(Number(urutAwal)) || pNo >= Number(urutAwal);
            const matchUrutAkhir = urutAkhir === '' || isNaN(Number(urutAkhir)) || pNo <= Number(urutAkhir);

            return matchSearch && matchStatus && matchTipe && matchUrutAwal && matchUrutAkhir;
        });
    }, [activePundisSorted, visibleRiwayatPundis, searchTugas, statusTugasFilter, tipeTugasFilter, urutAwal, urutAkhir, currentMonth, currentYear]);

    const toggleSelectTask = (id) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllFiltered = () => {
        if (selectedTaskIds.size === filteredTugasPundis.length && filteredTugasPundis.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            const allIds = new Set(filteredTugasPundis.map(p => p.id));
            setSelectedTaskIds(allIds);
        }
    };

    const getPundisToPrint = () => {
        if (selectedTaskIds.size > 0) {
            return filteredTugasPundis.filter(p => selectedTaskIds.has(p.id));
        }
        return filteredTugasPundis;
    };

    const markPundisAsDijemput = (pundisPrinted) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let newOrUpdatedRiwayat = [...riwayatPundis];
        let hasChanges = false;

        pundisPrinted.forEach(p => {
            const existingIdx = newOrUpdatedRiwayat.findIndex(r =>
                String(r.pundiId) === String(p.id) &&
                r.date && new Date(r.date).getMonth() === currentMonth &&
                new Date(r.date).getFullYear() === currentYear
            );

            if (existingIdx >= 0) {
                if (newOrUpdatedRiwayat[existingIdx].status === 'Belum' || !newOrUpdatedRiwayat[existingIdx].status) {
                    newOrUpdatedRiwayat[existingIdx] = {
                        ...newOrUpdatedRiwayat[existingIdx],
                        status: 'Dijemput'
                    };
                    hasChanges = true;
                }
            } else {
                newOrUpdatedRiwayat.push({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    date: todayStr,
                    pundiId: p.id,
                    noUrut: p.noUrut,
                    donorName: p.donorName,
                    usaha: p.usaha,
                    amount: 0,
                    status: 'Dijemput',
                    amilName: user?.name || 'Amil',
                    notes: 'Dicetak untuk penjemputan kotak',
                    receiptUrl: ''
                });
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setRiwayatPundis(newOrUpdatedRiwayat);
            if (typeof syncDataToSheet === 'function') {
                syncDataToSheet('RiwayatPundi', newOrUpdatedRiwayat);
            }
        }
    };

    const handlePrintChecklist = () => {
        const dataToPrint = getPundisToPrint();
        if (dataToPrint.length === 0) return;

        markPundisAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tglCetak = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const totalItem = dataToPrint.length;
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '-');
        const fontSize = totalItem > 25 ? '8.5px' : '9.5px';
        const cellPadding = totalItem > 25 ? '3px 4px' : '5px 6px';

        const html = `
        <html>
        <head>
            <title>Checklist Penarikan Pundi ZIS - WIZ Berau</title>
            <style>
                @page { size: A4 portrait; margin: 6mm 7mm; }
                * { box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #111; font-size: ${fontSize}; line-height: 1.15; background: #fff; }
                .header-wrap { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #27745F; padding-bottom: 5px; margin-bottom: 6px; }
                .header-left { display: flex; align-items: center; gap: 8px; }
                .header-brand { font-size: 15px; font-weight: 900; }
                .brand-wiz { color: #27745F; }
                .brand-berau { color: #F59121; }
                .header-title h2 { margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1f2937; }
                .header-title p { margin: 1px 0 0 0; font-size: 8.5px; color: #4b5563; }
                .header-meta { text-align: right; font-size: 8px; color: #374151; background: #f8faf9; border: 1px solid #e2e8f0; padding: 3px 6px; border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 2px; table-layout: fixed; }
                th, td { border: 1px solid #94a3b8; padding: ${cellPadding}; text-align: left; vertical-align: middle; }
                th { background-color: #27745F; color: #ffffff; font-weight: 800; text-transform: uppercase; font-size: 8.5px; }
                tr { page-break-inside: avoid; }
                .text-center { text-align: center; }
                .running-no { font-weight: bold; color: #475569; width: 5%; }
                .no-col { font-weight: 900; color: #166534; font-size: 9.5px; background: #f0fdf4; width: 9%; }
                .check-box { width: 12px; height: 12px; border: 1.2px solid #64748b; display: inline-block; border-radius: 2px; }
                .footer-wrap { margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px; page-break-inside: avoid; }
                .summary-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 8px; }
                .ttd-block { width: 180px; text-align: center; font-size: 8px; }
                .ttd-space { height: 26px; }
                .ttd-line { border-bottom: 1px solid #333; font-weight: bold; padding-bottom: 2px; }
            </style>
        </head>
        <body>
            <div class="header-wrap">
                <div class="header-left">
                    <div class="header-brand"><span class="brand-wiz">WIZ</span><span class="brand-berau">BERAU</span></div>
                    <div class="header-title">
                        <h2>Lembar Checklist Penarikan Pundi ZIS</h2>
                        <p>Wahdah Inspirasi Zakat Gerai Berau • Status: Otomatis Dalam Penjemputan</p>
                    </div>
                </div>
                <div class="header-meta">
                    <div><b>Tanggal:</b> ${tglCetak}</div>
                    <div><b>Petugas:</b> ${printPetugasName}</div>
                    <div><b>Total Dicetak:</b> ${totalItem} Titik Pundi</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 5%;">No.</th>
                        <th class="text-center" style="width: 9%;">ID Pundi</th>
                        <th style="width: 22%;">Nama Usaha / Titik</th>
                        <th style="width: 20%;">Donatur & WA</th>
                        <th style="width: 23%;">Alamat Titik</th>
                        <th style="width: 13%;">Nominal (Rp)</th>
                        <th class="text-center" style="width: 8%;">Cek [✓]</th>
                    </tr>
                </thead>
                <tbody>
                    ${dataToPrint.map((p, idx) => `
                        <tr>
                            <td class="text-center running-no">${idx + 1}</td>
                            <td class="text-center no-col">#${p.noUrut || '-'}</td>
                            <td><b style="color: #0f172a;">${p.usaha || '-'}</b> <span style="font-size:7.5px; color:#6b7280;">(${p.tipePundi === 'Pundi Pribadi' ? 'Pribadi' : 'Umum'})</span></td>
                            <td>
                                <div><b>${p.donorName || '-'}</b></div>
                                <div style="font-size: 7.5px; color: #64748b;">${p.phone || '-'}</div>
                            </td>
                            <td style="font-size: 8px; color: #475569;">${p.alamat || '-'}</td>
                            <td style="font-size: 8.5px; color: #64748b;">Rp</td>
                            <td class="text-center"><span class="check-box"></span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer-wrap">
                <div class="summary-box">
                    <b>Catatan Amil:</b> Kotak telah otomatis berstatus <b>"Dalam Penjemputan"</b> di sistem.<br/>
                    Setelah uang dihitung di kantor, buka menu Tugas dan klik <b>"Hitung Uang"</b> untuk menyelesaikan.
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
        const dataToPrint = getPundisToPrint();
        if (dataToPrint.length === 0) return;

        markPundisAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tglHariIni = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '...................');

        const chunks = [];
        for (let i = 0; i < dataToPrint.length; i += 10) {
            chunks.push(dataToPrint.slice(i, i + 10));
        }

        const pagesHtml = chunks.map((group, pageIdx) => `
            <div class="a4-page">
                ${group.map((p, itemIdx) => {
                    const runningNum = pageIdx * 10 + itemIdx + 1;
                    return `
                    <div class="nota-card">
                        <div class="nota-header">
                            <div class="nota-brand">
                                <span class="brand-wiz">WIZ</span><span class="brand-berau">BERAU</span>
                                <span class="nota-title">BUKTI INFAQ PUNDI</span>
                            </div>
                            <div class="badge-urut">Cetak #${runningNum} | Pundi #${p.noUrut}</div>
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
                            <div class="ttd-doa">"Semoga Allah memberkahi harta yang disedekahkan"</div>
                            <div class="ttd-col">
                                <p>Amil Petugas</p>
                                <div class="ttd-line">(${printPetugasName})</div>
                            </div>
                        </div>
                    </div>
                `;}).join('')}
            </div>
        `).join('');

        const html = `
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
                .nota-brand { font-size: 11px; font-weight: 900; }
                .brand-wiz { color: #27745F; }
                .brand-berau { color: #F59121; margin-right: 5px; }
                .nota-title { font-size: 8px; font-weight: bold; color: #374151; }
                .badge-urut { background: #27745F; color: #ffffff; font-weight: 900; font-size: 9px; padding: 1px 6px; border-radius: 4px; }
                .nota-body { display: flex; gap: 6px; align-items: center; flex: 1; }
                .qr-col { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; flex-shrink: 0; }
                .qr-img { width: 115px; height: 115px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px; }
                .qr-id { font-size: 6.5px; color: #6b7280; margin-top: 2px; font-family: monospace; }
                .info-col { flex: 1; font-size: 8.5px; line-height: 1.25; }
                .info-row { margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-row .label { display: inline-block; width: 38px; color: #4b5563; font-weight: 600; }
                .alamat-text { color: #4b5563; font-size: 8px; }
                .nominal-box { margin-top: 2px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px 4px; display: flex; align-items: center; }
                .nominal-label { font-weight: 800; color: #166534; font-size: 8.5px; margin-right: 4px; }
                .nominal-line { font-weight: 900; color: #15803d; font-size: 9px; }
                .nota-footer { display: flex; justify-content: space-between; align-items: flex-end; font-size: 7.5px; border-top: 0.5px dotted #9ca3af; padding-top: 2px; margin-top: 2px; }
                .ttd-col { text-align: center; width: 65px; }
                .ttd-col p { margin: 0; color: #4b5563; font-weight: 600; font-size: 7px; }
                .ttd-line { height: 14px; border-bottom: 1px dotted #6b7280; margin-top: 1px; }
                .ttd-doa { font-size: 6.5px; font-style: italic; color: #6b7280; text-align: center; max-width: 110px; }
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

    const handleSavePundiForm = (e) => {
        e.preventDefault();
        const f = e.target;
        const pData = {
            id: editingPundi ? editingPundi.id : Date.now(),
            noUrut: f.noUrut.value,
            tipePundi: f.tipePundi.value,
            donorName: f.donorName.value,
            phone: f.phone.value,
            usaha: f.usaha.value,
            alamat: f.alamat.value,
            mapUrl: f.mapUrl.value,
            status: f.status.value,
            updatedAt: new Date().toISOString()
        };

        if (!editingPundi) {
            pData.createdAt = new Date().toISOString();
            pData.createdBy = user?.name || 'Admin';
        }

        const updatedList = editingPundi 
            ? pundis.map(p => String(p.id) === String(pData.id) ? { ...p, ...pData } : p)
            : [...pundis, pData];

        setPundis(updatedList);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('Pundi', updatedList);
        setIsPundiModalOpen(false);
        setEditingPundi(null);
    };

    const deletePundi = (id) => {
        if (!isAdmin) return;
        const updatedList = pundis.filter(p => String(p.id) !== String(id));
        setPundis(updatedList);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('Pundi', updatedList);
    };

    const submitInputHasil = (e) => {
        e.preventDefault();
        if (!selectedPundi) return;
        const f = e.target;
        const amountClean = String(f.amount.value || '0').replace(/\D/g, '');
        const transaction = {
            id: Date.now(),
            date: f.date.value || new Date().toISOString().split('T')[0],
            pundiId: selectedPundi.id,
            noUrut: selectedPundi.noUrut,
            donorName: selectedPundi.donorName,
            usaha: selectedPundi.usaha,
            amount: Number(amountClean),
            status: f.status.value,
            amilName: user?.name || 'Amil',
            notes: f.notes.value || '',
            receiptUrl: ''
        };

        const updatedRiwayat = [...riwayatPundis, transaction];
        setRiwayatPundis(updatedRiwayat);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updatedRiwayat);
        setIsInputModalOpen(false);
        setSelectedPundi(null);
    };

    const submitEditRiwayat = (e) => {
        e.preventDefault();
        if (!editingRiwayat) return;
        const f = e.target;
        const amountClean = String(f.amount.value || '0').replace(/\D/g, '');
        const updated = riwayatPundis.map(r => {
            if (String(r.id) === String(editingRiwayat.id)) {
                return {
                    ...r,
                    date: f.date.value,
                    status: f.status.value,
                    amount: Number(amountClean),
                    notes: f.notes.value
                };
            }
            return r;
        });
        setRiwayatPundis(updated);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updated);
        setIsEditRiwayatOpen(false);
        setEditingRiwayat(null);
    };

    const deleteRiwayat = (id) => {
        if (!isAdmin) return;
        const updated = riwayatPundis.filter(r => String(r.id) !== String(id));
        setRiwayatPundis(updated);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updated);
    };

    return (
        <div className="space-y-6 slide-up relative pb-28 lg:pb-12">
            {/* Header Manajemen Pundi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <i className="fa-solid fa-box-open text-wiz-orange"></i> Manajemen Pundi WIZ
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem kontrol kotak, checklist penarikan, dan pencatatan sedekah.</p>
                </div>

                <div className="flex items-center gap-3">
                    <SafeButton 
                        onClick={() => setActiveTab('scanner')} 
                        variant="primary" 
                        className="hidden lg:flex shadow-md px-5"
                        icon="fa-solid fa-camera"
                    >
                        Pindai QR Pundi
                    </SafeButton>

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

            {/* Sub-Tab Navigasi Pundi */}
            <div className="flex overflow-x-auto gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm w-full hide-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard Analitik', icon: 'fa-chart-pie' },
                    { id: 'tugas', label: `Tugas Penarikan (${filteredTugasPundis.length})`, icon: 'fa-clipboard-list' },
                    { id: 'master', label: `Data Master Pundi (${visiblePundis.length})`, icon: 'fa-boxes-stacked' },
                    { id: 'riwayat', label: 'Riwayat Sedekah', icon: 'fa-money-bill-wave' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${activeSubTab === tab.id ? 'bg-wiz-green text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: DASHBOARD ANALITIK */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-6 animate-in">
                    {/* Filter Periode Analitik */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                                <i className="fa-solid fa-calendar-check text-wiz-green"></i> Filter Periode Analitik
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Target dan perolehan pundi tersinkron otomatis sesuai periode yang dipilih.</p>
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
                                {yearOptions.map(y => <option key={y} value={y} className="dark:bg-gray-800">Tahun {y}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Banner Capaian Periode */}
                    <div className="p-6 bg-gradient-to-r from-wiz-green_dark via-wiz-green to-teal-700 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
                                    <i className="fa-solid fa-bullseye"></i> Capaian: {dashMonth === 'Semua' ? `Tahun ${dashYear}` : `${monthNames[dashMonth]} ${dashYear}`}
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black">{formatRp(stats.totalDanaBulanIni)}</h3>
                                <p className="text-white/80 text-xs mt-1">Total donasi pundi berhasil terkumpul pada periode ini.</p>
                            </div>

                            {stats.targetPeriode > 0 && (
                                <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-5">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-white/70">Target Periode</p>
                                        <p className="text-base sm:text-lg font-black">{formatRp(stats.targetPeriode)}</p>
                                    </div>
                                    <div className="h-8 w-px bg-white/20"></div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-white/70">Ketercapaian</p>
                                        <p className="text-lg font-black text-amber-300">
                                            {Math.min(Math.round((stats.totalDanaBulanIni / stats.targetPeriode) * 100), 100)}%
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grid Nominal Terkumpul (Umum & Pribadi) & Status Jemput */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-store mr-1"></i> Pundi Umum
                                </span>
                                <i className="fa-solid fa-vault text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100">{formatRp(stats.danaUmum)}</h4>
                            <p className="text-xs text-gray-400 mt-1">Terkumpul dari {stats.totalUmum} kotak umum aktif</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-house-user mr-1"></i> Pundi Pribadi
                                </span>
                                <i className="fa-solid fa-piggy-bank text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100">{formatRp(stats.danaPribadi)}</h4>
                            <p className="text-xs text-gray-400 mt-1">Terkumpul dari {stats.totalPribadi} kotak pribadi aktif</p>
                        </div>

                        {/* Kartu Belum Dijemput (Bisa Diklik untuk Melihat List) */}
                        <div 
                            onClick={() => setIsBelumDijemputModalOpen(true)}
                            className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-sm cursor-pointer hover:shadow-md hover:border-amber-400 transition-all bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/20 group"
                            title="Klik untuk melihat daftar kotak pundi yang belum dijemput"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-clock mr-1"></i> Belum Dijemput
                                </span>
                                <span className="text-xs text-amber-500 font-bold group-hover:underline flex items-center gap-1">
                                    Lihat Data <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                </span>
                            </div>
                            <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {stats.belumDijemputCount} <span className="text-sm font-semibold text-gray-500">Kotak</span>
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-1">Belum dikunjungi / dicetak periode ini</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-truck mr-1"></i> Progress Lapangan
                                </span>
                                <i className="fa-solid fa-circle-check text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <div>
                                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Dijemput: </span>
                                    <span className="text-lg font-black">{stats.sedangDijemputCount}</span>
                                </div>
                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                                <div>
                                    <span className="text-xs font-semibold text-wiz-green dark:text-emerald-400">Selesai: </span>
                                    <span className="text-lg font-black">{stats.ditarikBerhasilCount}</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2">Kotak yang sedang & telah ditarik</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: TUGAS PENARIKAN (DENGAN CHECKBOX & SCROLLBAR MANDIRI) */}
            {activeSubTab === 'tugas' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 animate-in space-y-5">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Antrean Penarikan Bulan Ini</h3>
                                {selectedTaskIds.size > 0 && (
                                    <span className="px-2.5 py-0.5 bg-wiz-green text-white text-xs font-bold rounded-lg shadow-sm">
                                        {selectedTaskIds.size} Pundi Ditandai
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Tandai pundi yang ingin dicetak. Saat dicetak, statusnya otomatis berubah menjadi <b>"Dalam Penjemputan" (Dijemput)</b>.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={toggleSelectAllFiltered}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className={`fa-solid ${selectedTaskIds.size === filteredTugasPundis.length && filteredTugasPundis.length > 0 ? 'fa-square-check text-wiz-green' : 'fa-square'}`}></i>
                                <span>{selectedTaskIds.size === filteredTugasPundis.length && filteredTugasPundis.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                            </button>

                            <SafeButton 
                                onClick={handlePrintChecklist} 
                                icon="fa-solid fa-print" 
                                variant="secondary" 
                                className="text-xs py-2 px-3 shadow-sm" 
                                disabled={getPundisToPrint().length === 0}
                            >
                                Cetak Checklist ({getPundisToPrint().length})
                            </SafeButton>

                            <SafeButton 
                                onClick={handlePrintNotaA4} 
                                icon="fa-solid fa-receipt" 
                                variant="primary" 
                                className="text-xs py-2 px-3 shadow-sm" 
                                disabled={getPundisToPrint().length === 0}
                            >
                                Cetak Nota A4 ({getPundisToPrint().length})
                            </SafeButton>
                        </div>
                    </div>

                    {/* Filter & Pencarian Tugas */}
                    <div className="bg-gray-50/80 dark:bg-gray-700/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="w-full md:w-80 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <i className="fa-solid fa-magnifying-glass text-xs"></i>
                            </div>
                            <input
                                type="text"
                                value={searchTugas}
                                onChange={(e) => setSearchTugas(e.target.value)}
                                placeholder="Cari nama usaha, donatur, no urut, alamat..."
                                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100"
                            />
                            {searchTugas && (
                                <button onClick={() => setSearchTugas('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer">
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start sm:justify-end">
                            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800 shadow-sm text-xs">
                                {[
                                    { id: 'Semua', label: 'Semua' },
                                    { id: 'Belum', label: 'Belum' },
                                    { id: 'Dijemput', label: 'Dijemput' },
                                    { id: 'Sudah Ditarik', label: 'Selesai' }
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setStatusTugasFilter(item.id)}
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${statusTugasFilter === item.id ? 'bg-wiz-green text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <select
                                value={tipeTugasFilter}
                                onChange={(e) => setTipeTugasFilter(e.target.value)}
                                className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                            >
                                <option value="Semua">Semua Tipe</option>
                                <option value="Pundi Umum">Pundi Umum</option>
                                <option value="Pundi Pribadi">Pundi Pribadi</option>
                            </select>
                        </div>
                    </div>

                    {/* List Tugas Penarikan dengan Scrollbar Mandiri */}
                    <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto pr-1 sm:pr-2 space-y-3 pb-6 custom-scrollbar">
                        {filteredTugasPundis.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-xs">
                                <i className="fa-solid fa-clipboard-check text-3xl mb-2 text-gray-300"></i>
                                <p>Tidak ada pundi yang cocok dengan filter tugas saat ini.</p>
                            </div>
                        ) : (
                            filteredTugasPundis.map((p) => {
                                const currentRecord = visibleRiwayatPundis.find(r =>
                                    String(r.pundiId) === String(p.id) &&
                                    r.date && new Date(r.date).getMonth() === currentMonth &&
                                    new Date(r.date).getFullYear() === currentYear
                                );
                                const tStatus = currentRecord ? currentRecord.status : 'Belum';
                                const isChecked = selectedTaskIds.has(p.id);

                                return (
                                    <div 
                                        key={p.id} 
                                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                            isChecked 
                                                ? 'bg-wiz-green/5 dark:bg-emerald-950/30 border-wiz-green ring-1 ring-wiz-green' 
                                                : tStatus === 'Berhasil' 
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40' 
                                                : tStatus === 'Dijemput' 
                                                ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/40' 
                                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-wiz-green/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 flex-1">
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelectTask(p.id)}
                                                className="w-5 h-5 mt-1 text-wiz-green rounded-lg focus:ring-wiz-green cursor-pointer accent-wiz-green"
                                            />

                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                        #{p.noUrut}
                                                    </span>
                                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{p.usaha}</h4>
                                                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${p.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                                        {p.tipePundi || 'Pundi Umum'}
                                                    </span>
                                                    
                                                    {tStatus === 'Berhasil' ? (
                                                        <span className="px-2 py-0.5 bg-wiz-green text-white text-[10px] font-bold rounded-md">
                                                            <i className="fa-solid fa-check mr-1"></i> Selesai ({formatRp(currentRecord.amount)})
                                                        </span>
                                                    ) : tStatus === 'Dijemput' ? (
                                                        <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-md">
                                                            <i className="fa-solid fa-box-open mr-1"></i> Dalam Penjemputan
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md">
                                                            Belum Dijemput
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{p.donorName}</span> • {p.alamat}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Aksi Tugas: Lihat Data, Jemput, Hitung Uang */}
                                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setDetailPundi(p)}
                                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                title="Lihat Rincian Data Pundi"
                                            >
                                                <i className="fa-solid fa-eye text-wiz-orange"></i> Lihat Data
                                            </button>

                                            {tStatus === 'Dijemput' ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => { setEditingRiwayat(currentRecord); setIsEditRiwayatOpen(true); }} 
                                                    className="px-3 py-1.5 bg-wiz-green hover:bg-wiz-green_dark text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-calculator"></i> Hitung Uang
                                                </button>
                                            ) : tStatus === 'Berhasil' ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => { setEditingRiwayat(currentRecord); setIsEditRiwayatOpen(true); }} 
                                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-pen-to-square"></i> Edit Hasil
                                                </button>
                                            ) : (
                                                <SafeButton 
                                                    onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} 
                                                    variant="accent" 
                                                    className="text-xs py-1.5 px-3"
                                                >
                                                    <i className="fa-solid fa-hand-holding-box mr-1"></i> Jemput
                                                </SafeButton>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: DATA MASTER PUNDI (TABEL MANDIRI & LIHAT DATA) */}
            {activeSubTab === 'master' && (
                <div className="space-y-4 animate-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row justify-between gap-3">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                                <input
                                    type="text"
                                    value={searchMaster}
                                    onChange={(e) => setSearchMaster(e.target.value)}
                                    placeholder="Cari No. Urut, nama donatur, tipe pundi, usaha, alamat..."
                                    className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={tipeMasterFilter}
                                    onChange={(e) => setTipeMasterFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="Semua">Semua Tipe</option>
                                    <option value="Pundi Umum">Pundi Umum</option>
                                    <option value="Pundi Pribadi">Pundi Pribadi</option>
                                </select>

                                <select
                                    value={statusMasterFilter}
                                    onChange={(e) => setStatusMasterFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="Semua">Semua Status</option>
                                    <option value="Aktif">Aktif</option>
                                    <option value="Ditarik">Ditarik</option>
                                </select>

                                <SafeButton 
                                    onClick={() => { setEditingPundi(null); setIsPundiModalOpen(true); }}
                                    icon="fa-solid fa-plus"
                                    variant="primary"
                                    className="text-xs py-2"
                                >
                                    Tambah Pundi
                                </SafeButton>
                            </div>
                        </div>
                    </div>

                    {/* Tabel Master Pundi Mandiri */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-16">No. Urut</th>
                                        <th className="px-4 py-3">Usaha & Donatur</th>
                                        <th className="px-4 py-3">Alamat</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {visiblePundis
                                        .filter(p => {
                                            const term = searchMaster.toLowerCase().trim();
                                            const matchSearch = !term || String(p.noUrut || '').includes(term) || String(p.donorName || '').toLowerCase().includes(term) || String(p.usaha || '').toLowerCase().includes(term);
                                            const matchStatus = statusMasterFilter === 'Semua' || p.status === statusMasterFilter;
                                            const matchTipe = tipeMasterFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeMasterFilter;
                                            return matchSearch && matchStatus && matchTipe;
                                        })
                                        .map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 text-center font-black text-wiz-green">#{p.noUrut}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-gray-800 dark:text-gray-100">{p.usaha}</p>
                                                    <p className="text-[11px] text-gray-400">{p.donorName} ({p.tipePundi || 'Pundi Umum'})</p>
                                                </td>
                                                <td className="px-4 py-3 max-w-xs truncate text-gray-500 dark:text-gray-400">{p.alamat || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'Aktif' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-red-50 text-red-500'}`}>{p.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setDetailPundi(p)} 
                                                            className="p-1.5 text-wiz-green hover:bg-wiz-green/10 rounded-lg text-xs font-bold"
                                                            title="Lihat Rincian Data"
                                                        >
                                                            <i className="fa-solid fa-eye"></i>
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setPrintQR(p)} 
                                                            className="p-1.5 text-wiz-orange hover:bg-wiz-orange/10 rounded-lg"
                                                            title="Cetak Stiker QR"
                                                        >
                                                            <i className="fa-solid fa-qrcode"></i>
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setEditingPundi(p); setIsPundiModalOpen(true); }} 
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                            title="Edit Data Pundi"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square"></i>
                                                        </button>
                                                        {isAdmin && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => deletePundi(p.id)} 
                                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                                                title="Hapus Data"
                                                            >
                                                                <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: RIWAYAT SEDEKAH */}
            {activeSubTab === 'riwayat' && (
                <div className="space-y-4 animate-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="w-full md:w-80 relative">
                            <input
                                type="text"
                                value={searchRiwayat}
                                onChange={(e) => setSearchRiwayat(e.target.value)}
                                placeholder="Cari nama usaha, donatur, amil..."
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-wiz-green text-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <select
                            value={statusRiwayatFilter}
                            onChange={(e) => setStatusRiwayatFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                            <option value="Semua">Semua Status</option>
                            <option value="Berhasil">Berhasil (Dihitung)</option>
                            <option value="Dijemput">Dijemput (Belum Dihitung)</option>
                            <option value="Gagal">Gagal / Kosong</option>
                        </select>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">Tanggal</th>
                                        <th className="px-4 py-3">Donatur & Usaha</th>
                                        <th className="px-4 py-3">Nominal</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3">Amil</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {[...visibleRiwayatPundis]
                                        .filter(r => {
                                            const term = searchRiwayat.toLowerCase().trim();
                                            const matchSearch = !term || String(r.donorName || '').toLowerCase().includes(term) || String(r.usaha || '').toLowerCase().includes(term) || String(r.amilName || '').toLowerCase().includes(term);
                                            const matchStatus = statusRiwayatFilter === 'Semua' || r.status === statusRiwayatFilter;
                                            return matchSearch && matchStatus;
                                        })
                                        .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))
                                        .map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 text-gray-500">{formatDate(r.date)}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-gray-800 dark:text-gray-100">{r.donorName}</p>
                                                    <p className="text-[11px] text-gray-400">{r.usaha} (No. {r.noUrut})</p>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-wiz-green">{formatRp(r.amount)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green' : r.status === 'Dijemput' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-50 text-red-500'}`}>{r.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.amilName}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setEditingRiwayat(r); setIsEditRiwayatOpen(true); }}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg text-xs"
                                                            title="Edit Hasil"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square"></i>
                                                        </button>
                                                        {isAdmin && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => deleteRiwayat(r.id)}
                                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg text-xs"
                                                                title="Hapus"
                                                            >
                                                                <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL LIHAT DATA DETAIL PUNDI */}
            <SafeModal isOpen={!!detailPundi} onClose={() => setDetailPundi(null)} title={detailPundi ? `Detail Pundi #${detailPundi.noUrut} - ${detailPundi.usaha}` : 'Detail Pundi'}>
                {detailPundi && (() => {
                    const rawPhone = String(detailPundi.phone || '').replace(/[^0-9]/g, '');
                    const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : (rawPhone.startsWith('8') ? '62' + rawPhone : rawPhone);
                    const mapUrls = parseMapUrls(detailPundi.mapUrl);
                    const riwayatPundiIni = visibleRiwayatPundis.filter(r => String(r.pundiId) === String(detailPundi.id) || String(r.noUrut) === String(detailPundi.noUrut)).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                    return (
                        <div className="space-y-4 text-xs">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                                    <span className="text-gray-400 font-bold uppercase">Nomor Registrasi:</span>
                                    <span className="text-base font-black text-wiz-green">#{detailPundi.noUrut}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 font-semibold">Jenis Pundi:</span>
                                    <span className={`px-2 py-0.5 rounded font-bold ${detailPundi.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{detailPundi.tipePundi || 'Pundi Umum'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 font-semibold">Nama Donatur:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-100">{detailPundi.donorName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 font-semibold">Nama Usaha/Titik:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-100">{detailPundi.usaha}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-gray-400 font-semibold">Alamat Lengkap:</span>
                                    <p className="text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">{detailPundi.alamat || '-'}</p>
                                </div>
                            </div>

                            {/* Tombol Akses Cepat: WhatsApp & Navigasi Maps */}
                            <div className="grid grid-cols-2 gap-2">
                                {cleanPhone ? (
                                    <a
                                        href={`https://wa.me/${cleanPhone}?text=Assalamu'alaikum%20Bapak/Ibu%20${encodeURIComponent(detailPundi.donorName)},%20kami%20dari%20petugas%20WIZ%20Berau%20terkait%20kotak%20pundi...`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                                    >
                                        <i className="fa-brands fa-whatsapp text-sm"></i> Chat WA
                                    </a>
                                ) : (
                                    <div className="py-2.5 px-3 bg-gray-100 text-gray-400 rounded-xl text-center">No WA (-)</div>
                                )}

                                {detailPundi.mapUrl ? (
                                    <a
                                        href={mapUrls.navUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="py-2.5 px-3 bg-wiz-green hover:bg-wiz-green_dark text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center"
                                    >
                                        <i className="fa-solid fa-location-arrow"></i> Rute Maps
                                    </a>
                                ) : (
                                    <div className="py-2.5 px-3 bg-gray-100 text-gray-400 rounded-xl text-center">GPS (-)</div>
                                )}
                            </div>

                            {/* Riwayat Penarikan Kotak Ini */}
                            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <h5 className="font-bold text-gray-700 dark:text-gray-200 text-xs">Riwayat Penarikan Kotak Ini ({riwayatPundiIni.length})</h5>
                                <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                    {riwayatPundiIni.length === 0 ? (
                                        <p className="text-gray-400 italic">Belum ada riwayat penarikan yang tercatat.</p>
                                    ) : (
                                        riwayatPundiIni.map((r, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                                                <div>
                                                    <p className="font-bold text-wiz-green">{formatRp(r.amount)}</p>
                                                    <p className="text-[10px] text-gray-400">{formatDate(r.date)} • Amil: {r.amilName}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <SafeButton variant="secondary" onClick={() => setDetailPundi(null)}>Tutup</SafeButton>
                            </div>
                        </div>
                    );
                })()}
            </SafeModal>

            {/* MODAL DAFTAR PUNDI BELUM DIJEMPUT */}
            <SafeModal isOpen={isBelumDijemputModalOpen} onClose={() => setIsBelumDijemputModalOpen(false)} title={`Pundi Belum Dijemput Periode Ini (${stats.belumDijemputCount})`}>
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">Berikut daftar kotak pundi aktif yang belum dijemput atau belum dicetak pada periode ini:</p>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {stats.belumDijemputCount === 0 ? (
                            <div className="p-6 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-xs">
                                <i className="fa-solid fa-circle-check text-wiz-green text-2xl mb-1"></i>
                                <p>Alhamdulillah, semua pundi aktif pada periode ini sudah dalam proses penjemputan atau berhasil ditarik.</p>
                            </div>
                        ) : (
                            stats.pundiBelumDijemputList.map((p) => (
                                <div key={p.id} className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-wiz-green text-xs">#{p.noUrut}</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100 text-xs">{p.usaha}</span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">{p.tipePundi || 'Umum'}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{p.donorName} • {p.alamat}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setDetailPundi(p); setIsBelumDijemputModalOpen(false); }}
                                        className="px-2.5 py-1.5 bg-wiz-green/10 hover:bg-wiz-green text-wiz-green hover:text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                                    >
                                        Lihat Data
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                        <SafeButton variant="secondary" onClick={() => setIsBelumDijemputModalOpen(false)}>Tutup</SafeButton>
                    </div>
                </div>
            </SafeModal>

            {/* MODAL FORM TAMBAH / EDIT PUNDI */}
            <SafeModal isOpen={isPundiModalOpen} onClose={() => { setIsPundiModalOpen(false); setEditingPundi(null); }} title={editingPundi ? `Edit Pundi #${editingPundi.noUrut}` : 'Tambah Pundi Baru'}>
                <form onSubmit={handleSavePundiForm} className="space-y-3.5 text-xs">
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Nomor Urut Pundi *</label>
                        <input type="number" name="noUrut" required defaultValue={editingPundi ? editingPundi.noUrut : (pundis.length + 1)} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Jenis Pundi *</label>
                        <select name="tipePundi" defaultValue={editingPundi?.tipePundi || 'Pundi Umum'} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none">
                            <option value="Pundi Umum">Pundi Umum</option>
                            <option value="Pundi Pribadi">Pundi Pribadi</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Nama Donatur / Pemilik *</label>
                        <input type="text" name="donorName" required defaultValue={editingPundi?.donorName || ''} placeholder="Contoh: H. Ahmad" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Nomor WhatsApp *</label>
                        <input type="text" name="phone" required defaultValue={editingPundi?.phone || ''} placeholder="Contoh: 08123456789" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Nama Usaha / Lokasi Titik *</label>
                        <input type="text" name="usaha" required defaultValue={editingPundi?.usaha || ''} placeholder="Contoh: Warung Berkah" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Alamat Lengkap *</label>
                        <textarea name="alamat" required defaultValue={editingPundi?.alamat || ''} rows="2" placeholder="Jl. Durian 3 No. 12, Tanjung Redeb" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none"></textarea>
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Link Google Maps (GPS)</label>
                        <input type="text" name="mapUrl" defaultValue={editingPundi?.mapUrl || ''} placeholder="https://maps.google.com/..." className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="font-bold text-gray-600 dark:text-gray-300">Status Pundi *</label>
                        <select name="status" defaultValue={editingPundi?.status || 'Aktif'} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none">
                            <option value="Aktif">Aktif</option>
                            <option value="Ditarik">Ditarik</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <SafeButton variant="secondary" onClick={() => { setIsPundiModalOpen(false); setEditingPundi(null); }}>Batal</SafeButton>
                        <SafeButton type="submit" variant="primary">Simpan Pundi</SafeButton>
                    </div>
                </form>
            </SafeModal>

            {/* MODAL INPUT LAPORAN PENARIKAN */}
            <SafeModal isOpen={isInputModalOpen} onClose={() => { setIsInputModalOpen(false); setSelectedPundi(null); }} title={selectedPundi ? `Laporan: ${selectedPundi.usaha}` : 'Laporan Penarikan'}>
                {selectedPundi && (
                    <form onSubmit={submitInputHasil} className="space-y-3.5 text-xs">
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Tanggal Penarikan *</label>
                            <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                        </div>
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Status Penjemputan *</label>
                            <select name="status" defaultValue="Dijemput" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none">
                                <option value="Dijemput">Kotak Dijemput (Hitung Nanti)</option>
                                <option value="Berhasil">Langsung Dihitung (Selesai)</option>
                                <option value="Gagal">Gagal / Pundi Kosong</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Nominal Uang (Rp) - Jika Langsung Dihitung</label>
                            <input type="number" name="amount" placeholder="0" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                        </div>
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Catatan (Opsional)</label>
                            <textarea name="notes" rows="2" placeholder="Catatan tambahan..." className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none"></textarea>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <SafeButton variant="secondary" onClick={() => { setIsInputModalOpen(false); setSelectedPundi(null); }}>Batal</SafeButton>
                            <SafeButton type="submit" variant="primary">Simpan Laporan</SafeButton>
                        </div>
                    </form>
                )}
            </SafeModal>

            {/* MODAL EDIT RIWAYAT PENARIKAN (HITUNG UANG) */}
            <SafeModal isOpen={isEditRiwayatOpen} onClose={() => { setIsEditRiwayatOpen(false); setEditingRiwayat(null); }} title={`Edit Laporan: ${editingRiwayat?.usaha || ''}`}>
                {editingRiwayat && (
                    <form onSubmit={submitEditRiwayat} className="space-y-3.5 text-xs">
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Tanggal Penarikan *</label>
                            <input type="date" name="date" required defaultValue={editingRiwayat.date ? String(editingRiwayat.date).split('T')[0] : ''} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                        </div>
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Status Penjemputan *</label>
                            <select name="status" defaultValue={editingRiwayat.status || 'Berhasil'} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none">
                                <option value="Berhasil">Selesai Dihitung (Berhasil)</option>
                                <option value="Dijemput">Masih Dijemput (Belum Dihitung)</option>
                                <option value="Gagal">Gagal / Pundi Kosong</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Nominal Uang (Rp) *</label>
                            <input type="number" name="amount" required defaultValue={editingRiwayat.amount || 0} className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-bold text-wiz-green" />
                        </div>
                        <div>
                            <label className="font-bold text-gray-600 dark:text-gray-300">Catatan</label>
                            <textarea name="notes" defaultValue={editingRiwayat.notes || ''} rows="2" className="w-full mt-1 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none"></textarea>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <SafeButton variant="secondary" onClick={() => { setIsEditRiwayatOpen(false); setEditingRiwayat(null); }}>Batal</SafeButton>
                            <SafeButton type="submit" variant="primary">Simpan Perubahan</SafeButton>
                        </div>
                    </form>
                )}
            </SafeModal>

            {/* MODAL CETAK STIKER QR PUNDI */}
            <SafeModal isOpen={!!printQR} onClose={() => setPrintQR(null)} title="Cetak Stiker Pundi">
                {printQR && (
                    <div className="flex flex-col items-center space-y-4">
                        <div id="print-qr-area" className="w-72 bg-white border-2 border-wiz-green rounded-3xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-wiz-orange"></div>
                            <img src="https://drive.google.com/uc?id=1V34EDnLvk3ORldMA7-5v3AnS5RN5E3GH" alt="Logo WIZ" className="h-10 mb-4" />
                            <h4 className="font-black text-gray-800 text-lg uppercase mb-1">{printQR.tipePundi === 'Pundi Pribadi' ? 'Pundi Pribadi' : 'Kotak Amal'}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Wahdah Inspirasi Zakat</p>
                            
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WIZ-PUNDI-${printQR.id}&margin=0`} alt="QR Code Pundi" className="w-32 h-32 mb-4" />
                            
                            <div className="bg-wiz-green/10 text-wiz-green_dark w-full py-2 rounded-xl mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Nomor Registrasi</p>
                                <p className="text-3xl font-black">{printQR.noUrut}</p>
                            </div>
                            <p className="font-bold text-gray-800 text-sm mt-2">{printQR.usaha}</p>
                        </div>
                        
                        <div className="flex gap-3 w-full">
                            <SafeButton variant="secondary" className="flex-1" onClick={() => setPrintQR(null)}>Tutup</SafeButton>
                            <SafeButton variant="primary" className="flex-1" icon="fa-solid fa-print" onClick={() => {
                                const pw = window.open('', '_blank');
                                if (!pw) return;
                                pw.document.write(`
                                    <html><head><title>Stiker QR Pundi - #${printQR.noUrut}</title><script src="https://cdn.tailwindcss.com"><\/script></head>
                                    <body class="flex items-center justify-center p-10 bg-white">
                                    ${document.getElementById('print-qr-area').outerHTML}
                                    <script>setTimeout(() => { window.print(); }, 800);<\/script>
                                    </body></html>
                                `);
                                pw.document.close();
                            }}>Cetak</SafeButton>
                        </div>
                    </div>
                )}
            </SafeModal>
        </div>
    );
};

window.PundiView = PundiView;
