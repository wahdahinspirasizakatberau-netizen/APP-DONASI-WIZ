// Komponen Manajemen Pundi WIZ (Dashboard Sinkron, Tugas Penarikan Interaktif, Detail Data, Cetak & Scroll Mandiri)

const { useState, useEffect, useMemo, useRef } = React;

// Fallback aman untuk fungsi global
const formatRp = window.formatRp || ((num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0));
const formatDate = window.formatDate || ((d) => d || '-');
const parseMapUrls = window.parseMapUrls || ((url) => ({ navUrl: url || '#', webUrl: url || '#' }));
const getDriveThumbnailUrl = window.getDriveThumbnailUrl || ((url) => url || '');

const PundiView = ({ pundis = [], setPundis, riwayatPundis = [], setRiwayatPundis, contacts = [], programs = [], user = {}, syncDataToSheet, darkMode, setViewImage, amils = [], setActiveTab }) => {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    const [selectedAmilFilter, setSelectedAmilFilter] = useState(user?.role === 'Admin' ? 'Semua' : (user?.name || 'Semua'));
    
    // Modal input penjemputan & edit riwayat
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [selectedPundi, setSelectedPundi] = useState(null);
    const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
    const [printQR, setPrintQR] = useState(null);
    const [editingRiwayat, setEditingRiwayat] = useState(null);
    const [isEditRiwayatOpen, setIsEditRiwayatOpen] = useState(false);

    // Modal Lihat Data / Detail Lengkap Pundi
    const [detailPundi, setDetailPundi] = useState(null);

    // Modal List Khusus Pundi Belum Dijemput dari Dashboard
    const [isBelumDijemputModalOpen, setIsBelumDijemputModalOpen] = useState(false);

    // State Checklist Pilihan Cetak Tugas
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

    // Filter Master Pundi
    const [searchMaster, setSearchMaster] = useState('');
    const [statusMasterFilter, setStatusMasterFilter] = useState('Semua');
    const [creatorMasterFilter, setCreatorMasterFilter] = useState('Semua');
    const [tipeMasterFilter, setTipeMasterFilter] = useState('Semua');
    const [masterSortOrder, setMasterSortOrder] = useState('asc');

    // Filter Tugas Penarikan
    const [searchTugas, setSearchTugas] = useState('');
    const [statusTugasFilter, setStatusTugasFilter] = useState('Semua'); // 'Semua', 'Belum', 'Dijemput', 'Sudah Ditarik'
    const [tipeTugasFilter, setTipeTugasFilter] = useState('Semua');
    const [urutAwal, setUrutAwal] = useState('');
    const [urutAkhir, setUrutAkhir] = useState('');

    // Filter Riwayat
    const [searchRiwayat, setSearchRiwayat] = useState('');
    const [statusRiwayatFilter, setStatusRiwayatFilter] = useState('Semua');
    const [monthRiwayatFilter, setMonthRiwayatFilter] = useState('Semua');
    const [amilRiwayatFilter, setAmilRiwayatFilter] = useState('Semua');

    // Filter Periode Dashboard Analitik
    const [dashMonth, setDashMonth] = useState(new Date().getMonth());
    const [dashYear, setDashYear] = useState(new Date().getFullYear());
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const yearOptions = Array.from({length: 7}, (_, i) => new Date().getFullYear() - 3 + i);

    const isAdmin = user?.role === 'Admin';
    const effectiveAmil = isAdmin ? selectedAmilFilter : user?.name;

    const visiblePundis = useMemo(() => {
        if (isAdmin && effectiveAmil === 'Semua') {
            return pundis;
        }
        return pundis.filter(p => {
            const creator = p.createdBy || contacts.find(c => c.name === p.donorName)?.createdBy;
            return creator === effectiveAmil;
        });
    }, [pundis, isAdmin, effectiveAmil, contacts]);

    const visibleRiwayatPundis = useMemo(() => {
        if (isAdmin && effectiveAmil === 'Semua') {
            return riwayatPundis;
        }
        return riwayatPundis.filter(r => r.amilName === effectiveAmil);
    }, [riwayatPundis, isAdmin, effectiveAmil]);

    const allAmilNames = useMemo(() => {
        const names = new Set((amils || []).map(a => a.name));
        pundis.forEach(p => {
            const c = p.createdBy || contacts.find(cnt => cnt.name === p.donorName)?.createdBy;
            if (c) names.add(c);
        });
        riwayatPundis.forEach(r => {
            if (r.amilName) names.add(r.amilName);
        });
        return Array.from(names).filter(Boolean);
    }, [amils, pundis, riwayatPundis, contacts]);

    const uniqueAmils = allAmilNames;

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

    const activePundiCampaign = useMemo(() => {
        return programs.find(p => p.status === 'Aktif' && ((p.category && p.category.includes('Pundi')) || (p.name && p.name.toLowerCase().includes('pundi'))));
    }, [programs]);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Analitik Tersinkronisasi (Berdasarkan dashMonth & dashYear)
    const stats = useMemo(() => {
        const activeBoxes = visiblePundis.filter(p => p.status === 'Aktif');
        const totalAktif = activeBoxes.length;
        const totalUmum = activeBoxes.filter(p => (p.tipePundi || 'Pundi Umum') === 'Pundi Umum').length;
        const totalPribadi = activeBoxes.filter(p => p.tipePundi === 'Pundi Pribadi').length;

        // Riwayat Penarikan yang sesuai filter periode dashboard
        const riwayatPeriode = visibleRiwayatPundis.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            if (isNaN(d.getTime())) return false;
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === Number(dashMonth);
            const matchYear = d.getFullYear() === Number(dashYear);
            return matchMonth && matchYear;
        });

        // Nominal Terkumpul Berhasil
        const riwayatBerhasil = riwayatPeriode.filter(r => r.status === 'Berhasil');
        const totalDanaBulanIni = riwayatBerhasil.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        // Breakdown Nominal Umum vs Pribadi
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

        // Status Kotak di Periode Ini
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
        
        // Kotak yang benar-benar belum dijemput (belum berhasil ditarik & belum berstatus dijemput)
        const pundiBelumDijemputList = activeBoxes.filter(p => 
            !pickedUpBoxIds.has(String(p.id)) && 
            !pickedUpBoxIds.has(String(p.noUrut)) && 
            !inProgressBoxIds.has(String(p.id)) && 
            !inProgressBoxIds.has(String(p.noUrut))
        );
        const belumDijemputCount = pundiBelumDijemputList.length;

        // Target Campaign Proporsional
        let targetPeriode = 0;
        if (activePundiCampaign) {
            targetPeriode = dashMonth === 'Semua' 
                ? Number(activePundiCampaign.target || 0) 
                : Math.round(Number(activePundiCampaign.target || 0) / 12);
        }

        const totalDanaKumulatif = visibleRiwayatPundis.filter(r => r.status === 'Berhasil').reduce((sum, r) => sum + Number(r.amount || 0), 0);

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
            targetPeriode,
            totalDanaKumulatif
        };
    }, [visiblePundis, visibleRiwayatPundis, dashMonth, dashYear, activePundiCampaign]);

    const activePundisSorted = [...visiblePundis].filter(p => p.status === 'Aktif').sort((a, b) => Number(a.noUrut) - Number(b.noUrut));

    // Filter Tugas Penarikan Bulan Ini
    const filteredTugasPundis = useMemo(() => {
        return activePundisSorted.filter(p => {
            const currentRecord = visibleRiwayatPundis.find(r => 
                String(r.pundiId) === String(p.id) && 
                new Date(r.date).getMonth() === currentMonth && 
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

            const pNo = Number(p.noUrut);
            const matchUrutAwal = urutAwal === '' || isNaN(Number(urutAwal)) || pNo >= Number(urutAwal);
            const matchUrutAkhir = urutAkhir === '' || isNaN(Number(urutAkhir)) || pNo <= Number(urutAkhir);

            return matchSearch && matchStatus && matchTipe && matchUrutAwal && matchUrutAkhir;
        });
    }, [activePundisSorted, visibleRiwayatPundis, searchTugas, statusTugasFilter, tipeTugasFilter, urutAwal, urutAkhir, currentMonth, currentYear]);

    // Handle Checkbox Pilihan Tugas
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

    // Otomatis ubah status pundi menjadi "Dijemput" saat dicetak
    const markPundisAsDijemput = (pundisPrinted) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let newOrUpdatedRiwayat = [...riwayatPundis];
        let hasChanges = false;

        pundisPrinted.forEach(p => {
            const existingIdx = newOrUpdatedRiwayat.findIndex(r => 
                String(r.pundiId) === String(p.id) && 
                new Date(r.date).getMonth() === currentMonth && 
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
            setPundis && setPundis([...pundis]);
            setRiwayatPundis(newOrUpdatedRiwayat);
            syncDataToSheet && syncDataToSheet('RiwayatPundi', newOrUpdatedRiwayat);
        }
    };

    // Cetak Lembar Checklist Penarikan dengan nomor urut otomatis running (1, 2, 3...)
    const handlePrintChecklist = () => {
        const dataToPrint = getPundisToPrint();
        if (dataToPrint.length === 0) return;

        markPundisAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        const tglCetak = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const totalItem = dataToPrint.length;
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '-');
        
        const fontSize = totalItem > 25 ? '8.5px' : '9.5px';
        const cellPadding = totalItem > 25 ? '3px 4px' : '5px 6px';

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
                    <div><b>Tanggal Cetak:</b> ${tglCetak}</div>
                    <div><b>Petugas Amil:</b> ${printPetugasName}</div>
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
                    <b>Catatan Amil:</b> Pundi telah otomatis berstatus <b>"Dalam Penjemputan"</b> di sistem.<br/>
                    Setelah kotak dijemput dan uang dihitung di kantor, buka menu Tugas dan klik <b>"Hitung Uang"</b> untuk menyelesaikan.
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

    // Cetak 10 Nota A4 dengan penomoran otomatis
    const handlePrintNotaA4 = () => {
        const dataToPrint = getPundisToPrint();
        if (dataToPrint.length === 0) return;

        markPundisAsDijemput(dataToPrint);

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

    const savePundi = (formData, isEdit) => {
        const now = new Date().toISOString();
        const existing = isEdit ? pundis.find(p => String(p.id) === String(formData.id)) : null;
        let newData = { 
            ...(existing || {}),
            ...formData, 
            tipePundi: formData.tipePundi || (existing && existing.tipePundi) || 'Pundi Umum',
            updatedAt: now 
        };
        if (!isEdit) {
            newData.id = Date.now();
            newData.createdAt = now;
            newData.createdBy = user?.name || 'Admin';
        }
        const updatedList = isEdit 
            ? pundis.map(p => String(p.id) === String(newData.id) ? newData : p) 
            : [...pundis, newData];
        setPundis && setPundis(updatedList);
        syncDataToSheet && syncDataToSheet('Pundi', updatedList);
    };

    const deletePundi = (row) => {
        const updatedList = pundis.filter(p => String(p.id) !== String(row.id));
        setPundis && setPundis(updatedList);
        syncDataToSheet && syncDataToSheet('Pundi', updatedList);
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
        setRiwayatPundis && setRiwayatPundis(updatedRiwayat);
        syncDataToSheet && syncDataToSheet('RiwayatPundi', updatedRiwayat);
        setIsInputModalOpen(false);
    };

    const handleOpenEditRiwayat = (row) => {
        setEditingRiwayat(row);
        setIsEditRiwayatOpen(true);
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
        setRiwayatPundis && setRiwayatPundis(updated);
        syncDataToSheet && syncDataToSheet('RiwayatPundi', updated);
        setIsEditRiwayatOpen(false);
        setEditingRiwayat(null);
    };

    const deleteRiwayat = (row) => {
        const updated = riwayatPundis.filter(r => String(r.id) !== String(row.id));
        setRiwayatPundis && setRiwayatPundis(updated);
        syncDataToSheet && syncDataToSheet('RiwayatPundi', updated);
    };

    return (
        <div className="space-y-6 slide-up relative pb-24 lg:pb-10">
            {/* Header Manajemen Pundi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <i className="fa-solid fa-box-open text-wiz-orange"></i> Manajemen Pundi WIZ
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem kontrol kotak, checklist penarikan, dan pencatatan sedekah.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setActiveTab('scanner')} 
                        variant="primary" 
                        className="hidden lg:flex shadow-md shadow-wiz-green/30 px-5"
                        icon="fa-solid fa-camera"
                    >
                        Pindai QR Pundi
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
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-wiz-green text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                    </button>
                ))}
            </div>

            {/* SUBTAB 1: DASHBOARD ANALITIK TERSINKRON */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-6 animate-in">
                    {/* Bar Filter Periode */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                                <i className="fa-solid fa-calendar-check text-wiz-green"></i> Filter Periode Analitik
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Target, perolehan Pundi Umum/Pribadi, dan status jemput otomatis tersinkron.</p>
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

                    {/* Banner Target & Capaian Tersinkron */}
                    <div className="p-6 bg-gradient-to-r from-wiz-green_dark via-wiz-green to-teal-700 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
                                    <i className="fa-solid fa-bullseye"></i> Capaian Periode: {dashMonth === 'Semua' ? `Tahun ${dashYear}` : `${monthNames[dashMonth]} ${dashYear}`}
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
                            <p className="text-xs text-gray-400 mt-1">Terkumpul dari {stats.totalUmum} kotak umum</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-house-user mr-1"></i> Pundi Pribadi
                                </span>
                                <i className="fa-solid fa-piggy-bank text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <h4 className="text-2xl font-black text-gray-800 dark:text-gray-100">{formatRp(stats.danaPribadi)}</h4>
                            <p className="text-xs text-gray-400 mt-1">Terkumpul dari {stats.totalPribadi} kotak pribadi</p>
                        </div>

                        {/* Kartu Pundi Belum Dijemput (Bisa diklik untuk LIHAT DATA) */}
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
                            <p className="text-[11px] text-gray-400 mt-1">Belum dikunjungi / belum dicetak periode ini</p>
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
                            <p className="text-[11px] text-gray-400 mt-2">Kotak yang sedang & telah dijemput</p>
                        </div>
                    </div>
                </div>
            )}

            {/* SUBTAB 2: TUGAS PENARIKAN (CHECKBOX, AUTO DIJEMPUT, LIHAT DATA, SCROLL MANDIRI) */}
            {activeSubTab === 'tugas' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 animate-in space-y-5">
                    {/* Header Bar & Tombol Cetak */}
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
                                Tandai pundi yang ingin dicetak. Saat dicetak, sistem otomatis menandai statusnya <b>"Dalam Penjemputan" (Dijemput)</b>.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={toggleSelectAllFiltered}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                <i className={`fa-solid ${selectedTaskIds.size === filteredTugasPundis.length && filteredTugasPundis.length > 0 ? 'fa-square-check text-wiz-green' : 'fa-square'}`}></i>
                                <span>{selectedTaskIds.size === filteredTugasPundis.length && filteredTugasPundis.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                            </button>

                            <Button 
                                onClick={handlePrintChecklist} 
                                icon="fa-solid fa-print" 
                                variant="secondary" 
                                className="text-xs py-2 px-3 shadow-sm" 
                                disabled={getPundisToPrint().length === 0}
                            >
                                Cetak Checklist ({getPundisToPrint().length})
                            </Button>

                            <Button 
                                onClick={handlePrintNotaA4} 
                                icon="fa-solid fa-receipt" 
                                variant="primary" 
                                className="text-xs py-2 px-3 shadow-sm" 
                                disabled={getPundisToPrint().length === 0}
                            >
                                Cetak Nota A4 ({getPundisToPrint().length})
                            </Button>
                        </div>
                    </div>

                    {/* Filter & Bar Pencarian Tugas */}
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
                                <button onClick={() => setSearchTugas('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600">
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
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${statusTugasFilter === item.id ? 'bg-wiz-green text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'}`}
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

                    {/* KONTEN TUGAS PENARIKAN: SCROLL MANDIRI DI ATAS MENU BAWAH */}
                    <div className="max-h-[60vh] sm:max-h-[66vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar space-y-3 pb-8">
                        {filteredTugasPundis.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-xs">
                                <i className="fa-solid fa-clipboard-check text-3xl mb-2 text-gray-300"></i>
                                <p>Tidak ada pundi yang cocok dengan filter tugas saat ini.</p>
                            </div>
                        ) : (
                            filteredTugasPundis.map((p) => {
                                const currentRecord = visibleRiwayatPundis.find(r => 
                                    String(r.pundiId) === String(p.id) && 
                                    new Date(r.date).getMonth() === currentMonth && 
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
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
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

                                        {/* Tombol Aksi: Lihat Data, Jemput, Hitung Uang */}
                                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setDetailPundi(p)}
                                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                                title="Lihat Rincian Data Pundi"
                                            >
                                                <i className="fa-solid fa-eye text-wiz-orange"></i> Lihat Data
                                            </button>

                                            {tStatus === 'Dijemput' ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenEditRiwayat(currentRecord)} 
                                                    className="px-3 py-1.5 bg-wiz-green hover:bg-wiz-green_dark text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                                                >
                                                    <i className="fa-solid fa-calculator"></i> Hitung Uang
                                                </button>
                                            ) : tStatus === 'Berhasil' ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenEditRiwayat(currentRecord)} 
                                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                                                >
                                                    <i className="fa-solid fa-pen-to-square"></i> Edit Hasil
                                                </button>
                                            ) : (
                                                <Button 
                                                    onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} 
                                                    variant="accent" 
                                                    className="text-xs py-1.5 px-3"
                                                >
                                                    <i className="fa-solid fa-hand-holding-box mr-1"></i> Jemput
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* SUBTAB 3: DATA MASTER PUNDI (DENGAN TOMBOL LIHAT DATA & SCROLL MANDIRI) */}
            {activeSubTab === 'master' && (
                <div className="space-y-4 animate-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
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
                            </div>
                        </div>
                    </div>

                    <div className="max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar pb-8">
                        <ModuleView 
                            title="Data Kotak Pundi" 
                            data={visiblePundis.filter(p => {
                                const term = searchMaster.toLowerCase().trim();
                                const matchSearch = !term || String(p.noUrut).includes(term) || String(p.donorName).toLowerCase().includes(term) || String(p.usaha).toLowerCase().includes(term);
                                const matchStatus = statusMasterFilter === 'Semua' || p.status === statusMasterFilter;
                                const matchTipe = tipeMasterFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeMasterFilter;
                                return matchSearch && matchStatus && matchTipe;
                            })} 
                            columns={[
                                { key: 'noUrut', label: 'No. Urut', render: r => <span className="font-bold text-wiz-green">#{r.noUrut}</span> },
                                { key: 'usaha', label: 'Nama Usaha / Lokasi', render: r => <div><p className="font-bold">{r.usaha}</p><p className="text-xs text-gray-400">{r.donorName} ({r.tipePundi || 'Pundi Umum'})</p></div> },
                                { key: 'alamat', label: 'Alamat Pundi' },
                                { key: 'status', label: 'Status', render: r => <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Aktif' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-red-50 text-red-500'}`}>{r.status}</span> },
                                { key: 'action_view', label: 'Rincian', render: r => (
                                    <button 
                                        type="button" 
                                        onClick={() => setDetailPundi(r)} 
                                        className="p-2 text-wiz-green hover:bg-wiz-green/10 rounded-lg text-xs font-bold flex items-center gap-1"
                                        title="Buka Lembar Detail Pundi"
                                    >
                                        <i className="fa-solid fa-eye text-sm"></i> Lihat
                                    </button>
                                )},
                                { key: 'print', label: 'QR', render: r => (
                                    <button onClick={() => setPrintQR(r)} className="p-2 text-wiz-orange hover:bg-wiz-orange/10 rounded-lg" title="Cetak Stiker">
                                        <i className="fa-solid fa-qrcode text-lg"></i>
                                    </button>
                                )}
                            ]} 
                            schema={[
                                { name: 'noUrut', label: 'Nomor Urut Pundi (Angka)', type: 'number', required: true },
                                { name: 'tipePundi', label: 'Jenis Pundi', type: 'select', options: ['Pundi Umum', 'Pundi Pribadi'], required: true },
                                { name: 'donorName', label: 'Nama Donatur', type: 'text', required: true },
                                { name: 'phone', label: 'Nomor WA', type: 'text', required: true },
                                { name: 'usaha', label: 'Nama Usaha / Lokasi Titik', required: true },
                                { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Ditarik'], required: true },
                                { name: 'alamat', label: 'Alamat Lengkap', type: 'berau_address', fullWidth: true, required: true },
                                { name: 'mapUrl', label: 'Titik Maps GPS', type: 'map_location', fullWidth: true }
                            ]} 
                            defaultValues={{ status: 'Aktif', tipePundi: 'Pundi Umum' }}
                            onSave={savePundi} 
                            onDelete={isAdmin ? deletePundi : null} 
                            canDelete={isAdmin}
                        />
                    </div>
                </div>
            )}

            {/* SUBTAB 4: RIWAYAT SEDEKAH */}
            {activeSubTab === 'riwayat' && (
                <div className="space-y-4 animate-in">
                    <div className="max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar pb-8">
                        <Table 
                            columns={[
                                { key: 'date', label: 'Tanggal', render: r => formatDate(r.date) },
                                { key: 'donorName', label: 'Donatur & Usaha', render: r => <div><p className="font-bold">{r.donorName}</p><p className="text-xs text-gray-500">{r.usaha} (No. {r.noUrut})</p></div> },
                                { key: 'amount', label: 'Nominal', render: r => <span className="font-bold text-wiz-green">{formatRp(r.amount)}</span> },
                                { key: 'status', label: 'Status', render: r => <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green' : r.status === 'Dijemput' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-50 text-red-500'}`}>{r.status}</span> },
                                { key: 'amilName', label: 'Amil Petugas' },
                                { key: 'notes', label: 'Catatan', render: r => <span className="text-xs text-gray-400">{r.notes || '-'}</span> }
                            ]}
                            data={[...visibleRiwayatPundis].sort((a,b) => new Date(b.date) - new Date(a.date))}
                            onEdit={handleOpenEditRiwayat}
                            onDelete={isAdmin ? deleteRiwayat : null}
                        />
                    </div>
                </div>
            )}

            {/* MODAL 1: LIHAT DATA DETAIL LENGKAP PUNDI */}
            <Modal isOpen={!!detailPundi} onClose={() => setDetailPundi(null)} title={detailPundi ? `Detail Pundi #${detailPundi.noUrut} - ${detailPundi.usaha}` : 'Detail Pundi'}>
                {detailPundi && (() => {
                    const rawPhone = String(detailPundi.phone || '').replace(/[^0-9]/g, '');
                    const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : (rawPhone.startsWith('8') ? '62' + rawPhone : rawPhone);
                    const mapUrls = parseMapUrls(detailPundi.mapUrl);
                    const riwayatPundiIni = visibleRiwayatPundis.filter(r => String(r.pundiId) === String(detailPundi.id) || String(r.noUrut) === String(detailPundi.noUrut)).sort((a, b) => new Date(b.date) - new Date(a.date));

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
                                <Button variant="secondary" onClick={() => setDetailPundi(null)}>Tutup</Button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* MODAL 2: DAFTAR PUNDI BELUM DIJEMPUT (DARI KLIK KARTU DASHBOARD) */}
            <Modal isOpen={isBelumDijemputModalOpen} onClose={() => setIsBelumDijemputModalOpen(false)} title={`Pundi Belum Dijemput Periode Ini (${stats.belumDijemputCount})`}>
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
                                        className="px-2.5 py-1.5 bg-wiz-green/10 hover:bg-wiz-green text-wiz-green hover:text-white rounded-lg text-xs font-bold transition-all shrink-0"
                                    >
                                        Lihat Data
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Button variant="secondary" onClick={() => setIsBelumDijemputModalOpen(false)}>Tutup</Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 3: INPUT LAPORAN PENJEMPUTAN */}
            <Modal isOpen={isInputModalOpen} onClose={() => { setIsInputModalOpen(false); setSelectedPundi(null); }} title={selectedPundi ? `Laporan Penarikan: ${selectedPundi.usaha}` : 'Laporan Penarikan'}>
                {selectedPundi && (
                    <DynamicForm 
                        schema={[
                            { name: 'date', label: 'Tanggal Penarikan', type: 'date', required: true },
                            { name: 'status', label: 'Status Penjemputan', type: 'select', options: [{value: 'Dijemput', label: 'Kotak Dijemput (Hitung Nanti)'}, {value: 'Berhasil', label: 'Langsung Dihitung (Selesai)'}, {value: 'Gagal', label: 'Gagal / Pundi Kosong'}], required: true },
                            { name: 'amount', label: 'Nominal Uang (Rp) - Jika Dihitung', isCurrency: true },
                            { name: 'receiptUrl', label: 'Foto Bukti / Nota', type: 'file', fullWidth: true },
                            { name: 'notes', label: 'Catatan (Opsional)', type: 'textarea' }
                        ]}
                        defaultValues={{ 
                            date: new Date().toISOString().split('T')[0], 
                            status: 'Dijemput' 
                        }}
                        onSubmit={submitInputHasil}
                        onCancel={() => { setIsInputModalOpen(false); setSelectedPundi(null); }}
                    />
                )}
            </Modal>

            {/* MODAL 4: EDIT LAPORAN RIWAYAT */}
            <Modal isOpen={isEditRiwayatOpen} onClose={() => { setIsEditRiwayatOpen(false); setEditingRiwayat(null); }} title={`Edit Laporan: ${editingRiwayat?.usaha || ''}`}>
                {editingRiwayat && (
                    <DynamicForm 
                        schema={[
                            { name: 'date', label: 'Tanggal Penarikan', type: 'date', required: true },
                            { name: 'status', label: 'Status Penjemputan', type: 'select', options: [{value: 'Berhasil', label: 'Selesai Dihitung (Berhasil)'}, {value: 'Dijemput', label: 'Masih Dijemput (Belum Dihitung)'}, {value: 'Gagal', label: 'Gagal / Pundi Kosong'}], required: true },
                            { name: 'amount', label: 'Nominal Uang (Rp)', isCurrency: true, required: true },
                            { name: 'receiptUrl', label: 'Foto Bukti / Nota', type: 'file', fullWidth: true },
                            { name: 'notes', label: 'Catatan (Opsional)', type: 'textarea' }
                        ]}
                        initialData={editingRiwayat}
                        onSubmit={saveEditRiwayat}
                        onCancel={() => { setIsEditRiwayatOpen(false); setEditingRiwayat(null); }}
                    />
                )}
            </Modal>

            {/* MODAL 5: CETAK STIKER QR PUNDI */}
            <Modal isOpen={!!printQR} onClose={() => setPrintQR(null)} title="Cetak Stiker Pundi">
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
                            <Button variant="secondary" className="flex-1" onClick={() => setPrintQR(null)}>Tutup</Button>
                            <Button variant="primary" className="flex-1" icon="fa-solid fa-print" onClick={() => {
                                const pw = window.open('', '_blank');
                                pw.document.write(`
                                    <html><head><title>Stiker QR Pundi - #${printQR.noUrut}</title><script src="https://cdn.tailwindcss.com"><\/script></head>
                                    <body class="flex items-center justify-center p-10 bg-white">
                                    ${document.getElementById('print-qr-area').outerHTML}
                                    <script>setTimeout(() => { window.print(); }, 800);<\/script>
                                    </body></html>
                                `);
                                pw.document.close();
                            }}>Cetak</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// Pasang ke objek window global agar tidak ada kendala antar file script
window.PundiView = PundiView;
