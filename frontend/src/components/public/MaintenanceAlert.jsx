import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { api } from '../../services/api';

export default function MaintenanceAlert({ onSubscribe }) {
    const [maintenance, setMaintenance] = useState([]);

    useEffect(() => {
        api.getActiveMaintenance()
            .then(data => setMaintenance(data || []))
            .catch(() => setMaintenance([]));
    }, []);

    if (maintenance.length === 0) return null;

    return (
        <div className="maintenance-alerts">
            {maintenance.map(m => (
                <div key={m.id} className="maintenance-alert">
                    <div className="flex justify-between items-start">
                        <div className="maintenance-header">
                            <Info size={18} className="info-icon" />
                            <span className="maintenance-title">{m.title}</span>
                        </div>
                        {onSubscribe && (
                            <button
                                className="text-sm border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                                onClick={() => onSubscribe(m)}
                            >
                                Subscribe
                            </button>
                        )}
                    </div>
                    <p className="maintenance-schedule">
                        Scheduled: {new Date(parseInt(m.start_time, 10)).toLocaleString()} - {new Date(parseInt(m.end_time, 10)).toLocaleString()}
                    </p>
                    <p className="maintenance-description">{m.description}</p>
                </div>
            ))}
        </div>
    );
}
