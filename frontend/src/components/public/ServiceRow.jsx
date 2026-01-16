import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react';

const StatusIcon = ({ status }) => {
    if (status === 'operational') return <CheckCircle className="status-icon operational" size={18} />;
    if (status === 'degraded') return <AlertTriangle className="status-icon degraded" size={18} />;
    if (status === 'maintenance') return <Wrench className="status-icon maintenance" size={18} />;
    return <XCircle className="status-icon outage" size={18} />;
};

const RegionDot = ({ status }) => {
    const colorClass = status === 'operational' ? 'operational' :
        status === 'degraded' ? 'degraded' : 'outage';
    return <span className={`region-dot ${colorClass}`} />;
};

const UptimeBar = ({ history }) => {
    if (!history || history.length === 0) return null;

    // Show last 90 days
    const days = history.slice(0, 90);

    return (
        <div className="uptime-bar-container">
            <div className="uptime-bar-labels">
                <span>90 DAYS AGO</span>
                <span>100% UPTIME</span>
                <span>TODAY</span>
            </div>
            <div className="uptime-bar">
                {days.map((day, i) => (
                    <div
                        key={i}
                        className={`uptime-day ${day.status === 'operational' ? 'operational' :
                            day.status === 'maintenance' ? 'maintenance' :
                                day.status === 'degraded' ? 'degraded' : 'outage'}`}
                        title={`${day.date}: ${day.uptime_pct || 100}% uptime`}
                    />
                ))}
            </div>
        </div>
    );
};

export default function ServiceRow({ service }) {
    const [expanded, setExpanded] = useState(false);

    const statusLabel = service.status.charAt(0).toUpperCase() + service.status.slice(1);
    const hasIssue = service.status !== 'operational';

    // Extract regions from service data
    const regions = service.regions || {};
    const regionEntries = Object.entries(regions);

    return (
        <div className={`service-row ${expanded ? 'expanded' : ''}`}>
            <div
                className="service-row-header"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="service-info">
                    <StatusIcon status={service.status} />
                    <span className="service-name">{service.name}</span>
                </div>
                <div className="service-status-section">

                    <span className={`status-label ${service.status}`}>
                        {statusLabel}
                    </span>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {expanded && (
                <div className="service-row-details">
                    {/* Incident Info */}
                    {hasIssue && service.incident && (
                        <div className="incident-info">
                            <p className="incident-type">
                                {service.status === 'outage' ? 'Partial Outage detected' :
                                    service.status === 'degraded' ? 'Degraded Performance' : 'Maintenance'}
                            </p>
                            <p className="incident-meta">Automated Checks</p>
                            <p className="incident-detail">{service.incident.update || 'Probes detected connectivity issues.'}</p>
                        </div>
                    )}

                    {/* Region Status */}
                    {regionEntries.length > 0 && (
                        <div className="region-status">
                            {regionEntries.map(([region, data]) => (
                                <div key={region} className="region-item">
                                    <RegionDot status={data} />
                                    <span>{region}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Full Uptime Bar */}
                    <UptimeBar history={service.history} />

                    {/* No incidents message */}
                    {!hasIssue && (
                        <p className="no-incidents">No active incidents</p>
                    )}
                </div>
            )}
        </div>
    );
}
