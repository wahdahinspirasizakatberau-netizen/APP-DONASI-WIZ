// src/App.jsx
import React, { useState, useEffect } from 'react';
import { DashboardView } from './components/features/DashboardView';
// Import komponen lain seperti ScannerView, PundiView setelah Anda memecahnya

const API_URL = 'https://script.google.com/macros/s/AKfycbxvj873D153FGw04Kbgs6nOp4svOWBq4qNgjekjpbLdy-3eQs7HfLe-rAxIzwaOvSGN/exec';

function App() {
    // Global States
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isInitializing, setIsInitializing] = useState(true);
    
    // Data States
    const [amils, setAmils] = useState([]);
    const [donations, setDonations] = useState([]);
    // ... definisikan state data lainnya

    useEffect(() => {
        // Logika fetchAllData() Anda dipindahkan ke sini
        const fetchAllData = async () => {
             setIsInitializing(true);
             try {
                 const res = await fetch(API_URL);
                 const result = await res.json();
                 if (result.status === 'success') {
                     setAmils(result.data.Amil || []);
                     setDonations(result.data.Donasi || []);
                     // ... set state lainnya
                 }
             } catch (err) {
                 console.error(err);
             } finally {
                 setIsInitializing(false);
             }
        };
        fetchAllData();
    }, []);

    if (isInitializing) {
        return <div>Memuat aplikasi...</div>;
    }

    if (!user) {
        return <div>Layar Login (Silakan buat komponen LoginScreen.jsx)</div>;
    }

    // Bundel data untuk dikirim ke komponen
    const appData = { amils, donations }; 

    return (
        <div className="flex h-screen bg-wiz-light dark:bg-gray-900">
            {/* Sidebar Anda nantinya dipanggil di sini */}
            
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Anda nantinya dipanggil di sini */}

                <div className="flex-1 overflow-auto p-6">
                    {/* Routing sederhana berdasarkan Tab */}
                    {activeTab === 'dashboard' && <DashboardView data={appData} />}
                    {/* {activeTab === 'pundi' && <PundiView data={appData} />} */}
                </div>
            </main>
        </div>
    );
}

export default App;
