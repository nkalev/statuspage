import React, { useState } from 'react';
import { api } from '../../services/api';

export default function MaintenanceView() {
    const [maintenanceList, setMaintenanceList] = useState([]);
    const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', status: 'scheduled' });
    const [message, setMessage] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const loadMaintenance = async () => {
        try {
            const data = await api.getActiveMaintenance();
            setMaintenanceList(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    React.useEffect(() => {
        loadMaintenance();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            // Convert datetime-local string to timestamp
            const payload = {
                ...form,
                start_time: new Date(form.start_time).getTime(),
                end_time: new Date(form.end_time).getTime()
            };
            await api.scheduleMaintenance(payload);
            setMessage({ type: 'success', text: 'Maintenance scheduled successfully!' });
            setForm({ title: '', description: '', start_time: '', end_time: '', status: 'scheduled' });
            loadMaintenance();
        } catch (err) {
            setMessage({ type: 'error', text: err.error || err.message || 'Failed' });
        }
    };

    const confirmDelete = (e, id) => {
        e.preventDefault();
        setDeletingId(id);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await api.deleteMaintenance(deletingId);
            setDeletingId(null);
            loadMaintenance();
        } catch (err) {
            alert("Failed to delete: " + err.message);
        }
    };

    return (
        <div className="max-w-4xl relative">
            <h1 className="text-2xl font-bold mb-6">Schedule Maintenance</h1>

            <div className="grid grid-cols-1 gap-8">
                {/* Form */}
                <div className="card h-fit">
                    <h2 className="text-xl font-semibold mb-4">New Maintenance</h2>
                    {message && (
                        <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                            {message.text}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="text-sm">Title</label>
                            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Database Upgrade" />
                        </div>
                        <div>
                            <label className="text-sm">Description</label>
                            <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm">Start Time</label>
                                <input required type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm">End Time</label>
                                <input required type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary mt-2">Schedule Maintenance</button>
                    </form>
                </div>

                {/* List */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Active & Scheduled</h2>
                    <div className="flex flex-col gap-4">
                        {maintenanceList.length === 0 && <p className="text-slate-400">No active maintenance.</p>}
                        {maintenanceList.map(m => (
                            <div key={m.id} className="card border border-slate-700 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">{m.title}</h3>
                                    <button
                                        type="button"
                                        onClick={(e) => confirmDelete(e, m.id)}
                                        className="text-red-400 hover:text-red-300 text-sm font-semibold px-2 py-1 rounded hover:bg-red-900/20"
                                    >
                                        Delete
                                    </button>
                                </div>
                                <p className="text-sm text-slate-300 mb-2">{m.description}</p>
                                <div className="text-xs text-slate-500">
                                    Start: {new Date(parseInt(m.start_time)).toLocaleString()}<br />
                                    End: {new Date(parseInt(m.end_time)).toLocaleString()}
                                </div>
                                <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs uppercase ${m.status === 'scheduled' ? 'bg-blue-900 text-blue-200' : 'bg-yellow-900 text-yellow-200'}`}>
                                    {m.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-red-400">Delete Maintenance?</h3>
                        <p className="text-slate-300 mb-6">
                            Are you sure you want to remove this maintenance schedule?
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
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
