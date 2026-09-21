// Komponen Pindai QR Pundi (Standalone Scanner)

const { useState, useEffect, useRef } = React;

const ScannerView = ({ pundis = [], riwayatPundis = [], setRiwayatPundis, user, syncDataToSheet, setActiveTab }) => {
    const [scanInput, setScanInput] = useState('');
    const [selectedPundi, setSelectedPundi] = useState(null);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    const handleScan = (val) => {
        const cleanVal = String(val || '').trim();
        if (!cleanVal) return;

        let found = null;
        // 1. Deteksi format stiker QR (WIZ-PUNDI-[id/noUrut])
        if (cleanVal.includes('WIZ-PUNDI-')) {
            const extractedId = cleanVal.split('WIZ-PUNDI-')[1].trim();
            found = (pundis || []).find(p => String(p.id) === String(extractedId) || String(p.noUrut) === String(extractedId));
        } else if (!isNaN(cleanVal) && cleanVal.length > 0) {
            // 2. Deteksi input manual nomor urut atau ID angka
            found = (pundis || []).find(p => String(p.noUrut) === cleanVal || String(p.id) === cleanVal);
        } else {
            found = (pundis || []).find(p => String(p.id) === cleanVal || String(p.noUrut) === cleanVal);
        }

        if (found) {
            setScanInput('');
            setSelectedPundi(found);
            setTimeout(() => setIsInputModalOpen(true), 300);
        } else if (cleanVal.length >= 3) {
            setScanInput('❌ Pundi Tidak Ditemukan!');
            setTimeout(() => setScanInput(''), 2000);
        }
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
        if (typeof setRiwayatPundis === 'function') setRiwayatPundis(updatedRiwayat);
        if (typeof syncDataToSheet === 'function') syncDataToSheet('RiwayatPundi', updatedRiwayat);
        setIsInputModalOpen(false);
        setSelectedPundi(null);
    };

    return (
        <div className="space-y-6 slide-up h-full flex flex-col justify-center items-center py-4 sm:py-8">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-wiz-green to-wiz-orange"></div>
                
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-1 mt-2">
                    <i className="fa-solid fa-qrcode text-wiz-green mr-2"></i>Pindai QR Pundi
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 px-4">
                    Arahkan kamera langsung ke stiker QR pundi atau ketik nomor urutnya di bawah.
                </p>

                {/* Wadah Kamera Langsung Aktif */}
                <div className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden shadow-inner border-4 border-gray-100 dark:border-gray-700 relative bg-black mb-5 flex items-center justify-center">
                    {!isInputModalOpen ? (
                        <Html5QrcodePlugin qrCodeSuccessCallback={handleScan} />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-wiz-green bg-gray-900 p-4">
                            <i className="fa-solid fa-circle-check text-5xl mb-2 animate-bounce"></i>
                            <span className="font-bold text-sm">Pundi Ditemukan!</span>
                        </div>
                    )}
                </div>

                {/* Input Alternatif Ketik No Urut */}
                <div className="w-full">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left">
                        Atau Ketik Nomor Urut / ID Pundi:
                    </p>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i className="fa-solid fa-keyboard text-gray-400"></i>
                        </div>
                        <input
                            type="text"
                            value={scanInput}
                            onChange={(e) => {
                                setScanInput(e.target.value);
                                handleScan(e.target.value);
                            }}
                            placeholder="Contoh: 12 atau WIZ-PUNDI-..."
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-center font-mono text-sm focus:ring-2 focus:ring-wiz-green outline-none text-gray-800 dark:text-gray-100 font-bold transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Modal Input Laporan Penarikan */}
            <Modal isOpen={isInputModalOpen} onClose={() => { setIsInputModalOpen(false); setSelectedPundi(null); }} title={selectedPundi ? `Laporan Penarikan: ${selectedPundi.usaha}` : 'Laporan Penarikan'}>
                {selectedPundi && (
                    <DynamicForm 
                        schema={[
                            { name: 'date', label: 'Tanggal Penarikan', type: 'date', required: true },
                            { name: 'status', label: 'Status Penjemputan', type: 'select', options: [{value: 'Dijemput', label: 'Kotak Dijemput (Hitung Nanti)'}, {value: 'Berhasil', label: 'Langsung Dihitung (Selesai)'}, {value: 'Gagal', label: 'Gagal / Pundi Kosong'}], required: true },
                            { name: 'amount', label: 'Nominal Uang (Rp) - Jika Dihitung', isCurrency: true },
                            { name: 'receiptUrl', label: 'Foto Bukti / Nota (Opsional)', type: 'file', fullWidth: true },
                            { name: 'notes', label: 'Catatan Keterangan', type: 'textarea' }
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
        </div>
    );
};

if (typeof window !== 'undefined') {
    window.ScannerView = ScannerView;
}
