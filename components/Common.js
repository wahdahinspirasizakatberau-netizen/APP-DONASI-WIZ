// Komponen UI Dasar & Reusable

const { useState, useEffect, useMemo, useRef } = React;

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon, disabled = false }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
    const variants = {
        primary: "bg-wiz-green hover:bg-wiz-green_dark text-white focus:ring-wiz-green hover:shadow-md hover:-translate-y-0.5",
        accent: "bg-gradient-to-r from-wiz-orange to-[#fca545] hover:from-wiz-orange_dark hover:to-wiz-orange text-white focus:ring-wiz-orange shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-wiz-orange/20",
        secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-gray-200 hover:shadow-sm",
        danger: "bg-red-50 dark:bg-red-900/30 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-100 dark:border-red-800 focus:ring-red-500",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 focus:ring-gray-500 shadow-none border border-transparent",
    };
    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
            {icon && <i className={icon}></i>}
            {children}
        </button>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm animate-in">
            <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto slide-up border border-white/20 dark:border-gray-700 text-gray-800 dark:text-gray-100 flex flex-col">
                {title && (
                    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur z-10">
                        <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{title}</h2>
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-wiz-green dark:hover:text-emerald-400 hover:bg-wiz-green/10 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0">
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

const StatusBadge = ({ text, type }) => {
    const colors = {
        success: 'bg-wiz-green/10 dark:bg-emerald-950/40 text-wiz-green dark:text-emerald-400 border-wiz-green/20 dark:border-emerald-800/50',
        warning: 'bg-wiz-orange/10 dark:bg-amber-950/40 text-wiz-orange_dark dark:text-amber-400 border-wiz-orange/20 dark:border-amber-800/50',
        danger: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50',
        info: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50',
        neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
    };
    let c = colors.neutral;
    if(['Aktif', 'Berhasil', 'Selesai'].includes(text)) c = colors.success;
    else if(['Menunggu Validasi', 'Dalam Proses'].includes(text)) c = colors.warning;
    else if(['Dibatalkan', 'Gagal', 'Nonaktif'].includes(text)) c = colors.danger;
    
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wide ${c}`}>{text}</span>;
};

const Table = ({ columns, data, onEdit, onDelete }) => (
    <div className="space-y-3">
        {/* TAMPILAN KHUSUS LAYAR HP (CARD VIEW) */}
        <div className="block md:hidden space-y-3">
            {data.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400 border border-gray-100 dark:border-gray-700">
                    <i className="fa-regular fa-folder-open text-3xl mb-2"></i>
                    <p className="text-xs">Belum ada data yang ditambahkan.</p>
                </div>
            ) : (
                data.map((row, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 transition-all">
                        <div className="space-y-2">
                            {columns.map((col, colIdx) => (
                                <div key={colIdx} className="flex justify-between items-start gap-2 text-xs border-b border-gray-50 dark:border-gray-700/50 pb-2 last:border-b-0 last:pb-0">
                                    <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] shrink-0 pt-0.5">{col.label}</span>
                                    <div className="font-medium text-gray-800 dark:text-gray-200 text-right">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(onEdit || onDelete) && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                {onEdit && (
                                    <button onClick={() => onEdit(row)} className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center gap-1.5 transition-colors">
                                        <i className="fa-solid fa-pen-to-square"></i> Edit
                                    </button>
                                )}
                                {onDelete && (
                                    <button onClick={() => onDelete(row)} className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center gap-1.5 transition-colors">
                                        <i className="fa-solid fa-trash-can"></i> Hapus
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>

        {/* TAMPILAN TABEL STANDARD UNTUK TABLET & DESKTOP */}
        <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-wiz-green/5 dark:bg-gray-700/60 text-wiz-green_dark dark:text-emerald-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-6 py-4">{col.label}</th>
                        ))}
                        {(onEdit || onDelete) && <th className="px-6 py-4 text-center">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700 text-gray-600 dark:text-gray-300">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <i className="fa-regular fa-folder-open text-2xl"></i>
                                    </div>
                                    <p>Belum ada data yang ditambahkan.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-wiz-light dark:hover:bg-gray-700/50 transition-colors duration-200">
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-6 py-4">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {onEdit && (
                                                <button onClick={() => onEdit(row)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 rounded-xl transition-colors" title="Edit">
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={() => onDelete(row)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 rounded-xl transition-colors" title="Hapus">
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
    </div>
);

const DynamicForm = ({ schema, initialData, defaultValues, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(initialData || defaultValues || {});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCurrencyChange = (e, fieldName) => {
        const val = e.target.value.replace(/\D/g, ''); 
        setFormData(prev => ({ ...prev, [fieldName]: val }));
    };

    const handleFileChange = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(true);
        setUploadError('');
        
        const localPreviewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, [fieldName]: localPreviewUrl }));
        
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];
                const payload = { action: 'uploadImage', filename: file.name, mimeType: file.type, base64: base64data };
                try {
                    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (result.status === 'success') {
                        setFormData(prev => ({ ...prev, [fieldName]: result.url }));
                    } else {
                        setUploadError('Gagal mengupload gambar ke Google Drive.');
                    }
                } catch(err) {
                    setUploadError('Koneksi terputus saat mengunggah foto.');
                }
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setUploadError('Terjadi kesalahan saat membaca file.');
            setIsUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        for (let field of schema) {
            if (field.type === 'berau_address' && field.required) {
                const val = formData[field.name] || '';
                if (!val.includes('Kec.')) {
                    setUploadError(`Alamat tidak lengkap: Anda wajib memilih Kelurahan & Kecamatan dari dropdown untuk kolom "${field.label}".`);
                    return;
                }
            }
        }
        onSubmit(formData);
    };

    const inputBaseClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-wiz-green/20 focus:border-wiz-green bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-all text-sm text-gray-800 dark:text-gray-100 outline-none";

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {uploadError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-4 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
                    <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                    <p>{uploadError}</p>
                </div>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {schema.map((field) => (
                    <div key={field.name} className={field.fullWidth ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{field.label}</label>
                        
                        {field.type === 'file' ? (
                            <div className="space-y-3">
                                <div className="relative w-full h-48 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center p-2 group transition-colors hover:border-wiz-green/50 dark:hover:border-emerald-500/50">
                                    {formData[field.name] ? (
                                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800 flex items-center justify-center">
                                            <img 
                                                src={getDirectImageUrl(formData[field.name])} 
                                                alt="Preview" 
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                            <div style={{display: 'none'}} className="absolute inset-0 flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                                                <i className="fa-solid fa-image-slash text-3xl mb-2"></i>
                                                <span className="text-xs">Gagal memuat gambar</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 pointer-events-none">
                                            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700 mb-3 overflow-hidden">
                                                <i className="fa-solid fa-camera text-2xl text-gray-300 dark:text-gray-600 group-hover:text-wiz-green transition-colors"></i>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 group-hover:text-wiz-green transition-colors">Belum ada foto</span>
                                            <span className="text-[10px]">Ketuk "Pilih File" di bawah</span>
                                        </div>
                                    )}
                                </div>
                                <div className="relative group flex items-center justify-center w-full">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, field.name)}
                                        required={field.required && !formData[field.name]}
                                        disabled={isUploading}
                                        className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-wiz-green/10 dark:file:bg-wiz-green/20 file:text-wiz-green dark:file:text-emerald-400 hover:file:bg-wiz-green/20 cursor-pointer disabled:opacity-50 transition-colors"
                                    />
                                </div>
                                {isUploading && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-wiz-orange font-bold animate-pulse bg-wiz-orange/10 dark:bg-amber-900/30 py-2.5 rounded-xl border border-wiz-orange/20 mt-2">
                                        <i className="fa-solid fa-spinner fa-spin"></i> Sedang Mengunggah & Menyimpan Foto...
                                    </div>
                                )}
                            </div>
                        ) : field.isCurrency ? (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-gray-400 sm:text-sm font-semibold">Rp</span>
                                </div>
                                <input
                                    type="text"
                                    name={field.name}
                                    value={formData[field.name] ? Number(formData[field.name]).toLocaleString('id-ID') : ''}
                                    onChange={(e) => handleCurrencyChange(e, field.name)}
                                    required={field.required}
                                    className={`${inputBaseClass} pl-11`}
                                    placeholder="0"
                                />
                            </div>
                        ) : field.type === 'select' ? (
                            <select
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                required={field.required}
                                className={inputBaseClass}
                            >
                                <option value="" disabled className="dark:bg-gray-800">Pilih {field.label}</option>
                                {field.options.map(opt => (
                                    <option key={opt.value || opt} value={opt.value || opt} className="dark:bg-gray-800">{opt.label || opt}</option>
                                ))}
                            </select>
                        ) : field.type === 'map_location' ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <i className="fa-solid fa-map-location-dot"></i>
                                        </div>
                                        <input
                                            type="text"
                                            name={field.name}
                                            value={formData[field.name] || ''}
                                            onChange={handleChange}
                                            placeholder="Tempel link Google Maps atau ketik koordinat (lat, long)"
                                            className={`${inputBaseClass} pl-10`}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const queryKeyword = (formData.usaha ? `${formData.usaha} ` : '') + (formData.alamat ? `${formData.alamat} ` : '') + 'Berau';
                                            const searchTarget = queryKeyword.trim() ? encodeURIComponent(queryKeyword) : 'Tanjung+Redeb+Berau';
                                            window.open(`https://www.google.com/maps/place/Tandjungredeb?api=1&query=${searchTarget}`, '_blank');
                                        }}
                                        className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border border-blue-200 dark:border-blue-800 shrink-0"
                                        title="Buka Web Maps untuk mencari titik lokasi"
                                    >
                                        <i className="fa-solid fa-magnifying-glass-location text-sm"></i> Cari di Web Maps
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        const lat = position.coords.latitude;
                                                        const lng = position.coords.longitude;
                                                        const url = `https://www.google.com/maps?q=${lat},${lng}`;
                                                        setFormData(prev => ({ ...prev, [field.name]: url }));
                                                    },
                                                    () => {
                                                        setUploadError("Gagal mendeteksi lokasi GPS. Pastikan izin lokasi / GPS diaktifkan di browser HP Anda.");
                                                    },
                                                    { enableHighAccuracy: true, timeout: 10000 }
                                                );
                                            } else {
                                                setUploadError("Perangkat atau browser tidak mendukung fitur deteksi GPS.");
                                            }
                                        }}
                                        className="px-3.5 py-2.5 bg-wiz-green/10 hover:bg-wiz-green text-wiz-green hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border border-wiz-green/20 shrink-0"
                                        title="Deteksi Titik GPS Posisi Saya Saat Ini"
                                    >
                                        <i className="fa-solid fa-location-crosshairs text-sm"></i> GPS HP
                                    </button>
                                </div>
                                {formData[field.name] && (() => {
                                    const mapUrls = parseMapUrls(formData[field.name]);
                                    return (
                                        <div className="flex flex-wrap items-center gap-2 pt-1 bg-gray-50/80 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <i className="fa-solid fa-route text-wiz-orange"></i> Pilihan Cek Map:
                                            </span>
                                            <a
                                                href={mapUrls.navUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-1.5 bg-wiz-green/10 hover:bg-wiz-green text-wiz-green hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-wiz-green/20"
                                                title="Buka di Aplikasi Google Maps HP (Rute / Navigasi)"
                                            >
                                                <i className="fa-solid fa-mobile-screen"></i> Buka di HP (App)
                                            </a>
                                            <a
                                                href={mapUrls.webUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                                                title="Buka langsung di www.google.com/maps (Web)"
                                            >
                                                <i className="fa-solid fa-globe"></i> www.google.com/maps (Web)
                                            </a>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : field.type === 'berau_address' ? (
                            <div className="space-y-3">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-tight flex items-start gap-1.5">
                                        <i className="fa-solid fa-lightbulb text-yellow-500 mt-0.5"></i>
                                        <span>Langkah 1: Ketik nama Jalan/RT pada kotak di bawah.<br/>Langkah 2: Pilih Kelurahan/Kecamatan agar alamat tergabung otomatis.</span>
                                    </p>
                                </div>
                                <textarea
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleChange}
                                    required={field.required}
                                    rows={2}
                                    className={inputBaseClass}
                                    placeholder="1. Ketik nama jalan / gang / RT (Contoh: Jl. AKB Sanipah 1 RT.05)"
                                />
                                <select 
                                    className={`${inputBaseClass} border-wiz-green/30 dark:border-emerald-600/30 bg-wiz-green/5 dark:bg-emerald-900/10 cursor-pointer font-semibold text-wiz-green dark:text-emerald-400`} 
                                    onChange={(e) => {
                                        if(!e.target.value) return;
                                        const current = formData[field.name] || '';
                                        if(current.includes(e.target.value)) {
                                            e.target.value = "";
                                            return;
                                        }
                                        const newVal = current ? (current + (current.trim().endsWith(',') ? ' ' : ', ') + e.target.value) : e.target.value;
                                        setFormData(prev => ({ ...prev, [field.name]: newVal }));
                                        e.target.value = ""; 
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled className="dark:bg-gray-800 font-bold">2. Pilih Kelurahan & Kec. (WAJIB)</option>
                                    <optgroup label="Kec. Tanjung Redeb">
                                        <option value="Kel. Tanjung Redeb, Kec. Tanjung Redeb">Kel. Tanjung Redeb</option>
                                        <option value="Kel. Bugis, Kec. Tanjung Redeb">Kel. Bugis</option>
                                        <option value="Kel. Gayam, Kec. Tanjung Redeb">Kel. Gayam</option>
                                        <option value="Kel. Karang Ambun, Kec. Tanjung Redeb">Kel. Karang Ambun</option>
                                        <option value="Kel. Bedungun, Kec. Tanjung Redeb">Kel. Bedungun</option>
                                        <option value="Kel. Gunung Panjang, Kec. Tanjung Redeb">Kel. Gunung Panjang</option>
                                    </optgroup>
                                    <optgroup label="Kec. Teluk Bayur">
                                        <option value="Kel. Teluk Bayur, Kec. Teluk Bayur">Kel. Teluk Bayur</option>
                                        <option value="Kel. Rinding, Kec. Teluk Bayur">Kel. Rinding</option>
                                        <option value="Kampung Labanan Jaya, Kec. Teluk Bayur">Kmp. Labanan Jaya</option>
                                        <option value="Kampung Labanan Makmur, Kec. Teluk Bayur">Kmp. Labanan Makmur</option>
                                        <option value="Kampung Tumbang Jaya, Kec. Teluk Bayur">Kmp. Tumbang Jaya</option>
                                    </optgroup>
                                    <optgroup label="Kec. Sambaliung">
                                        <option value="Kel. Sambaliung, Kec. Sambaliung">Kel. Sambaliung</option>
                                        <option value="Kampung Bebanir Bangun, Kec. Sambaliung">Kmp. Bebanir Bangun</option>
                                        <option value="Kampung Gurimbang, Kec. Sambaliung">Kmp. Gurimbang</option>
                                        <option value="Kampung Limunjan, Kec. Sambaliung">Kmp. Limunjan</option>
                                        <option value="Kampung Suaran, Kec. Sambaliung">Kmp. Suaran</option>
                                    </optgroup>
                                    <optgroup label="Kec. Gunung Tabur">
                                        <option value="Kel. Gunung Tabur, Kec. Gunung Tabur">Kel. Gunung Tabur</option>
                                        <option value="Kampung Merancang Ilir, Kec. Gunung Tabur">Kmp. Merancang Ilir</option>
                                        <option value="Kampung Merancang Ulu, Kec. Gunung Tabur">Kmp. Merancang Ulu</option>
                                        <option value="Kampung Batu-Batu, Kec. Gunung Tabur">Kmp. Batu-Batu</option>
                                    </optgroup>
                                    <optgroup label="Kecamatan Lainnya (Berau)">
                                        <option value="Kec. Segah">Kec. Segah</option>
                                        <option value="Kec. Kelay">Kec. Kelay</option>
                                        <option value="Kec. Pulau Derawan">Kec. Pulau Derawan</option>
                                        <option value="Kec. Maratua">Kec. Maratua</option>
                                        <option value="Kec. Talisayan">Kec. Talisayan</option>
                                        <option value="Kec. Biatan">Kec. Biatan</option>
                                        <option value="Kec. Tabalar">Kec. Tabalar</option>
                                        <option value="Kec. Batu Putih">Kec. Batu Putih</option>
                                        <option value="Kec. Biduk-Biduk">Kec. Biduk-Biduk</option>
                                    </optgroup>
                                </select>
                            </div>
                        ) : field.type === 'textarea' ? (
                            <textarea
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                required={field.required}
                                rows={3}
                                className={inputBaseClass}
                            />
                        ) : (
                            <input
                                type={field.type || 'text'}
                                name={field.name}
                                value={field.type === 'date' && formData[field.name] ? String(formData[field.name]).split('T')[0] : (formData[field.name] || '')}
                                onChange={handleChange}
                                required={field.required}
                                className={inputBaseClass}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700 mt-8">
                <Button variant="secondary" onClick={onCancel}>Batalkan</Button>
                <Button type="submit" disabled={isUploading} variant="primary">
                    {isUploading ? (<span><i className="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...</span>) : 'Simpan Data'}
                </Button>
            </div>
        </form>
    );
};

const Html5QrcodePlugin = ({ qrCodeSuccessCallback }) => {
    const callbackRef = useRef(qrCodeSuccessCallback);
    useEffect(() => { callbackRef.current = qrCodeSuccessCallback; }, [qrCodeSuccessCallback]);
    const fileInputRef = useRef(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        } catch (e) {}
    };

    const handleFileScan = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setIsProcessingFile(true);
        try {
            const scanner = new window.Html5Qrcode("qr-file-processor");
            const decodedText = await scanner.scanFile(file, true);
            playBeep();
            if (callbackRef.current) {
                callbackRef.current(decodedText);
            }
        } catch (err) {
            console.error("Gagal membaca QR dari foto:", err);
            showCustomNotice("QR Code tidak terdeteksi pada foto. Pastikan foto QR terlihat jelas dan terang.", "bg-amber-600");
        } finally {
            setIsProcessingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const showCustomNotice = (msg, bg = "bg-red-500") => {
        const el = document.createElement('div');
        el.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[100] ${bg} text-white text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all text-center max-w-xs`;
        el.innerText = msg;
        document.body.appendChild(el);
        setTimeout(() => { el.remove(); }, 3500);
    };

    useEffect(() => {
        let html5QrCode;
        let isComponentMounted = true;
        let isScanningNow = false;

        const startCamera = async () => {
            if (!window.Html5Qrcode) return;
            
            try {
                html5QrCode = new window.Html5Qrcode("qr-reader");
                const config = { 
                    fps: 15, 
                    qrbox: function (viewfinderWidth, viewfinderHeight) {
                        let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                        let boxSize = Math.floor(minEdgeSize * 0.75);
                        let finalBoxSize = Math.max(50, boxSize);
                        return { width: finalBoxSize, height: finalBoxSize };
                    }
                };

                const onScanSuccess = (decodedText) => {
                    if (isScanningNow) return; 
                    isScanningNow = true;
                    playBeep();
                    
                    if (isComponentMounted && callbackRef.current) {
                        callbackRef.current(decodedText);
                    }
                    setTimeout(() => { isScanningNow = false; }, 2500);
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess,
                    () => {}
                );
            } catch (err) {
                try {
                    await html5QrCode.start(
                        { facingMode: "user" },
                        config,
                        (decodedText) => {
                            if (isScanningNow) return;
                            isScanningNow = true;
                            playBeep();
                            if (isComponentMounted && callbackRef.current) callbackRef.current(decodedText);
                            setTimeout(() => { isScanningNow = false; }, 2500);
                        },
                        () => {}
                    );
                } catch (fallbackErr) {
                    if (isComponentMounted) setIsBlocked(true);
                }
            }
        };

        startCamera();

        return () => {
            isComponentMounted = false;
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => console.log(e));
            }
        };
    }, []);

    return (
        <div className="w-full space-y-3">
            <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handleFileScan} 
                className="hidden" 
            />
            <div id="qr-file-processor" className="hidden"></div>

            {!isBlocked ? (
                <div id="qr-reader" className="w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center text-white relative z-10 shadow-inner border-2 border-gray-200 dark:border-gray-700">
                    <span className="animate-pulse font-medium text-sm flex items-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin"></i> Menyiapkan Kamera...
                    </span>
                </div>
            ) : (
                <div className="w-full aspect-square rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-dashed border-amber-300 dark:border-amber-700 p-5 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 shadow-sm">
                        <i className="fa-solid fa-camera-rotate text-2xl"></i>
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Kamera Iframe Dibatasi</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 leading-relaxed max-w-xs">
                        Google Sites membatasi streaming kamera langsung. Gunakan tombol kamera di bawah:
                    </p>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        disabled={isProcessingFile}
                        className="w-full max-w-xs py-3 px-4 bg-wiz-green hover:bg-wiz-green_dark text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        {isProcessingFile ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i> Memindai Gambar QR...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-camera"></i> Buka Kamera HP (Foto QR)
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-1">
                <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    disabled={isProcessingFile}
                    className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700/70 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                    <i className="fa-solid fa-image text-wiz-orange"></i>
                    <span>{isProcessingFile ? 'Membaca...' : 'Pilih Foto Galeri'}</span>
                </button>

                {window.self !== window.top && (
                    <button
                        type="button"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="py-2 px-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-blue-100 dark:border-blue-800/40"
                    >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        <span>Buka Layar Penuh</span>
                    </button>
                )}
            </div>
        </div>
    );
};

const ModuleView = ({ title, columns, data, schema, defaultValues, onSave, onDelete, canAdd = true, canEdit = true, canDelete = true }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState(null);

    const handleOpenAdd = () => { setEditingData(null); setIsModalOpen(true); };
    const handleOpenEdit = (row) => { setEditingData(row); setIsModalOpen(true); };
    const handleClose = () => { setIsModalOpen(false); setEditingData(null); };

    const handleSubmit = (formData) => {
        onSave({ ...formData, id: editingData ? editingData.id : Date.now() }, !!editingData);
        handleClose();
    };

    return (
        <div className="space-y-6 slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola data {title.toLowerCase()} pada tabel di bawah.</p>
                </div>
                {canAdd && (
                    <Button onClick={handleOpenAdd} icon="fa-solid fa-plus" variant="primary">Tambah Data Baru</Button>
                )}
            </div>
            <Table columns={columns} data={data} onEdit={canEdit ? handleOpenEdit : null} onDelete={canDelete ? onDelete : null} />
            <Modal isOpen={isModalOpen} onClose={handleClose} title={editingData ? `Edit ${title}` : `Tambah ${title}`}>
                <DynamicForm schema={schema} initialData={editingData} defaultValues={defaultValues} onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>
        </div>
    );
};
