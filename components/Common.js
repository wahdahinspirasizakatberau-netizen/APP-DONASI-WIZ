const { useState, useEffect, useRef } = React;

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon, disabled = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
    const variants = {
        primary: "bg-wiz-green hover:bg-wiz-green_dark text-white focus:ring-wiz-green hover:shadow-md",
        accent: "bg-wiz-orange hover:bg-wiz-orange_dark text-white focus:ring-wiz-orange shadow-md",
        secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200",
        danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-md"
    };
    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}>
            {icon && <i className={icon}></i>}
            {children}
        </button>
    );
};

const StatusBadge = ({ text = '' }) => {
    const cleanText = String(text || '').trim();
    let colorStyle = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";

    if (['Aktif', 'Berhasil', 'Selesai'].includes(cleanText)) {
        colorStyle = "bg-wiz-green/10 text-wiz-green dark:bg-emerald-950/40 dark:text-emerald-400 border border-wiz-green/20";
    } else if (['Dijemput', 'Menunggu Validasi', 'Dalam Proses'].includes(cleanText)) {
        colorStyle = "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
    } else if (['Ditarik', 'Gagal', 'Dibatalkan', 'Nonaktif'].includes(cleanText)) {
        colorStyle = "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800";
    } else if (cleanText === 'Belum') {
        colorStyle = "bg-wiz-orange/10 text-wiz-orange dark:bg-amber-950/40 dark:text-amber-400 border border-wiz-orange/20";
    }

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${colorStyle}`}>
            {cleanText || '-'}
        </span>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col slide-up border border-white/20 dark:border-gray-700 text-gray-800 dark:text-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
                {title && (
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur z-10">
                        <h2 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{title}</h2>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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

const Table = ({ columns = [], data = [], onEdit, onDelete }) => {
    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-300 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-4 py-3.5">{col.label}</th>
                        ))}
                        {(onEdit || onDelete) && <th className="px-4 py-3.5 text-center">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-4 py-8 text-center text-gray-400 text-xs italic">
                                Belum ada data untuk ditampilkan.
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr key={row.id || rowIdx} className="hover:bg-wiz-light dark:hover:bg-gray-700/40 transition-colors">
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-4 py-3 text-gray-700 dark:text-gray-200">
                                        {col.render ? col.render(row) : (row[col.key] ?? '-')}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {onEdit && (
                                                <button onClick={() => onEdit(row)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Ubah Data">
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={() => onDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Hapus Data">
                                                    <i className="fa-solid fa-trash-can"></i>
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

const DynamicForm = ({ schema = [], initialData = null, defaultValues = {}, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(() => {
        const initial = { ...defaultValues, ...(initialData || {}) };
        schema.forEach(field => {
            if (initial[field.name] === undefined) initial[field.name] = '';
        });
        return initial;
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {schema.map(field => {
                    const isFull = field.fullWidth || ['textarea', 'file', 'berau_address', 'map_location'].includes(field.type);
                    return (
                        <div key={field.name} className={isFull ? 'col-span-1 sm:col-span-2' : 'col-span-1'}>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'select' ? (
                                <select
                                    required={field.required}
                                    value={formData[field.name] || ''}
                                    onChange={e => handleChange(field.name, e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                >
                                    <option value="">-- Pilih {field.label} --</option>
                                    {(field.options || []).map((opt, i) => {
                                        const val = typeof opt === 'object' ? opt.value : opt;
                                        const lbl = typeof opt === 'object' ? opt.label : opt;
                                        return <option key={i} value={val}>{lbl}</option>;
                                    })}
                                </select>
                            ) : field.type === 'datalist' ? (
                                <>
                                    <input
                                        type="text"
                                        list={`list-${field.name}`}
                                        required={field.required}
                                        value={formData[field.name] || ''}
                                        onChange={e => handleChange(field.name, e.target.value)}
                                        placeholder={`Ketik atau pilih ${field.label}`}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                    />
                                    <datalist id={`list-${field.name}`}>
                                        {(field.options || []).map((opt, i) => (
                                            <option key={i} value={opt} />
                                        ))}
                                    </datalist>
                                </>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    rows="3"
                                    required={field.required}
                                    value={formData[field.name] || ''}
                                    onChange={e => handleChange(field.name, e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                ></textarea>
                            ) : field.type === 'file' ? (
                                <input
                                    type="text"
                                    placeholder="Masukkan link bukti (URL Google Drive / Gambar)"
                                    value={formData[field.name] || ''}
                                    onChange={e => handleChange(field.name, e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                />
                            ) : (
                                <input
                                    type={field.type || 'text'}
                                    required={field.required}
                                    value={field.isCurrency ? (formData[field.name] ? Number(formData[field.name]).toLocaleString('id-ID') : '') : (formData[field.name] || '')}
                                    onChange={e => {
                                        const val = field.isCurrency ? Number(e.target.value.replace(/\D/g, '')) : e.target.value;
                                        handleChange(field.name, val);
                                    }}
                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                {onCancel && <Button variant="secondary" onClick={onCancel}>Batal</Button>}
                <Button type="submit" variant="primary">Simpan Data</Button>
            </div>
        </form>
    );
};

const ModuleView = ({ title = '', data = [], columns = [], schema = [], defaultValues = {}, onSave, onDelete, canAdd = true, canEdit = true, canDelete = true }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const filteredData = (data || []).filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return Object.values(item).some(val => String(val || '').toLowerCase().includes(term));
    });

    const handleOpenAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSave = (formValues) => {
        if (onSave) onSave(formValues, !!editingItem);
        setIsModalOpen(false);
        setEditingItem(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="relative w-full sm:w-72">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`Cari data ${title}...`}
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-wiz-green"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <i className="fa-solid fa-circle-xmark text-xs"></i>
                        </button>
                    )}
                </div>
                {canAdd && onSave && (
                    <Button onClick={handleOpenAdd} icon="fa-solid fa-plus" variant="primary" className="w-full sm:w-auto">
                        Tambah Data
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                data={filteredData}
                onEdit={canEdit && onSave ? handleOpenEdit : null}
                onDelete={canDelete && onDelete ? onDelete : null}
            />

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? `Ubah Data ${title}` : `Tambah ${title}`}>
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

const Html5QrcodePlugin = ({ qrCodeSuccessCallback }) => {
    useEffect(() => {
        const scannerId = "html5qr-code-full-region";
        let html5QrCode = null;

        if (typeof window.Html5QrcodeScanner !== 'undefined') {
            html5QrCode = new window.Html5QrcodeScanner(scannerId, { fps: 10, qrbox: 250 }, false);
            html5QrCode.render(qrCodeSuccessCallback, (err) => {});
        }

        return () => {
            if (html5QrCode) {
                try { html5QrCode.clear(); } catch(e) {}
            }
        };
    }, [qrCodeSuccessCallback]);

    return <div id="html5qr-code-full-region" className="w-full"></div>;
};

window.Button = Button;
window.StatusBadge = StatusBadge;
window.Modal = Modal;
window.Table = Table;
window.DynamicForm = DynamicForm;
window.ModuleView = ModuleView;
window.Html5QrcodePlugin = Html5QrcodePlugin;
