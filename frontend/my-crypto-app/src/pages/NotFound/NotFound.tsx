// src/pages/NotFound/NotFound.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-green-400 font-mono animate-crt flicker">
            <h1 className="text-6xl mb-6">404</h1>
            <p className="text-2xl mb-8">Uh-oh! The page you're looking for doesn't exist.</p>
            <Link
                to="/"
                className="px-6 py-3 border border-green-400 rounded-full text-green-300 hover:bg-green-400 hover:text-black transition font-bold tracking-wide"
            >
                Return to Home
            </Link>
        </div>
    );
};

export default NotFound;
