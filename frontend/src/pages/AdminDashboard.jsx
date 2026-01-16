import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, AlertTriangle, Settings, LogOut } from 'lucide-react';
import MaintenanceView from '../components/admin/MaintenanceView';
import SettingsView from '../components/admin/SettingsView';
import IncidentsView from '../components/admin/IncidentsView';
import ConfigView from '../components/admin/ConfigView';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [activeView, setActiveView] = useState('maintenance'); // 'maintenance' | 'incidents' | 'settings' | 'config'

    useEffect(() => {
        if (!localStorage.getItem('adminKey')) {
            navigate('/admin/login');
        } else {
            setIsAuthenticated(true);
            setApiKey(localStorage.getItem('adminKey'));
        }
    }, [navigate]);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col">
                <div className="text-xl font-bold mb-8 px-2">Statuspage <span className="text-blue-500">Admin</span></div>

                <nav className="flex-1 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveView('maintenance')}
                        className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeView === 'maintenance' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                    >
                        <Calendar size={20} /> Maintenance
                    </button>
                    <button
                        onClick={() => setActiveView('incidents')}
                        className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeView === 'incidents' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                    >
                        <AlertTriangle size={20} /> Incidents
                    </button>
                    <button
                        onClick={() => setActiveView('config')}
                        className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeView === 'config' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                    >
                        <Settings size={20} /> Configuration
                    </button>
                    <button
                        onClick={() => setActiveView('settings')}
                        className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeView === 'settings' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                    >
                        <Users size={20} /> Subscribers
                    </button>
                </nav>

                <button onClick={() => { localStorage.removeItem('adminKey'); navigate('/'); }} className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 mt-auto">
                    <LogOut size={18} /> Logout
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 bg-slate-950 overflow-y-auto">
                {activeView === 'maintenance' && <MaintenanceView />}
                {activeView === 'incidents' && <IncidentsView />}
                {activeView === 'config' && <ConfigView />}
                {activeView === 'settings' && <SettingsView />}
            </div>
        </div>
    );
}
