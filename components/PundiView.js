// Komponen Manajemen Pundi WIZ (Dashboard, Tugas Penarikan, Master Pundi, Riwayat Sedekah, Cetak)
const { useState, useEffect, useMemo, useRef } = React;

const PundiView = ({ pundis, setPundis, riwayatPundis, setRiwayatPundis, contacts, programs = [], user, syncDataToSheet, darkMode, setViewImage, amils = [], setActiveTab }) => {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    const [selectedAmilFilter, setSelectedAmilFilter] = useState(user?.name || 'Semua');
    
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [selectedPundi, setSelectedPundi] = useState(null);
    const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
    const [printQR, setPrintQR] = useState(null);

    const [editingRiwayat, setEditingRiwayat] = useState(null);
    const [isEditRiwayatOpen, setIsEditRiwayatOpen] = useState(false);
    
    // State Modal Belum Dijemput
    const [isBelumDijemputModalOpen, setIsBelumDijemputModalOpen] = useState(false);

    // State Checkbox Tugas Penarikan
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

    const [searchMaster, setSearchMaster] = useState('');
    const [statusMasterFilter, setStatusMasterFilter] = useState('Semua');
    const [creatorMasterFilter, setCreatorMasterFilter] = useState('Semua');
    const [tipeMasterFilter, setTipeMasterFilter] = useState('Semua');
    const [masterSortOrder, setMasterSortOrder] = useState('asc');

    const [searchTugas, setSearchTugas] = useState('');
    const [statusTugasFilter, setStatusTugasFilter] = useState('Semua');
    const [tipeTugasFilter, setTipeTugasFilter] = useState('Semua');
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
        setRiwayatPundis(updated);
        syncDataToSheet('RiwayatPundi', updated);
        setIsEditRiwayatOpen(false);
        setEditingRiwayat(null);
    };

    const deleteRiwayat = (row) => {
        const updated = riwayatPundis.filter(r => String(r.id) !== String(row.id));
        setRiwayatPundis(updated);
        syncDataToSheet('RiwayatPundi', updated);
    };

    const isAdmin = user?.role === 'Admin';
    const effectiveAmil = isAdmin ? selectedAmilFilter : user.name;

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
    
    const stats = useMemo(() => {
        const totalAktif = visiblePundis.filter(p => p.status === 'Aktif').length;
        const totalUmum = visiblePundis.filter(p => p.status === 'Aktif' && (p.tipePundi || 'Pundi Umum') === 'Pundi Umum').length;
        const totalPribadi = visiblePundis.filter(p => p.status === 'Aktif' && p.tipePundi === 'Pundi Pribadi').length;
        
        const penambahanUmum = visiblePundis.filter(p => {
            if (!p.createdAt) return false;
            const d = new Date(p.createdAt);
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === dashMonth;
            return matchMonth && d.getFullYear() === dashYear && (p.tipePundi || 'Pundi Umum') === 'Pundi Umum';
        }).length;

        const penambahanPribadi = visiblePundis.filter(p => {
            if (!p.createdAt) return false;
            const d = new Date(p.createdAt);
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === dashMonth;
            return matchMonth && d.getFullYear() === dashYear && p.tipePundi === 'Pundi Pribadi';
        }).length;

        const ditarikBulanIni = visiblePundis.filter(p => {
            if (!p.updatedAt) return false;
            const d = new Date(p.updatedAt);
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === dashMonth;
            return p.status === 'Ditarik' && matchMonth && d.getFullYear() === dashYear;
        }).length;
        
        const riwayatBulanIni = visibleRiwayatPundis.filter(r => {
            const d = new Date(r.date);
            const matchMonth = dashMonth === 'Semua' ? true : d.getMonth() === dashMonth;
            return matchMonth && d.getFullYear() === dashYear;
        });
        
        const riwayatBerhasil = riwayatBulanIni.filter(r => r.status === 'Berhasil');
        const berhasil = riwayatBerhasil.length;
        const gagal = riwayatBulanIni.filter(r => r.status === 'Gagal').length;
        const sedangDijemput = riwayatBulanIni.filter(r => r.status === 'Dijemput').length;
        const totalDanaBulanIni = riwayatBerhasil.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const totalDanaKumulatif = visibleRiwayatPundis.filter(r => r.status === 'Berhasil').reduce((sum, r) => sum + Number(r.amount || 0), 0);

        let danaUmum = 0;
        let danaPribadi = 0;
        riwayatBerhasil.forEach(r => {
            const matchedPundi = visiblePundis.find(p => String(p.id) === String(r.pundiId) || String(p.noUrut) === String(r.noUrut));
            const tipe = (matchedPundi && matchedPundi.tipePundi) || 'Pundi Umum';
            const amt = Number(r.amount || 0);
            if (tipe === 'Pundi Pribadi') danaPribadi += amt;
            else danaUmum += amt;
        });

        const pickedUpBoxIds = new Set();
        riwayatBulanIni.forEach(r => {
            if (r.status === 'Berhasil' || r.status === 'Dijemput') {
                pickedUpBoxIds.add(String(r.pundiId || r.noUrut));
            }
        });

        const pundiBelumDijemputList = visiblePundis.filter(p => p.status === 'Aktif' && !pickedUpBoxIds.has(String(p.id)) && !pickedUpBoxIds.has(String(p.noUrut)));
        const belumDijemputCount = pundiBelumDijemputList.length;

        let targetPeriode = 0;
        if (activePundiCampaign) {
            targetPeriode = dashMonth === 'Semua' ? Number(activePundiCampaign.target || 0) : Math.round(Number(activePundiCampaign.target || 0) / 12);
        }

        return { totalAktif, totalUmum, totalPribadi, penambahanUmum, penambahanPribadi, ditarikBulanIni, berhasil, gagal, sedangDijemput, belumDijemputCount, pundiBelumDijemputList, totalDanaBulanIni, totalDanaKumulatif, danaUmum, danaPribadi, targetPeriode };
    }, [visiblePundis, visibleRiwayatPundis, dashMonth, dashYear, activePundiCampaign]);

    const activePundisSorted = [...visiblePundis].filter(p => p.status === 'Aktif').sort((a, b) => Number(a.noUrut) - Number(b.noUrut));

    const filteredMasterPundis = useMemo(() => {
        const filtered = visiblePundis.filter(p => {
            const creator = p.createdBy || contacts.find(c => c.name === p.donorName)?.createdBy || '';
            const term = searchMaster.toLowerCase().trim();
            const matchSearch = !term ||
                String(p.noUrut || '').toLowerCase().includes(term) ||
                String(p.donorName || '').toLowerCase().includes(term) ||
                String(p.usaha || '').toLowerCase().includes(term) ||
                String(p.alamat || '').toLowerCase().includes(term) ||
                String(p.tipePundi || '').toLowerCase().includes(term) ||
                String(p.phone || '').toLowerCase().includes(term);
            const matchStatus = statusMasterFilter === 'Semua' || p.status === statusMasterFilter;
            const matchCreator = creatorMasterFilter === 'Semua' || creator === creatorMasterFilter;
            const matchTipe = tipeMasterFilter === 'Semua' || (p.tipePundi || 'Pundi Umum') === tipeMasterFilter;
            return matchSearch && matchStatus && matchCreator && matchTipe;
        });

        return filtered.sort((a, b) => {
            const numA = Number(a.noUrut) || 0;
            const numB = Number(b.noUrut) || 0;
            return masterSortOrder === 'asc' ? numA - numB : numB - numA;
        });
    }, [visiblePundis, searchMaster, statusMasterFilter, creatorMasterFilter, tipeMasterFilter, masterSortOrder, contacts]);

    const filteredTugasPundis = useMemo(() => {
        return activePundisSorted.filter(p => {
            const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
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
        return pundis.reduce((max, p) => Math.max(max, Number(p.noUrut) || 0), 0) + 1;
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
                    id: Date.now() + Math.floor(Math.random() * 10000) + p.noUrut,
                    date: todayStr, pundiId: p.id, noUrut: p.noUrut, donorName: p.donorName, usaha: p.usaha,
                    amount: 0, status: 'Dijemput', amilName: user?.name || 'Amil', notes: 'Otomatis dicetak', receiptUrl: ''
                });
                isChanged = true;
            }
        });

        if (isChanged) {
            setRiwayatPundis(newRiwayat);
            if(typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', newRiwayat);
        }
    };

    const handlePrintChecklist = () => {
        const dataToPrint = selectedTaskIds.size > 0 ? activePundisSorted.filter(p => selectedTaskIds.has(p.id)) : filteredTugasPundis;
        if (dataToPrint.length === 0) return;

        markAsDijemput(dataToPrint);

        const printWindow = window.open('', '_blank');
        const tglCetak = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        const totalItem = dataToPrint.length;
        const printPetugasName = selectedAmilFilter !== 'Semua' ? selectedAmilFilter : (user?.name || '-');
        
        const fontSize = totalItem > 25 ? '8px' : totalItem > 15 ? '9px' : '10px';
        const cellPadding = totalItem > 25 ? '2.5px 4px' : totalItem > 15 ? '3.5px 5px' : '5px 6px';
        const rangeKeterangan = selectedTaskIds.size > 0 ? `(${selectedTaskIds.size} Pilihan Ceklis Manual)` : (urutAwal || urutAkhir ? `(Urut ${urutAwal || '1'} - ${urutAkhir || 'Akhir'})` : '');

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
                            <td><b style="color: #0f172a;">${p.usaha || '-'}</b></td>
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
        const dataToPrint = selectedTaskIds.size > 0 ? activePundisSorted.filter(p => selectedTaskIds.has(p.id)) : filteredTugasPundis;
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
            newData.createdBy = user.name;
        }
        const updatedList = isEdit 
            ? pundis.map(p => String(p.id) === String(newData.id) ? newData : p) 
            : [...pundis, newData];
        setPundis(updatedList);
        syncDataToSheet('Pundi', updatedList);
    };

    const deletePundi = (row) => {
        const updatedList = pundis.filter(p => String(p.id) !== String(row.id));
        setPundis(updatedList);
        syncDataToSheet('Pundi', updatedList);
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
            amount: formData.amount || 0,
            status: formData.status,
            amilName: user.name,
            notes: formData.notes || '',
            receiptUrl: formData.receiptUrl || ''
        };
        const updatedRiwayat = [...riwayatPundis, transaction];
        setRiwayatPundis(updatedRiwayat);
        syncDataToSheet('RiwayatPundi', updatedRiwayat);
        setIsInputModalOpen(false);
    };

    const MasterPundiSchema = [
        { name: 'noUrut', label: 'Nomor Urut Penarikan (Angka)', type: 'number', required: true },
        { name: 'tipePundi', label: 'Jenis / Tipe Pundi', type: 'select', options: ['Pundi Umum', 'Pundi Pribadi'], required: true },
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
            const creator = r.createdBy || contacts.find(c => c.name === r.donorName)?.createdBy;
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100"><i className="fa-solid fa-box-open text-wiz-orange mr-2"></i> Manajemen Pundi WIZ</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem kontrol dan pencatatan donatur kotak pundi.</p>
                </div>

                <div className="flex items-center gap-3">
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

            {/* DASHBOARD TAB */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-6 animate-in pb-8">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm"><i className="fa-solid fa-filter text-wiz-green mr-1.5"></i> Filter Periode Analitik</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Target & capaian pundi otomatis sinkron pada bulan yang dipilih.</p>
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
                    
                    <div className="p-6 bg-gradient-to-r from-wiz-green_dark via-wiz-green to-teal-700 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 text-9xl text-white/10 pointer-events-none">
                            <i className="fa-solid fa-bullseye"></i>
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider mb-2">
                                    <i className="fa-solid fa-sack-dollar"></i> Capaian Bulan Ini
                                </div>
                                <h3 className="text-3xl font-black">{typeof formatRp === 'function' ? formatRp(stats.totalDanaBulanIni) : stats.totalDanaBulanIni}</h3>
                                {activePundiCampaign && (
                                    <p className="text-white/80 text-xs mt-1">Terhubung ke Program: <b>{activePundiCampaign.name}</b></p>
                                )}
                            </div>
                            
                            {stats.targetPeriode > 0 && (
                                <div className="bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 flex items-center gap-6">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-white/75">Target Terbagi</p>
                                        <p className="text-lg font-black">{typeof formatRp === 'function' ? formatRp(stats.targetPeriode) : stats.targetPeriode}</p>
                                    </div>
                                    <div className="h-8 w-px bg-white/20"></div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-white/75">Persentase</p>
                                        <p className="text-xl font-black text-amber-300">
                                            {Math.min(Math.round((stats.totalDanaBulanIni / stats.targetPeriode) * 100), 100)}%
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {stats.targetPeriode > 0 && (
                            <div className="w-full bg-black/20 rounded-full h-2 mt-5 relative z-10 overflow-hidden">
                                <div 
                                    className="bg-white h-2 rounded-full transition-all duration-1000 shadow-md" 
                                    style={{ width: `${Math.min(Math.round((stats.totalDanaBulanIni / stats.targetPeriode) * 100), 100)}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-store mr-1"></i> Pundi Umum
                                </span>
                                <i className="fa-solid fa-vault text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <h4 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100">{typeof formatRp === 'function' ? formatRp(stats.danaUmum) : stats.danaUmum}</h4>
                            <p className="text-xs text-gray-400 mt-1">Hasil dari {stats.totalUmum} kotak umum.</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-house-user mr-1"></i> Pundi Pribadi
                                </span>
                                <i className="fa-solid fa-piggy-bank text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <h4 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100">{typeof formatRp === 'function' ? formatRp(stats.danaPribadi) : stats.danaPribadi}</h4>
                            <p className="text-xs text-gray-400 mt-1">Hasil dari {stats.totalPribadi} kotak pribadi.</p>
                        </div>

                        <div 
                            onClick={() => setIsBelumDijemputModalOpen(true)}
                            className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-800 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-amber-400 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-clock mr-1"></i> Belum Jemput
                                </span>
                                <span className="text-xs text-amber-500 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Cek List <i className="fa-solid fa-arrow-right"></i>
                                </span>
                            </div>
                            <h4 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{stats.belumDijemputCount} <span className="text-sm font-semibold opacity-70">Kotak</span></h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Masih menunggu ditarik.</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2 py-0.5 rounded-md">
                                    <i className="fa-solid fa-truck mr-1"></i> Lapangan
                                </span>
                                <i className="fa-solid fa-circle-check text-gray-200 dark:text-gray-700 text-2xl"></i>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Dijemput</p>
                                    <p className="text-lg font-black text-yellow-600 dark:text-yellow-500 mt-0.5">{stats.sedangDijemput}</p>
                                </div>
                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Selesai</p>
                                    <p className="text-lg font-black text-wiz-green dark:text-emerald-400 mt-0.5">{stats.berhasil}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MASTER PUNDI TAB */}
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
                                    placeholder="Cari No. Urut, nama donatur, tipe pundi, usaha, alamat, no. HP..."
                                    className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-wiz-green focus:border-wiz-green outline-none text-gray-800 dark:text-gray-100 transition-all"
                                />
                                {searchMaster && (
                                    <button onClick={() => setSearchMaster('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <i className="fa-solid fa-circle-xmark text-sm"></i>
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <button 
                                    onClick={() => setMasterSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                    title="Ubah Urutan Nomor"
                                >
                                    <i className={`fa-solid ${masterSortOrder === 'asc' ? 'fa-arrow-down-1-9' : 'fa-arrow-up-9-1'} text-xs text-wiz-green dark:text-emerald-400`}></i>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Urutkan</span>
                                </button>

                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-tags text-xs text-gray-400"></i>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tipe:</span>
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

                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-filter text-xs text-gray-400"></i>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status:</span>
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

                                {isAdmin && uniqueAmils.length > 0 && (
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <i className="fa-solid fa-user text-xs text-gray-400"></i>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Amil:</span>
                                        <select
                                            value={creatorMasterFilter}
                                            onChange={(e) => setCreatorMasterFilter(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer max-w-[130px] truncate"
                                        >
                                            <option value="Semua" className="dark:bg-gray-800">Semua Amil</option>
                                            {uniqueAmils.map((amil, idx) => (
                                                <option key={idx} value={amil} className="dark:bg-gray-800">{amil}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(searchMaster || statusMasterFilter !== 'Semua' || creatorMasterFilter !== 'Semua' || tipeMasterFilter !== 'Semua' || masterSortOrder !== 'asc') && (
                                    <button
                                        onClick={() => { setSearchMaster(''); setStatusMasterFilter('Semua'); setCreatorMasterFilter('Semua'); setTipeMasterFilter('Semua'); setMasterSortOrder('asc'); }}
                                        className="px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-semibold transition-colors flex items-center gap-1"
                                        title="Reset Semua Filter"
                                    >
                                        <i className="fa-solid fa-rotate-left"></i> Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700/50">
                            <span>Menampilkan <b>{filteredMasterPundis.length}</b> dari <b>{visiblePundis.length}</b> kotak pundi terdaftar</span>
                            {filteredMasterPundis.length === 0 && <span className="text-amber-500 font-medium">Tidak ada data yang cocok dengan kriteria filter</span>}
                        </div>
                    </div>

                    <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto custom-scrollbar rounded-xl border border-gray-100 dark:border-gray-700 pb-8 relative z-0">
                        <ModuleView 
                            title="Data Kotak Pundi" 
                            data={filteredMasterPundis} 
                            columns={MasterPundiColumns} 
                            schema={MasterPundiSchema} 
                            defaultValues={{ noUrut: nextNoUrut, status: 'Aktif', tipePundi: 'Pundi Umum' }}
                            onSave={savePundi} 
                            onDelete={isAdmin ? deletePundi : null} 
                            canDelete={isAdmin}
                        />
                    </div>
                </div>
            )}

            {/* TUGAS PENARIKAN TAB */}
            {activeSubTab === 'tugas' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 animate-in space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Antrean Penarikan Bulan Ini</h3>
                            <p className="text-sm text-gray-500">
                                {selectedTaskIds.size > 0 ? (
                                    <span className="font-bold text-wiz-green dark:text-emerald-400 bg-wiz-green/10 px-2 py-0.5 rounded">{selectedTaskIds.size} Pundi Dipilih</span>
                                ) : (
                                    <span>Tersedia {filteredTugasPundis.length} pundi siap cetak.</span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={toggleSelectAllFiltered} 
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
                            >
                                <i className={`fa-solid ${selectedTaskIds.size > 0 && selectedTaskIds.size >= filteredTugasPundis.length ? 'fa-square-check text-wiz-green' : 'fa-square'}`}></i>
                                <span>{selectedTaskIds.size > 0 && selectedTaskIds.size >= filteredTugasPundis.length ? 'Batal Pilih' : 'Pilih Semua'}</span>
                            </button>
                            <Button onClick={() => setIsQuickScanOpen(true)} icon="fa-solid fa-qrcode" variant="accent" className="text-sm shadow-md">Pindai</Button>
                            <Button onClick={handlePrintChecklist} icon="fa-solid fa-clipboard-check" variant="secondary" className="text-sm" disabled={filteredTugasPundis.length === 0 && selectedTaskIds.size === 0}>
                                Cetak Checklist ({selectedTaskIds.size > 0 ? selectedTaskIds.size : filteredTugasPundis.length})
                            </Button>
                            <Button onClick={handlePrintNotaA4} icon="fa-solid fa-receipt" variant="primary" className="text-sm" disabled={filteredTugasPundis.length === 0 && selectedTaskIds.size === 0}>
                                Cetak Nota ({selectedTaskIds.size > 0 ? selectedTaskIds.size : filteredTugasPundis.length})
                            </Button>
                        </div>
                    </div>

                    <div className="bg-gray-50/70 dark:bg-gray-700/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="w-full md:w-72 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <i className="fa-solid fa-magnifying-glass text-xs"></i>
                            </div>
                            <input
                                type="text"
                                value={searchTugas}
                                onChange={(e) => setSearchTugas(e.target.value)}
                                placeholder="Cari No. Urut, lokasi, donatur..."
                                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100"
                            />
                            {searchTugas && (
                                <button onClick={() => setSearchTugas('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600">
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between sm:justify-end">
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

                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                <i className="fa-solid fa-arrow-down-1-9 text-xs text-wiz-green"></i>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Urut:</span>
                                <input 
                                    type="number"
                                    value={urutAwal}
                                    onChange={(e) => setUrutAwal(e.target.value)}
                                    placeholder="Awal"
                                    className="w-12 px-1 py-0.5 text-xs text-center font-bold bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded focus:ring-1 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100"
                                />
                                <span className="text-xs text-gray-400 font-bold">s/d</span>
                                <input 
                                    type="number"
                                    value={urutAkhir}
                                    onChange={(e) => setUrutAkhir(e.target.value)}
                                    placeholder="Akhir"
                                    className="w-12 px-1 py-0.5 text-xs text-center font-bold bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded focus:ring-1 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100"
                                />
                                {(urutAwal !== '' || urutAkhir !== '') && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setUrutAwal(''); setUrutAkhir(''); }}
                                        className="text-gray-400 hover:text-red-500 text-xs px-1"
                                        title="Reset rentang nomor urut"
                                    >
                                        <i className="fa-solid fa-circle-xmark"></i>
                                    </button>
                                )}
                            </div>

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
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${statusTugasFilter === item.id ? 'bg-wiz-green text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {(searchTugas || statusTugasFilter !== 'Semua' || tipeTugasFilter !== 'Semua' || urutAwal !== '' || urutAkhir !== '') && (
                                <button
                                    onClick={() => { setSearchTugas(''); setStatusTugasFilter('Semua'); setTipeTugasFilter('Semua'); setUrutAwal(''); setUrutAkhir(''); }}
                                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-semibold transition-colors flex items-center gap-1"
                                    title="Reset Semua Filter Tugas"
                                >
                                    <i className="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* TAMPILAN LIST TUGAS KHUSUS HP */}
                    <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto pr-1 sm:pr-2 space-y-3 pb-8 custom-scrollbar relative z-0">
                        <div className="block md:hidden space-y-3">
                            {filteredTugasPundis.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-xs">
                                    Tidak ada tugas pundi yang cocok dengan filter.
                                </div>
                            ) : filteredTugasPundis.map(p => {
                                const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
                                const tStatus = currentRecord ? currentRecord.status : 'Belum';
                                const isChecked = selectedTaskIds.has(p.id);
                                
                                const rawPhone = String(p.phone || '').replace(/[^0-9]/g, '');
                                let cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : (rawPhone.startsWith('8') ? '62' + rawPhone : rawPhone);

                                return (
                                    <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isChecked ? 'bg-wiz-green/5 dark:bg-emerald-950/30 border-wiz-green ring-1 ring-wiz-green' : tStatus === 'Berhasil' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' : tStatus === 'Dijemput' ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                                        <div className="flex items-start justify-between gap-3 mb-2.5">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelectTask(p.id)}
                                                    className="w-5 h-5 mt-0.5 text-wiz-green rounded-lg focus:ring-wiz-green cursor-pointer accent-wiz-green"
                                                />
                                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${tStatus === 'Berhasil' ? 'bg-wiz-green text-white shadow-sm' : tStatus === 'Dijemput' ? 'bg-yellow-500 text-white shadow-sm' : 'bg-wiz-orange/15 text-wiz-orange dark:bg-amber-900/30'}`}>
                                                    #{p.noUrut}
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">{p.usaha}</h4>
                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${p.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                            {p.tipePundi === 'Pundi Pribadi' ? 'Pribadi' : 'Umum'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.donorName} • {p.alamat}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {tStatus === 'Berhasil' ? (
                                                    <span className="px-2 py-0.5 bg-wiz-green/10 text-wiz-green text-[10px] font-bold rounded-lg border border-wiz-green/20">Selesai</span>
                                                ) : tStatus === 'Dijemput' ? (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-lg border border-yellow-200">Dijemput</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-600">Belum</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-gray-100 dark:border-gray-700/60">
                                            <button 
                                                onClick={() => { setSelectedPundi({...p, isViewOnly: true}); setIsInputModalOpen(true); }}
                                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-eye text-wiz-orange"></i> Lihat Data
                                            </button>
                                            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                                                {tStatus === 'Berhasil' ? (
                                                    <button 
                                                        onClick={() => handleOpenEditRiwayat(currentRecord)} 
                                                        className="px-3.5 py-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <i className="fa-solid fa-pen-to-square"></i> Edit Hasil
                                                    </button>
                                                ) : tStatus === 'Dijemput' ? (
                                                    <button 
                                                        onClick={() => handleOpenEditRiwayat(currentRecord)} 
                                                        className="px-3.5 py-1.5 text-white bg-wiz-green hover:bg-wiz-green_dark rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                                                    >
                                                        <i className="fa-solid fa-calculator"></i> Hitung Uang
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setIsQuickScanOpen(true)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 hidden sm:flex">
                                                            <i className="fa-solid fa-qrcode"></i> Pindai
                                                        </button>
                                                        <Button onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} variant="accent" className="text-[11px] py-1.5 px-3">
                                                            <i className="fa-solid fa-hand-holding-box mr-1"></i> Jemput Manual
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* TAMPILAN TABEL STANDARD (DESKTOP/LAPTOP) */}
                        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-left text-sm whitespace-nowrap bg-white dark:bg-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-center" style={{ width: '40px' }}>
                                            <input 
                                                type="checkbox"
                                                checked={filteredTugasPundis.length > 0 && filteredTugasPundis.every(p => selectedTaskIds.has(p.id))}
                                                onChange={toggleSelectAllFiltered}
                                                className="w-4 h-4 text-wiz-green rounded cursor-pointer accent-wiz-green"
                                                title="Pilih / Batal Pilih Semua Hasil Filter"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-center">Urut</th>
                                        <th className="px-4 py-3">Lokasi / Usaha</th>
                                        <th className="px-4 py-3 text-center">Aksi Laporan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {filteredTugasPundis.length === 0 ? (
                                        <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Tidak ada data pundi yang cocok dengan filter tugas.</td></tr>
                                    ) : filteredTugasPundis.map(p => {
                                        const currentRecord = visibleRiwayatPundis.find(r => String(r.pundiId) === String(p.id) && new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear);
                                        const tStatus = currentRecord ? currentRecord.status : 'Belum';
                                        const isChecked = selectedTaskIds.has(p.id);
                                        
                                        return (
                                            <tr key={p.id} className={`hover:bg-wiz-light dark:hover:bg-gray-700/50 ${isChecked ? 'bg-wiz-green/10 dark:bg-emerald-950/30' : tStatus === 'Berhasil' ? 'bg-wiz-green/5 dark:bg-emerald-900/10' : tStatus === 'Dijemput' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleSelectTask(p.id)}
                                                        className="w-4 h-4 text-wiz-green rounded cursor-pointer accent-wiz-green"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center font-black text-gray-400">{p.noUrut}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800 dark:text-gray-100">{p.usaha}</p>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.tipePundi === 'Pundi Pribadi' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                            {p.tipePundi || 'Pundi Umum'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                        <span>{p.donorName} • {p.alamat}</span>
                                                        {p.mapUrl && (() => {
                                                            const mapUrls = typeof parseMapUrls === 'function' ? parseMapUrls(p.mapUrl) : { navUrl: p.mapUrl, webUrl: p.mapUrl };
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 ml-1">
                                                                    <a
                                                                        href={mapUrls.navUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-wiz-green hover:text-wiz-green_dark dark:text-emerald-400 font-bold inline-flex items-center gap-1 text-xs"
                                                                        title="Buka di HP"
                                                                    >
                                                                        <i className="fa-solid fa-mobile-screen"></i> HP
                                                                    </a>
                                                                    <span className="text-gray-300">|</span>
                                                                    <a
                                                                        href={mapUrls.webUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 font-bold inline-flex items-center gap-1 text-xs"
                                                                        title="Buka di Web Maps"
                                                                    >
                                                                        <i className="fa-solid fa-globe"></i> Web
                                                                    </a>
                                                                </span>
                                                            );
                                                        })()}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {tStatus === 'Berhasil' ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => { setSelectedPundi({...p, isViewOnly: true}); setIsInputModalOpen(true); }}
                                                                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                                title="Lihat Data"
                                                            >
                                                                <i className="fa-solid fa-eye text-wiz-orange"></i>
                                                            </button>
                                                            <span className="text-xs font-bold text-wiz-green bg-wiz-green/10 px-3 py-1.5 rounded-lg"><i className="fa-solid fa-check mr-1"></i> Selesai</span>
                                                            <button 
                                                                onClick={() => handleOpenEditRiwayat(currentRecord)} 
                                                                className="px-2.5 py-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 dark:border-blue-800 transition-colors" 
                                                                title="Edit Hasil Penarikan"
                                                            >
                                                                <i className="fa-solid fa-pen-to-square"></i> Edit
                                                            </button>
                                                        </div>
                                                    ) : tStatus === 'Dijemput' ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => { setSelectedPundi({...p, isViewOnly: true}); setIsInputModalOpen(true); }}
                                                                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                                title="Lihat Data"
                                                            >
                                                                <i className="fa-solid fa-eye text-wiz-orange"></i>
                                                            </button>
                                                            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-3 py-1.5 rounded-lg"><i className="fa-solid fa-box-open mr-1"></i> Dijemput</span>
                                                            <button 
                                                                onClick={() => handleOpenEditRiwayat(currentRecord)} 
                                                                className="px-2.5 py-1.5 text-white bg-wiz-green hover:bg-wiz-green_dark rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm" 
                                                                title="Hitung uang sekarang"
                                                            >
                                                                <i className="fa-solid fa-calculator"></i> Hitung Uang
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => { setSelectedPundi({...p, isViewOnly: true}); setIsInputModalOpen(true); }}
                                                                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                                title="Lihat Data"
                                                            >
                                                                <i className="fa-solid fa-eye text-wiz-orange"></i> Data
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsQuickScanOpen(true)} 
                                                                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                                                            >
                                                                <i className="fa-solid fa-qrcode"></i> Pindai
                                                            </button>
                                                            <Button 
                                                                onClick={() => { setSelectedPundi(p); setIsInputModalOpen(true); }} 
                                                                variant="accent" 
                                                                className="text-[11px] py-1.5 px-3"
                                                            >
                                                                <i className="fa-solid fa-hand-holding-box mr-1"></i> Jemput Manual
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MODAL INPUT & EDIT RIWAYAT */}
                    <Modal isOpen={isInputModalOpen || isEditRiwayatOpen} onClose={() => { setIsInputModalOpen(false); setIsEditRiwayatOpen(false); setSelectedPundi(null); setEditingRiwayat(null); }} title={selectedPundi && selectedPundi.isViewOnly ? `Detail Pundi: ${selectedPundi.usaha}` : editingRiwayat ? `Edit Laporan: ${editingRiwayat.usaha}` : 'Laporan Penarikan'}>
                        {selectedPundi && selectedPundi.isViewOnly ? (() => {
                            const rawPhone = String(selectedPundi.phone || '').replace(/[^0-9]/g, '');
                            const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : (rawPhone.startsWith('8') ? '62' + rawPhone : rawPhone);
                            const mapUrls = typeof parseMapUrls === 'function' ? parseMapUrls(selectedPundi.mapUrl) : { navUrl: selectedPundi.mapUrl, webUrl: selectedPundi.mapUrl };
                            const history = visibleRiwayatPundis.filter(r => String(r.pundiId) === String(selectedPundi.id)).sort((a,b) => new Date(b.date) - new Date(a.date));
                            
                            return (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                                            <span className="text-xs font-bold text-gray-500">NO. REGISTRASI</span>
                                            <span className="text-lg font-black text-wiz-green">#{selectedPundi.noUrut}</span>
                                        </div>
                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500">Tipe Pundi:</span><span className="font-bold">{selectedPundi.tipePundi || 'Pundi Umum'}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Nama Usaha:</span><span className="font-bold">{selectedPundi.usaha}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500">Nama Donatur:</span><span className="font-bold">{selectedPundi.donorName}</span></div>
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                <span className="text-xs text-gray-500 block mb-1">Alamat:</span>
                                                <p className="font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded-lg">{selectedPundi.alamat}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cleanPhone ? (
                                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"><i className="fa-brands fa-whatsapp text-sm"></i> Chat WA</a>
                                        ) : <div className="py-2.5 px-3 bg-gray-100 text-gray-400 rounded-xl text-center text-xs">No WA (-)</div>}
                                        {selectedPundi.mapUrl ? (
                                            <a href={mapUrls.navUrl} target="_blank" rel="noreferrer" className="py-2.5 px-3 bg-wiz-green hover:bg-wiz-green_dark text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"><i className="fa-solid fa-location-arrow text-sm"></i> Rute Maps</a>
                                        ) : <div className="py-2.5 px-3 bg-gray-100 text-gray-400 rounded-xl text-center text-xs">Map (-)</div>}
                                    </div>
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <h5 className="text-xs font-bold text-gray-500 mb-2">Riwayat Penarikan Kotak Ini:</h5>
                                        <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                            {history.length === 0 ? <p className="text-xs text-gray-400 italic">Belum ada riwayat.</p> : history.map(r => (
                                                <div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <div>
                                                        <p className="font-bold text-wiz-green text-sm">{typeof formatRp === 'function' ? formatRp(r.amount) : r.amount}</p>
                                                        <p className="text-[10px] text-gray-500">{typeof formatDate === 'function' ? formatDate(r.date) : r.date}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <Button variant="secondary" onClick={() => { setIsInputModalOpen(false); setSelectedPundi(null); }}>Tutup</Button>
                                    </div>
                                </div>
                            );
                        })() : (selectedPundi || editingRiwayat) && (
                            <DynamicForm 
                                schema={[
                                    { name: 'date', label: 'Tanggal Penarikan', type: 'date', required: true },
                                    { name: 'status', label: 'Status Penjemputan', type: 'select', options: [{value: 'Dijemput', label: 'Kotak Dijemput (Hitung Nanti)'}, {value: 'Berhasil', label: 'Langsung Dihitung (Selesai)'}, {value: 'Gagal', label: 'Gagal / Pundi Kosong'}], required: true },
                                    { name: 'amount', label: 'Nominal Uang (Rp) - Jika Dihitung', isCurrency: true },
                                    { name: 'receiptUrl', label: 'Foto Bukti Nota / Penarikan (Opsional)', type: 'file', fullWidth: true },
                                    { name: 'notes', label: 'Keterangan (Opsional)', type: 'textarea' }
                                ]}
                                defaultValues={editingRiwayat ? null : { date: new Date().toISOString().split('T')[0], status: 'Dijemput' }}
                                initialData={editingRiwayat}
                                onSubmit={(formData) => { if(editingRiwayat) saveEditRiwayat(formData); else submitInputHasil(formData); }}
                                onCancel={() => { setIsInputModalOpen(false); setIsEditRiwayatOpen(false); setSelectedPundi(null); setEditingRiwayat(null); }}
                            />
                        )}
                    </Modal>

                    {/* MODAL BELUM DIJEMPUT */}
                    <Modal isOpen={isBelumDijemputModalOpen} onClose={() => setIsBelumDijemputModalOpen(false)} title={`Pundi Belum Dijemput (${stats.belumDijemputCount})`}>
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500">Daftar pundi aktif yang belum ditarik / dicetak pada periode filter.</p>
                            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {stats.belumDijemputCount === 0 ? (
                                    <div className="p-6 text-center text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-xs">
                                        <i className="fa-solid fa-circle-check text-wiz-green text-2xl mb-1"></i>
                                        <p>Semua pundi aktif pada periode ini sudah diproses.</p>
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
                                                onClick={() => { setSelectedPundi({...p, isViewOnly: true}); setIsInputModalOpen(true); }}
                                                className="px-2.5 py-1.5 bg-wiz-green/10 hover:bg-wiz-green text-wiz-green hover:text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                                            >
                                                Detail
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Modal>

                    <Modal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} title="Pindai QR Pundi (Penjemputan)">
                        <div className="flex flex-col items-center justify-center pt-2 pb-4 px-2">
                            <p className="text-xs text-gray-500 text-center mb-4">Arahkan kamera ke stiker QR untuk menjemput kotak ini.</p>
                            <div className="w-full max-w-sm">
                                {typeof Html5QrcodePlugin !== 'undefined' ? <Html5QrcodePlugin qrCodeSuccessCallback={handleQuickScan} /> : <p className="text-center text-red-500 text-sm">Modul Kamera tidak tersedia.</p>}
                            </div>
                            <div className="w-full mt-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ketik Nomor Urut Manual</p>
                                <input
                                    type="text"
                                    onChange={(e) => handleQuickScan(e.target.value)}
                                    placeholder="Contoh: 5"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-center font-mono text-sm focus:ring-2 focus:ring-wiz-green focus:border-wiz-green outline-none text-gray-800 dark:text-gray-100 shadow-inner font-bold"
                                />
                            </div>
                        </div>
                    </Modal>
                </div>
            )}

            {/* RIWAYAT PUNDI TAB */}
            {activeSubTab === 'riwayat' && (
                <div className="animate-in space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                                <input
                                    type="text"
                                    value={searchRiwayat}
                                    onChange={(e) => setSearchRiwayat(e.target.value)}
                                    placeholder="Cari nama donatur, usaha, nomor pundi, catatan..."
                                    className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-wiz-green focus:border-wiz-green outline-none text-gray-800 dark:text-gray-100 transition-all"
                                />
                                {searchRiwayat && (
                                    <button onClick={() => setSearchRiwayat('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <i className="fa-solid fa-circle-xmark text-sm"></i>
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-calendar-days text-xs text-gray-400"></i>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Bulan:</span>
                                    <select
                                        value={monthRiwayatFilter}
                                        onChange={(e) => setMonthRiwayatFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Bulan</option>
                                        {uniqueMonths.map(([key, label]) => (
                                            <option key={key} value={key} className="dark:bg-gray-800">{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <i className="fa-solid fa-circle-check text-xs text-gray-400"></i>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status:</span>
                                    <select
                                        value={statusRiwayatFilter}
                                        onChange={(e) => setStatusRiwayatFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                    >
                                        <option value="Semua" className="dark:bg-gray-800">Semua Status</option>
                                        <option value="Berhasil" className="dark:bg-gray-800">Berhasil (Dihitung)</option>
                                        <option value="Dijemput" className="dark:bg-gray-800">Dijemput (Belum Dihitung)</option>
                                        <option value="Gagal" className="dark:bg-gray-800">Gagal</option>
                                    </select>
                                </div>

                                {isAdmin && uniqueAmils.length > 0 && (
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/70 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <i className="fa-solid fa-user-check text-xs text-gray-400"></i>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Petugas:</span>
                                        <select
                                            value={amilRiwayatFilter}
                                            onChange={(e) => setAmilRiwayatFilter(e.target.value)}
                                            className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer max-w-[130px] truncate"
                                        >
                                            <option value="Semua" className="dark:bg-gray-800">Semua Amil</option>
                                            {uniqueAmils.map((amil, idx) => (
                                                <option key={idx} value={amil} className="dark:bg-gray-800">{amil}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(searchRiwayat || statusRiwayatFilter !== 'Semua' || monthRiwayatFilter !== 'Semua' || amilRiwayatFilter !== 'Semua') && (
                                    <button
                                        onClick={() => { setSearchRiwayat(''); setStatusRiwayatFilter('Semua'); setMonthRiwayatFilter('Semua'); setAmilRiwayatFilter('Semua'); }}
                                        className="px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-semibold transition-colors flex items-center gap-1"
                                        title="Reset Semua Filter"
                                    >
                                        <i className="fa-solid fa-rotate-left"></i> Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700/50">
                            <span>
                                Menampilkan <b>{filteredRiwayatPundis.length}</b> transaksi | Total Tersaring: <b className="text-wiz-green dark:text-emerald-400">{typeof formatRp === 'function' ? formatRp(filteredRiwayatPundis.filter(r => r.status === 'Berhasil').reduce((sum, r) => sum + Number(r.amount || 0), 0)) : filteredRiwayatPundis.filter(r => r.status === 'Berhasil').reduce((sum, r) => sum + Number(r.amount || 0), 0)}</b>
                            </span>
                            {filteredRiwayatPundis.length === 0 && <span className="text-amber-500 font-medium">Tidak ada transaksi yang cocok dengan filter</span>}
                        </div>
                    </div>

                    <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto custom-scrollbar rounded-xl border border-gray-100 dark:border-gray-700 pb-8 relative z-0">
                        <table className="w-full text-left text-sm whitespace-nowrap bg-white dark:bg-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Donatur & Usaha</th>
                                    <th className="px-4 py-3">Nominal</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3">Amil</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {[...filteredRiwayatPundis]
                                    .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))
                                    .map(r => (
                                        <tr key={r.id} className="hover:bg-wiz-light dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-gray-500">{typeof formatDate === 'function' ? formatDate(r.date) : r.date}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-gray-800 dark:text-gray-100">{r.donorName}</p>
                                                <p className="text-[11px] text-gray-400">{r.usaha} (No. {r.noUrut})</p>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-wiz-green dark:text-emerald-400">{typeof formatRp === 'function' ? formatRp(r.amount) : r.amount}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'Berhasil' ? 'bg-wiz-green/10 text-wiz-green dark:text-emerald-400' : r.status === 'Dijemput' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-50 text-red-500'}`}>{r.status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.amilName}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {r.receiptUrl && String(r.receiptUrl).trim() !== '' && (
                                                        <button 
                                                            onClick={() => setViewImage ? setViewImage({ direct: typeof getDirectImageUrl === 'function' ? getDirectImageUrl(r.receiptUrl) : r.receiptUrl, original: r.receiptUrl }) : window.open(r.receiptUrl, '_blank')}
                                                            className="p-1.5 text-gray-400 hover:text-wiz-orange hover:bg-wiz-orange/10 rounded-lg text-xs transition-colors"
                                                            title="Lihat Bukti Foto"
                                                        >
                                                            <i className="fa-solid fa-image"></i>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleOpenEditRiwayat(r)}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg text-xs transition-colors"
                                                        title="Edit Laporan"
                                                    >
                                                        <i className="fa-solid fa-pen-to-square"></i>
                                                    </button>
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={() => deleteRiwayat(r)}
                                                            className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-xs transition-colors"
                                                            title="Hapus Riwayat"
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
            )}

            {/* MODAL CETAK STIKER QR PUNDI */}
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
                            <p className="text-[10px] text-gray-400 mt-1">{printQR.donorName} {printQR.tipePundi ? `(${printQR.tipePundi})` : ''}</p>
                        </div>
                        
                        <div className="flex gap-3 w-full mt-2">
                            <Button variant="secondary" className="flex-1 py-3" onClick={() => setPrintQR(null)}>Tutup</Button>
                            <Button variant="primary" className="flex-1 py-3" icon="fa-solid fa-print" onClick={() => {
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(`
                                    <html><head><title>Stiker QR Pundi - No ${printQR.noUrut}</title>
                                    <script src="https://cdn.tailwindcss.com"><\/script>
                                    </head><body class="flex items-center justify-center p-10 bg-white">
                                    ${document.getElementById('print-qr-area').outerHTML}
                                    <script>setTimeout(() => { window.print(); }, 1000);<\/script>
                                    </body></html>
                                `);
                                printWindow.document.close();
                            }}>Cetak Stiker</Button>
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
