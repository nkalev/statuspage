import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function PastIncidents() {
    const [incidents, setIncidents] = useState([]);

    useEffect(() => {
        api.getPastIncidents()
            .then(data => setIncidents(data || []))
            .catch(() => setIncidents([]));
    }, []);

    if (incidents.length === 0) {
        return (
            <div className="past-incidents">
                <h2 className="section-title">Past Incidents</h2>
                <p className="no-incidents-message">No incidents reported in the last 7 days.</p>
            </div>
        );
    }

    const formatDate = (ts) => {
        if (!ts) return '';
        return new Date(parseInt(ts)).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Group by date (using end_time)
    const grouped = incidents.reduce((acc, inc) => {
        const timeVal = inc.end_time || inc.created_at;
        if (!timeVal) return acc;

        try {
            const dateStr = new Date(parseInt(timeVal)).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (dateStr === 'Invalid Date') return acc;

            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(inc);
        } catch (e) {
            console.warn("Invalid date for incident", inc);
        }
        return acc;
    }, {});



    return (
        <div className="past-incidents">
            <div className="mb-6 border-b border-slate-700 pb-2">
                <h2 className="text-xl font-semibold">Past Incidents</h2>
            </div>

            {incidents.length === 0 && (
                <p className="no-incidents-message">No incidents reported in the last 7 days.</p>
            )}

            {Object.entries(grouped).map(([date, items]) => (
                <div key={date} className="incident-group">
                    <h3 className="incident-date">{date}</h3>
                    {items.map(inc => (
                        <div key={inc.id} className="incident-card">
                            <h4 className="text-blue-400 font-bold">{inc.title}</h4>
                            <div className="text-xs text-slate-500 mb-1">
                                {inc.start_time && (
                                    <span className="text-red-400">
                                        Started: {formatDate(inc.start_time)}
                                    </span>
                                )}
                                {inc.start_time && inc.end_time && ' | '}
                                {inc.end_time && (
                                    <span className="text-green-400 font-bold">
                                        Resolved: {formatDate(inc.end_time)}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 mt-2 normal-case">
                                {inc.description}
                            </p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
