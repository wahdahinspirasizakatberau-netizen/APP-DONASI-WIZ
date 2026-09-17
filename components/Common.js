// Komponen Searchable Select untuk Memilih Donatur dengan Cepat
const SearchableSelect = ({ value, onChange, options = [], placeholder = 'Pilih donatur...', required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);

    const normalizedOptions = useMemo(() => {
        return (options || []).map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    }, [options]);

    const selectedOption = normalizedOptions.find(o => String(o.value) === String(value));

    const filteredOptions = useMemo(() => {
        if (!query.trim()) return normalizedOptions;
        const q = query.toLowerCase();
        return normalizedOptions.filter(o => o.label.toLowerCase().includes(q));
    }, [normalizedOptions, query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => { setIsOpen(!isOpen); setQuery(''); }}
                className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isOpen ? 'border-wiz-green ring-2 ring-wiz-green/20 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-600'
                }`}
            >
                <div className="flex items-center gap-2 truncate flex-1">
                    <i className="fa-solid fa-magnifying-glass text-gray-400 text-xs"></i>
                    {selectedOption ? (
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{selectedOption.label}</span>
                    ) : (
                        <span className="text-gray-400 text-sm">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {value && (
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                            title="Hapus pilihan"
                        >
                            <i className="fa-solid fa-circle-xmark text-xs"></i>
                        </button>
                    )}
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-wiz-green' : ''}`}></i>
                </div>
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input 
                                type="text"
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ketik nama donatur untuk menyaring..."
                                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-wiz-green text-gray-800 dark:text-gray-100 font-medium"
                            />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400 dark:text-gray-500">
                                <i className="fa-solid fa-user-xmark text-sm mb-1 block"></i>
                                Donatur "{query}" tidak ditemukan.
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                        String(value) === String(opt.value)
                                            ? 'bg-wiz-green text-white font-bold'
                                            : 'hover:bg-wiz-light dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                            String(value) === String(opt.value) ? 'bg-white/20 text-white' : 'bg-wiz-green/10 text-wiz-green dark:text-emerald-400'
                                        }`}>
                                            {opt.label.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{opt.label}</span>
                                    </div>
                                    {String(value) === String(opt.value) && (
                                        <i className="fa-solid fa-check text-xs"></i>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Formulir Dinamis dengan Tombol Kamera Langsung & Input Donatur Searchable
const DynamicForm = ({ schema, initialData, defaultValues, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(initialData || defaultValues || {});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (file, fieldName) => {
        if (!file) return;
        setIsUploading(true);
        setUploadError('');

        const localUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, [fieldName]: localUrl }));

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result.split(',')[1];
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'uploadImage', filename: file.name || 'bukti.jpg', mimeType: file.type || 'image/jpeg', base64: base64data })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    setFormData(prev => ({ ...prev, [fieldName]: result.url }));
                }
            } catch (err) {
                // Tetap menggunakan url preview jika offline
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const inputBaseClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-wiz-green/20 focus:border-wiz-green bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-all text-sm text-gray-800 dark:text-gray-100 outline-none";

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {uploadError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 p-3 rounded-xl text-xs text-red-600">
                    {uploadError}
                </div>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {schema.map((field) => (
                    <div key={field.name} className={field.fullWidth ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {field.type === 'file' ? (
                            <div className="space-y-3">
                                <input 
                                    type="file" 
                                    ref={cameraInputRef} 
                                    accept="image/*" 
                                    capture="environment" 
                                    onChange={(e) => handleFileSelect(e.target.files[0], field.name)} 
                                    className="hidden" 
                                />
                                <input 
                                    type="file" 
                                    ref={galleryInputRef} 
                                    accept="image/*" 
                                    onChange={(e) => handleFileSelect(e.target.files[0], field.name)} 
                                    className="hidden" 
                                />

                                <div className="relative w-full h-44 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center p-2 group">
                                    {formData[field.name] ? (
                                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800 flex items-center justify-center">
                                            <img 
                                                src={getDirectImageUrl(formData[field.name])} 
                                                alt="Bukti Validasi" 
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.target.src = formData[field.name]; }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, [field.name]: '' }))}
                                                className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                                title="Hapus Gambar"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400 text-center px-4">
                                            <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm mb-2 text-wiz-green text-xl">
                                                <i className="fa-solid fa-camera"></i>
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Belum ada foto</span>
                                            <span className="text-[11px] text-gray-400 mt-0.5">Ambil langsung dengan kamera atau dari galeri</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => cameraInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-wiz-green hover:bg-wiz-green_dark text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <i className="fa-solid fa-camera text-sm"></i>
                                        <span>Ambil Foto (Kamera)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => galleryInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <i className="fa-solid fa-images text-sm text-wiz-orange"></i>
                                        <span>Pilih dari Galeri</span>
                                    </button>
                                </div>

                                {isUploading && (
                                    <p className="text-xs text-wiz-orange font-bold animate-pulse text-center">
                                        <i className="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan gambar ke penyimpanan cloud...
                                    </p>
                                )}
                            </div>
                        ) : field.searchable || field.name === 'donorName' ? (
                            <SearchableSelect
                                value={formData[field.name] || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, [field.name]: val }))}
                                options={field.options}
                                placeholder={`Cari dan pilih ${field.label}...`}
                                required={field.required}
                            />
                        ) : field.type === 'select' ? (
                            <select
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                required={field.required}
                                className={inputBaseClass}
                            >
                                <option value="" disabled>Pilih {field.label}</option>
                                {field.options.map((opt, i) => {
                                    const val = typeof opt === 'object' ? opt.value : opt;
                                    const lbl = typeof opt === 'object' ? opt.label : opt;
                                    return <option key={i} value={val}>{lbl}</option>;
                                })}
                            </select>
                        ) : (
                            <input
                                type={field.type || 'text'}
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                required={field.required}
                                className={inputBaseClass}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                <Button variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" disabled={isUploading} variant="primary">Simpan</Button>
            </div>
        </form>
    );
};
