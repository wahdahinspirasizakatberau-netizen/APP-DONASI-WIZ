// File: components/Common.js
// Berisi seluruh komponen dasar UI: Button, Modal, Table, DynamicForm, ModuleView, StatusBadge, dan Html5QrcodePlugin

const { useState, useEffect, useRef, useMemo } = React;

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon, disabled = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
    const variants = {
        primary: "bg-wiz-green hover:bg-wiz-green_dark text-white focus:ring-wiz-green shadow-wiz-green/20",
        accent: "bg-wiz-orange hover:bg-wiz-orange_dark text-white focus:ring-wiz-orange shadow-wiz-orange/20",
        secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200",
        danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-400"
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}>
            {icon && <i className={icon}></i>}
            {children}
        </button>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm animate-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col slide-up overflow-hidden border border-gray-100 dark:border-gray-700">
                {title && (
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur z-10">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{title}</h3>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                )}
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ text }) => {
    const clean = String(text || '').trim();
    let style = "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

    if (clean === 'Aktif' || clean === 'Berhasil' || clean === 'Selesai') {
        style = "bg-wiz-green/10 text-wiz-green dark:bg-emerald-950/40 dark:text-emerald-300 border border-wiz-green/20";
    } else if (clean === 'Dijemput' || clean === 'Dalam Proses' || clean === 'Menunggu Validasi') {
        style = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200";
    } else if (clean === 'Gagal' || clean === 'Ditarik' || clean === 'Nonaktif' || clean === 'Belum Selesai') {
        style = "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 border border-red-200";
    } else if (clean === 'Belum') {
        style = "bg-wiz-orange/10 text-wiz-orange dark:bg-orange-950/40 dark:text-orange-300 border border-wiz-orange/20";
    }

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${style}`}>
            {clean}
        </span>
    );
};

const DynamicForm = ({ schema = [], initialData = null, defaultValues = {}, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(() => {
        const initial = { ...defaultValues, ...(initialData || {}) };
        return initial;
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (name, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            handleChange(name, reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (typeof onSubmit === 'function') {
            onSubmit(formData, !!initialData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {schema.map(field => {
                    const isFull = field.fullWidth || field.type === 'textarea' || field.type === 'file';
                    const val = formData[field.name] ?? '';

                    return (
                        <div key={field.name} className={isFull ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'select' ? (
                                <select
                                    value={val}
                                    required={field.required}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                >
                                    <option value="">-- Pilih {field.label} --</option>
                                    {(field.options || []).map(opt => {
                                        const optVal = typeof opt === 'object' ? opt.value : opt;
                                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                                        return <option key={optVal} value={optVal}>{optLabel}</option>;
                                    })}
                                </select>
                            ) : field.type === 'datalist' ? (
                                <div>
                                    <input
                                        type="text"
                                        list={`list-${field.name}`}
                                        value={val}
                                        required={field.required}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        placeholder="Pilih dari daftar atau ketik baru..."
                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                    />
                                    <datalist id={`list-${field.name}`}>
                                        {(field.options || []).map((opt, i) => (
                                            <option key={i} value={opt} />
                                        ))}
                                    </datalist>
                                </div>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    rows={3}
                                    value={val}
                                    required={field.required}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                />
                            ) : field.type === 'file' ? (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(field.name, e.target.files[0])}
                                        className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-wiz-green/10 file:text-wiz-green hover:file:bg-wiz-green/20 cursor-pointer"
                                    />
                                    {val && typeof val === 'string' && (
                                        <img src={val} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                                    )}
                                </div>
                            ) : (
                                <input
                                    type={field.type || (field.isCurrency ? 'text' : 'text')}
                                    value={field.isCurrency ? (val ? Number(String(val).replace(/\D/g, '')).toLocaleString('id-ID') : '') : val}
                                    required={field.required}
                                    onChange={(e) => {
                                        const raw = field.isCurrency ? Number(e.target.value.replace(/\D/g, '')) : e.target.value;
                                        handleChange(field.name, raw);
                                    }}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                {onCancel && (
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Batal
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    Simpan Data
                </Button>
            </div>
        </form>
    );
};

const Table = ({ columns = [], data = [], onEdit, onDelete }) => {
    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-4 py-3.5">
                                {col.label}
                            </th>
                        ))}
                        {(onEdit || onDelete) && (
                            <th className="px-4 py-3.5 text-center">Aksi</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-200 font-medium">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-4 py-8 text-center text-gray-400">
                                Tidak ada data yang tersedia.
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rIdx) => (
                            <tr key={row.id || rIdx} className="hover:bg-wiz-light dark:hover:bg-gray-700/40 transition-colors">
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx} className="px-4 py-3">
                                        {col.render ? col.render(row) : (row[col.key] ?? '-')}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(row)}
                                                    className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                                    title="Edit"
                                                >
                                                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(row)}
                                                    className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                                                    title="Hapus"
                                                >
                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

const ModuleView = ({ title, data = [], columns = [], schema = [], defaultValues = {}, onSave, onDelete, canAdd = true, canEdit = true, canDelete = true }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const handleOpenAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSave = (formData, isEdit) => {
        if (typeof onSave === 'function') {
            onSave(formData, isEdit);
        }
        setIsModalOpen(false);
        setEditingItem(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">{title}</h3>
                    <p className="text-xs text-gray-400">Total: {data.length} data tersimpan</p>
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

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? `Edit ${title}` : `Tambah ${title}`}>
                <DynamicForm
                    schema={schema}
                    initialData={editingItem}
                    defaultValues={defaultValues}
                    onSubmit={handleSave}
                    onCancel={() => { setIsModalOpen(false); setEditingItem(null); }}
                />
            </Modal>
        </div>
    );
};

const Html5QrcodePlugin = ({ qrCodeSuccessCallback, qrCodeErrorCallback }) => {
    const [scannerError, setScannerError] = useState(null);
    const regionIdRef = useRef("qr-region-" + Math.random().toString(36).substring(2, 9));
    const scannerInstanceRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const regionId = regionIdRef.current;

        const initCamera = async () => {
            try {
                if (!window.Html5Qrcode) {
                    if (isMounted) setScannerError("Library pemindai QR belum termuat di halaman.");
                    return;
                }

                const scanner = new window.Html5Qrcode(regionId);
                scannerInstanceRef.current = scanner;

                const qrBoxSize = 220;
                const config = { fps: 10, qrbox: { width: qrBoxSize, height: qrBoxSize } };

                // Prioritas kamera belakang (environment), fallback ke kamera depan
                try {
                    await scanner.start(
                        { facingMode: "environment" },
                        config,
                        (text, result) => {
                            if (qrCodeSuccessCallback) qrCodeSuccessCallback(text, result);
                        },
                        (err) => {
                            if (qrCodeErrorCallback) qrCodeErrorCallback(err);
                        }
                    );
                } catch (envErr) {
                    await scanner.start(
                        { facingMode: "user" },
                        config,
                        (text, result) => {
                            if (qrCodeSuccessCallback) qrCodeSuccessCallback(text, result);
                        },
                        (err) => {
                            if (qrCodeErrorCallback) qrCodeErrorCallback(err);
                        }
                    );
                }
            } catch (err) {
                console.warn("Izin kamera gagal:", err);
                if (isMounted) {
                    setScannerError("Kamera belum diizinkan atau tidak ditemukan.");
                }
            }
        };

        const timer = setTimeout(initCamera, 250);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerInstanceRef.current) {
                try {
                    if (scannerInstanceRef.current.isScanning) {
                        scannerInstanceRef.current.stop().then(() => {
                            try { scannerInstanceRef.current.clear(); } catch(e){}
                        }).catch(() => {});
                    } else {
                        try { scannerInstanceRef.current.clear(); } catch(e){}
                    }
                } catch(e) {}
            }
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative bg-black rounded-2xl overflow-hidden">
            <div id={regionIdRef.current} className="w-full h-full"></div>
            {scannerError && (
                <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center p-4 text-center text-white z-20">
                    <i className="fa-solid fa-camera-slash text-amber-400 text-3xl mb-2"></i>
                    <p className="text-xs font-bold text-red-300 mb-2">{scannerError}</p>
                    <p className="text-[10px] text-gray-400 max-w-xs">
                        Pastikan izin kamera di browser Anda telah diizinkan (Allow) dan website menggunakan HTTPS.
                    </p>
                </div>
            )}
        </div>
    );
};

if (typeof window !== 'undefined') {
    window.Button = Button;
    window.Modal = Modal;
    window.Table = Table;
    window.DynamicForm = DynamicForm;
    window.ModuleView = ModuleView;
    window.StatusBadge = StatusBadge;
    window.Html5QrcodePlugin = Html5QrcodePlugin;
}
