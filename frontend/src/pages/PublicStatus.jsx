import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AlertTriangle } from 'lucide-react';
import ServiceRow from '../components/public/ServiceRow';
import MaintenanceAlert from '../components/public/MaintenanceAlert';
import PastIncidents from '../components/public/PastIncidents';
import SubscribeModal from '../components/public/SubscribeModal';

// Santiment SVG Logo
const SantimentLogo = () => (
    <svg width="140" height="24" viewBox="0 0 140 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="18" fill="white" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600">
            ·santiment·
        </text>
    </svg>
);

export default function PublicStatus() {
    const [data, setData] = useState(null);
    const [config, setConfig] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscribeTarget, setSubscribeTarget] = useState(null); // { type, id, title } | null

    const loadData = async () => {
        try {
            const [statusData, configData, incidentsData] = await Promise.all([
                api.getStatus(),
                api.getConfig(),
                api.getActiveIncidents()
            ]);
            setData(statusData);
            setConfig(configData);
            setIncidents(incidentsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="loading-screen">Loading System Status...</div>;

    const globalStatus = data && Object.values(data).every(g => g.status === 'operational') && incidents.length === 0
        ? 'operational'
        : incidents.some(i => i.status === 'outage') ? 'outage' : 'degraded';

    const bannerClass = globalStatus === 'operational' ? 'status-banner-operational'
        : globalStatus === 'outage' ? 'status-banner-outage' : 'status-banner-degraded';

    const bannerText = globalStatus === 'operational'
        ? 'All Systems Operational'
        : incidents.length > 0 ? `${incidents.length} Active Incident(s)` : '';

    return (
        <div className="status-page">

            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="logo-section">
                        <SantimentLogo />
                    </div>
                    <nav className="nav-links">
                        <a href="https://santiment.net" target="_blank" rel="noopener noreferrer">Back to Home</a>
                        <a href="https://app.santiment.net" target="_blank" rel="noopener noreferrer">Sanbase App</a>
                        <a href="https://academy.santiment.net" target="_blank" rel="noopener noreferrer">Documentation</a>
                    </nav>
                </div>
            </header>

            {/* Status Banner */}
            <div className={`status-banner ${bannerClass}`}>
                {bannerText}
            </div>

            <main className="main-content">
                {/* Active Incidents Banner */}
                {incidents.length > 0 && (
                    <div className="active-incidents">
                        <h2 className="section-title">Active Incidents</h2>
                        {incidents.map(inc => (
                            <div key={inc.id} className="incident-alert">
                                <div className="flex justify-between items-start">
                                    <div className="incident-header">
                                        <AlertTriangle size={20} />
                                        <span className="incident-title">{inc.title}</span>
                                    </div>
                                    <button
                                        className="text-sm border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                                        onClick={() => setSubscribeTarget({ type: 'incident', id: inc.id, title: inc.title })}
                                    >
                                        Subscribe
                                    </button>
                                </div>
                                <div className="incident-meta mb-2">
                                    Status: <span className="incident-status">{inc.status}</span>
                                    <span className="mx-2">•</span>
                                    Started: {new Date(parseInt(inc.created_at)).toLocaleString()}
                                </div>

                                {inc.updates && inc.updates.length > 0 ? (
                                    <div className="incident-updates flex flex-col gap-3 mt-3 pl-4 border-l-2 border-red-200">
                                        {inc.updates.map((update, idx) => (
                                            <div key={idx} className="update-item">
                                                <p className="text-slate-800">{update.message}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(parseInt(update.created_at)).toLocaleString()}
                                                    {update.status && ` - ${update.status}`}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="incident-description">{inc.update_text || 'Investigating issue...'}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Maintenance Alerts */}
                <MaintenanceAlert onSubscribe={(m) => setSubscribeTarget({ type: 'maintenance', id: m.id, title: m.title })} />

                {/* Service Groups */}
                {data && Object.values(data).map(group => (
                    <section key={group.id} className="service-group">
                        <h2 className="group-title">{group.name}</h2>
                        <div className="services-list">
                            {config.find(c => c.id === group.id)?.services.map(serviceConfig => {
                                const serviceStatus = group.services.find(s => s.id === serviceConfig.id) || { status: 'operational' };
                                return (
                                    <ServiceRow
                                        key={serviceConfig.id}
                                        service={{ ...serviceConfig, ...serviceStatus }}
                                    />
                                );
                            })}
                        </div>
                    </section>
                ))}

                {/* Past Incidents */}
                <PastIncidents />
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} Santiment. All rights reserved.</p>
                <div className="footer-links flex gap-12">
                    <a href="https://santiment.net/about/" className="hover:text-white transition-colors">About</a>
                    <a href="https://santiment.net/terms/" className="hover:text-white transition-colors">Terms</a>
                    <a href="https://santiment.net/privacy/" className="hover:text-white transition-colors">Privacy</a>
                </div>
            </footer>

            {/* Subscribe Modal */}
            {subscribeTarget && (
                <SubscribeModal
                    entity={subscribeTarget}
                    onClose={() => setSubscribeTarget(null)}
                />
            )}
        </div>
    );
}
