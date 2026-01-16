import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { AlertTriangle, CheckCircle, Plus, Trash } from 'lucide-react';

export default function IncidentsView() {
    const [incidents, setIncidents] = useState([]);
    const [config, setConfig] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Create Form State
    const [form, setForm] = useState({ component_id: '', title: '', status: 'degraded', description: '' });

    // Edit/Update State
    const [editingIncident, setEditingIncident] = useState(null);
    const [updateForm, setUpdateForm] = useState({ status: '', update_text: '' });

    // Resolve State
    const [resolvingIncident, setResolvingIncident] = useState(null);

    const loadData = async () => {
        try {
            const [activeIncidents, servicesConfig] = await Promise.all([
                api.getActiveIncidents(),
                api.getConfig()
            ]);
            setIncidents(activeIncidents);
            setConfig(servicesConfig);
            if (servicesConfig.length > 0 && servicesConfig[0].services.length > 0) {
                setForm(f => ({ ...f, component_id: servicesConfig[0].services[0].id }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.createIncident(form);
            setShowCreate(false);
            setForm({ ...form, title: '', description: '' }); // reset title but keep others
            loadData();
        } catch (err) {
            alert('Failed to create incident: ' + (err.message || err.error || JSON.stringify(err)));
        }
    };

    const openUpdateModal = (incident) => {
        setEditingIncident(incident);
        setUpdateForm({
            status: incident.status,
            update_text: incident.update_text || ''
        });
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!editingIncident) return;

        try {
            await api.updateIncident(editingIncident.id, updateForm);
            setEditingIncident(null);
            loadData();
        } catch (err) {
            alert('Failed to update: ' + (err.message || err.error || JSON.stringify(err)));
        }
    };

    const confirmResolve = (incident) => {
        setResolvingIncident(incident);
    };

    const executeResolve = async () => {
        if (!resolvingIncident) return;
        try {
            await api.updateIncident(resolvingIncident.id, { update_text: 'Resolved', status: 'resolved' });
            setResolvingIncident(null);
            loadData();
        } catch (err) {
            alert('Failed to resolve: ' + (err.message || err.error || JSON.stringify(err)));
        }
    };

    // Flatten services for dropdown
    const allServices = config.flatMap(g => g.services);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Incident Management</h1>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                    <Plus size={18} /> Report Incident
                </button>
            </div>

            {showCreate && (
                <div className="card mb-8 border border-red-900/50">
                    <h3 className="text-lg font-bold mb-4">Report New Incident</h3>
                    <form onSubmit={handleCreate} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm">Affected Component</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2"
                                    value={form.component_id}
                                    onChange={e => setForm({ ...form, component_id: e.target.value })}
                                >
                                    {allServices.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm">Status</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2"
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                >
                                    <option value="degraded">Degraded Performance</option>
                                    <option value="outage">Major Outage</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm">Title</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2"
                                required
                                placeholder="e.g. API High Latency"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm">Description</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 min-h-[80px]"
                                placeholder="Provide initial details..."
                                value={form.description || ''}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary bg-red-600 hover:bg-red-500">Create Incident</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold mt-4">Active Incidents</h2>
                {incidents.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-900/50 rounded-lg">
                        <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                        <p>No active incidents. All systems operational.</p>
                    </div>
                ) : (
                    incidents.map(inc => (
                        <div key={inc.id} className="card border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertTriangle size={20} className="text-red-500" />
                                        <h3 className="text-xl font-bold">{inc.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${inc.status === 'outage' ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                                            {inc.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-2">
                                        Affecting: {allServices.find(s => s.id === inc.component_id)?.name || inc.component_id}
                                    </p>
                                    <p className="text-slate-300">Latest Update: {inc.update_text || 'Monitoring situation...'}</p>
                                    <p className="text-xs text-slate-500 mt-2">Started: {new Date(parseInt(inc.created_at)).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => openUpdateModal(inc)}
                                        className="btn btn-sm btn-secondary"
                                    >
                                        Post Update
                                    </button>
                                    <button
                                        onClick={() => confirmResolve(inc)}
                                        className="btn btn-sm bg-green-700 hover:bg-green-600 text-white"
                                    >
                                        Resolve
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex flex-col gap-4 mt-8 border-t border-slate-700 pt-8">
                <h2 className="text-xl font-bold">Past Incident Management</h2>
                <PastIncidentsAdmin />
            </div>

            {/* Update Modal Overlay */}
            {editingIncident && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold mb-4">Update Incident</h3>
                        <p className="text-slate-400 mb-4 text-sm">Now updating: <span className="text-white font-medium">{editingIncident.title}</span></p>

                        <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Status</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                                    value={updateForm.status}
                                    onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
                                >
                                    <option value="degraded">Degraded Performance</option>
                                    <option value="outage">Major Outage</option>
                                    <option value="operational">Operational (Recovered)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Update Message</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white min-h-[100px]"
                                    required
                                    placeholder="Describe the current status..."
                                    value={updateForm.update_text}
                                    onChange={e => setUpdateForm({ ...updateForm, update_text: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingIncident(null)}
                                    className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
                                >
                                    Post Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resolve Confirmation Modal */}
            {resolvingIncident && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-green-400">Resolve Incident?</h3>
                        <p className="text-slate-300 mb-6">
                            Are you sure you want to resolve <span className="text-white font-semibold">{resolvingIncident.title}</span>?
                            This will mark the incident as resolved and move it to past incidents.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setResolvingIncident(null)}
                                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeResolve}
                                className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-medium"
                            >
                                Resolve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PastIncidentsAdmin() {
    const [history, setHistory] = useState([]);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        load();
    }, []);

    const load = () => {
        api.getPastIncidents().then(setHistory).catch(console.error);
    }

    const confirmDelete = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setDeletingId(id);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await api.deleteIncident(deletingId);
            setDeletingId(null);
            load();
        } catch (e) {
            console.error('Delete failed:', e);
            alert('Delete failed: ' + e.message);
        }
    };

    if (history.length === 0) return <p className="text-slate-500">No past incidents found.</p>;

    return (
        <div className="space-y-2 relative">
            {history.map(h => (
                <div key={h.id} className="card border border-slate-700 p-4 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${h.type === 'maintenance' ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'}`}>{h.type}</span>
                            <span className="font-bold text-slate-200">{h.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {new Date(parseInt(h.start_time)).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => confirmDelete(e, h.id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition-colors"
                        title="Delete Incident"
                    >
                        <Trash size={16} />
                    </button>
                </div>
            ))}

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-red-400">Delete Incident?</h3>
                        <p className="text-slate-300 mb-6">
                            Are you sure you want to permanently delete this incident record? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                            >
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
