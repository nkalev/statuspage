import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
    const [key, setKey] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        localStorage.setItem('adminKey', key);
        navigate('/admin');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-slate-950">
            <div className="card w-full max-w-md">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Admin Access</h1>
                    <p className="text-slate-400">Enter your Admin Secret Key</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Secret Key</label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="admin-secret-..."
                            className="bg-slate-900 border-slate-700"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-full py-2">
                        Access Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
}
