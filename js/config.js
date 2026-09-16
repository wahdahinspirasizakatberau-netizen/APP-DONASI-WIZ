tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                wiz: {
                    green: '#27745F',
                    green_dark: '#1B5444',
                    orange: '#F59121',
                    orange_dark: '#D87A15',
                    light: '#F8FAF9'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        }
    }
};

window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && (event.reason.name === 'AbortError' || String(event.reason).includes('The play() request was interrupted'))) {
        event.preventDefault();
    }
});

const API_URL = 'https://script.google.com/macros/s/AKfycbxvj873D153FGw04Kbgs6nOp4svOWBq4qNgjekjpbLdy-3eQs7HfLe-rAxIzwaOvSGN/exec';

const fallbackAmils = [
    { id: 1, name: 'Admin WIZ', email: 'admin@wizberau.or.id', role: 'Admin', status: 'Aktif', password: 'password123' },
    { id: 2, name: 'Amil WIZ', email: 'amil@wizberau.or.id', role: 'Amil', status: 'Aktif', password: 'password123' },
];
