// Komponen UI Dasar CRM WIZ Berau (Button, Modal, Table, DynamicForm, ModuleView, Scanner, StatusBadge)
// Dilengkapi Dukungan Datalist Zona Wilayah & Alat Bantu GPS Google Maps Terintegrasi

const { useState, useEffect, useMemo, useRef } = React;

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon, disabled = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
    const variants = {
        primary: "bg-wiz-green hover:bg-wiz-green_dark text-white focus:ring-wiz-green hover:shadow-md active:scale-95",
        accent: "bg-gradient-to-r from-wiz-orange to-[#fca545] hover:from-wiz-orange_dark hover:to-wiz-orange text-white focus:ring-wiz-orange shadow-md active:scale-95",
        secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95",
    };
    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
            {icon && <i className={icon}></i>}
            {children}
        </button>
    );
};

const StatusBadge = ({ text }) => {
    const safeText = String(text || '').trim();
    let colorStyle = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    
    if (safeText === 'Aktif' || safeText === 'Berhasil' || safeText === 'Selesai') {
        colorStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    } else if (safeText === 'Dijemput' || safeText === 'Dalam Penjemputan') {
        colorStyle = "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    } else if (safeText === 'Ditarik' || safeText === 'Gagal' || safeText === 'Batal') {
        colorStyle = "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800";
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${colorStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${safeText === 'Aktif' || safeText === 'Berhasil' ? 'bg-emerald-500' : safeText.includes('Jemput') ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            {safeText || '-'}
        </span>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm animate-in">
            <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto slide-up border border-white/20 dark:border-gray-700 text-gray-800 dark:text-gray-100 flex flex-col">
                {title && (
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur z-10">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{title}</h2>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-wiz-green rounded-full transition-colors">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                )}
                <div className="p-4 sm:p-6 pb-8 sm:pb-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Table = ({ columns, data = [], onEdit, onDelete }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-4 py-3.5 text-xs uppercase tracking-wider">{col.label}</th>
                            ))}
                            {(onEdit || onDelete) && <th className="px-4 py-3.5 text-xs text-center uppercase tracking-wider">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-200">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-4 py-8 text-center text-gray-400 text-xs">
                                    Tidak ada data untuk ditampilkan.
                                </td>
                            </tr>
                        ) : data.map((row, rIdx) => (
                            <tr key={row.id || rIdx} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors">
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx} className="px-4 py-3 text-xs">
                                        {col.render ? col.render(row) : (row[col.key] !== undefined ? row[col.key] : '-')}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {onEdit && (
                                                <button onClick={() => onEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors" title="Edit">
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={() => onDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors" title="Hapus">
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DynamicForm = ({ schema, initialData = {}, defaultValues = {}, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({ ...defaultValues, ...initialData });
    const [gpsDetecting, setGpsDetecting] = useState(false);
    const [gpsNotice, setGpsNotice] = useState(null);

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    // Fungsi deteksi GPS langsung mengisi kolom peta
    const detectGpsDirectly = (fieldName) => {
        if (!navigator.geolocation) {
            setGpsNotice({ type: 'error', text: 'Browser tidak mendukung GPS.' });
            setTimeout(() => setGpsNotice(null), 4000);
            return;
        }

        setGpsDetecting(true);
        setGpsNotice(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsDetecting(false);
                const lat = pos.coords.latitude.toFixed(6);
                const lng = pos.coords.longitude.toFixed(6);
                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

                handleInputChange(fieldName, mapsUrl);

                // Salin ke papan klip
                try {
                    const el = document.createElement('textarea');
                    el.value = mapsUrl;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                } catch(e) {}

                setGpsNotice({ type: 'success', text: `GPS dideteksi & disalin: ${lat}, ${lng}` });
                setTimeout(() => setGpsNotice(null), 5000);
            },
            (err) => {
                setGpsDetecting(false);
                let text = "Gagal membaca titik GPS.";
                if (err.code === 1) text = "Izin GPS ditolak.";
                else if (err.code === 2) text = "GPS HP belum aktif.";
                setGpsNotice({ type: 'error', text });
                setTimeout(() => setGpsNotice(null), 4000);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {schema.map(field => {
                    const val = formData[field.name] !== undefined ? formData[field.name] : '';

                    if (field.type === 'datalist') {
                        const listId = `list-${field.name}`;
                        return (
                            <div key={field.name} className={field.fullWidth ? 'col-span-full' : ''}>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="text"
                                    list={listId}
                                    value={val}
                                    onChange={(e) => handleInputChange(field.name, e.target.value.toUpperCase())}
                                    placeholder="Pilih atau ketik zona baru..."
                                    required={field.required}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                />
                                <datalist id={listId}>
                                    {(field.options || []).map((opt, idx) => (
                                        <option key={idx} value={opt}>{opt}</option>
                                    ))}
                                </datalist>
                                <p className="text-[10px] text-gray-400 mt-0.5">Bisa memilih dari daftar atau mengetik zona baru.</p>
                            </div>
                        );
                    }

                    if (field.type === 'select') {
                        return (
                            <div key={field.name} className={field.fullWidth ? 'col-span-full' : ''}>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={val}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    required={field.required}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                >
                                    {(field.options || []).map((opt, idx) => {
                                        const optVal = typeof opt === 'object' ? opt.value : opt;
                                        const optLbl = typeof opt === 'object' ? opt.label : opt;
                                        return <option key={idx} value={optVal} className="dark:bg-gray-800">{optLbl}</option>;
                                    })}
                                </select>
                            </div>
                        );
                    }

                    if (field.type === 'map_location') {
                        return (
                            <div key={field.name} className={field.fullWidth ? 'col-span-full' : ''}>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => detectGpsDirectly(field.name)}
                                            disabled={gpsDetecting}
                                            className="px-2 py-0.5 bg-wiz-green hover:bg-wiz-green_dark text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
                                            title="Ambil titik koordinat saat ini"
                                        >
                                            <i className={`fa-solid ${gpsDetecting ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`}></i>
                                            <span>{gpsDetecting ? 'GPS...' : '📍 Isi GPS'}</span>
                                        </button>
                                        <a
                                            href="https://www.google.com/maps"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                            title="Buka Google Maps"
                                        >
                                            <i className="fa-solid fa-map-location-dot text-blue-500"></i>
                                            <span>Maps</span>
                                        </a>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    placeholder="Tempel link Google Maps atau klik Isi GPS..."
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green font-mono"
                                />
                                {gpsNotice && (
                                    <p className={`text-[10px] mt-1 font-semibold ${gpsNotice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                        {gpsNotice.text}
                                    </p>
                                )}
                            </div>
                        );
                    }

                    if (field.type === 'textarea') {
                        return (
                            <div key={field.name} className="col-span-full">
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    rows="2"
                                    value={val}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    placeholder="Tulis catatan..."
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                ></textarea>
                            </div>
                        );
                    }

                    return (
                        <div key={field.name} className={field.fullWidth ? 'col-span-full' : ''}>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type={field.type || 'text'}
                                value={field.isCurrency && val ? Number(val).toLocaleString('id-ID') : val}
                                onChange={(e) => {
                                    const raw = field.isCurrency ? e.target.value.replace(/\D/g, '') : e.target.value;
                                    handleInputChange(field.name, raw);
                                }}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                            />
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                {onCancel && <Button variant="secondary" onClick={onCancel}>Batal</Button>}
                <Button type="submit" variant="primary">Simpan Data</Button>
            </div>
        </form>
    );
};

const ModuleView = ({ title, data, columns, schema, defaultValues = {}, onSave, onDelete, canAdd = true, canEdit = true, canDelete = true, modalTopContent = null }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState(null);

    const handleOpenAdd = () => {
        setEditingData(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingData(item);
        setIsModalOpen(true);
    };

    const handleFormSubmit = (formData) => {
        onSave(formData, !!editingData);
        setIsModalOpen(false);
        setEditingData(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <p className="text-xs text-gray-400">Kelola dan perbarui data master.</p>
                </div>
                {canAdd && (
                    <Button onClick={handleOpenAdd} icon="fa-solid fa-plus" variant="primary" className="text-xs py-2 px-3.5">
                        Tambah Data
                    </Button>
                )}
            </div>

            <Table 
                columns={columns} 
                data={data} 
                onEdit={canEdit ? handleOpenEdit : null} 
                onDelete={canDelete ? onDelete : null} 
            />

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setEditingData(null); }} 
                title={editingData ? `Edit ${title}` : `Tambah ${title}`}
            >
                {/* Panel Bantuan GPS di Bagian Atas Pop-up Modal */}
                {modalTopContent}

                <DynamicForm
                    schema={schema}
                    initialData={editingData || {}}
                    defaultValues={defaultValues}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setIsModalOpen(false); setEditingData(null); }}
                />
            </Modal>
        </div>
    );
};

const Html5QrcodePlugin = ({ qrCodeSuccessCallback }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const scannerId = "html5-qr-reader";
        let html5QrCode = null;

        const startScanner = async () => {
            try {
                if (!window.Html5Qrcode) return;
                html5QrCode = new window.Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    (decodedText) => {
                        if (typeof qrCodeSuccessCallback === 'function') {
                            qrCodeSuccessCallback(decodedText);
                        }
                    },
                    () => {}
                );
            } catch (err) {
                console.warn("Kamera tidak aktif:", err);
            }
        };

        const timer = setTimeout(startScanner, 250);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
                } catch(e) {}
            }
        };
    }, []);

    return (
        <div className="w-full flex flex-col items-center justify-center">
            <div id="html5-qr-reader" className="w-full max-w-[280px] rounded-2xl overflow-hidden shadow-inner bg-black"></div>
        </div>
    );
};

// Export ke scope window
if (typeof window !== 'undefined') {
    window.Button = Button;
    window.Modal = Modal;
    window.Table = Table;
    window.DynamicForm = DynamicForm;
    window.ModuleView = ModuleView;
    window.Html5QrcodePlugin = Html5QrcodePlugin;
    window.StatusBadge = StatusBadge;
}
