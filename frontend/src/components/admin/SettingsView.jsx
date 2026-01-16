import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Trash2, UserCheck, UserX } from 'lucide-react';

export default function SettingsView() {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingSubscriber, setDeletingSubscriber] = useState(null);

    const loadSubscribers = async () => {
        try {
            const data = await api.getSubscribers();
            setSubscribers(data);
        } catch (err) {
            setError('Failed to load subscribers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (email) => {
        setDeletingSubscriber(email);
    };

    const executeDelete = async () => {
        if (!deletingSubscriber) return;
        try {
            await api.deleteSubscriber(deletingSubscriber);
            setSubscribers(subscribers.filter(s => s.email !== deletingSubscriber));
            setDeletingSubscriber(null);
        } catch (err) {
            alert('Failed to delete subscriber');
        }
    };

    useEffect(() => {
        loadSubscribers();
    }, []);

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className="max-w-4xl relative">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {/* Subscriber Management */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-blue-400">Subscriber Management</h2>
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Email Subscribers ({subscribers.length})</h3>
                        <button onClick={loadSubscribers} className="text-sm text-blue-400 hover:text-blue-300">Refresh</button>
                    </div>

                    {subscribers.length === 0 ? (
                        <p className="text-slate-500 italic">No subscribers yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                        <th className="py-2">Email</th>
                                        <th className="py-2">Status</th>
                                        <th className="py-2">Joined</th>
                                        <th className="py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscribers.map((sub) => (
                                        <tr key={sub.email} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                                            <td className="py-3 pr-4">{sub.email}</td>
                                            <td className="py-3">
                                                {sub.verified ? (
                                                    <span className="flex items-center gap-1 text-green-400 text-sm">
                                                        <UserCheck size={14} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-yellow-500 text-sm">
                                                        <UserX size={14} /> Unverified
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-sm text-slate-500">
                                                {new Date(parseInt(sub.created_at)).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => confirmDelete(sub.email)}
                                                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors"
                                                    title="Remove Subscriber"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* Delete Confirmation Modal */}
            {deletingSubscriber && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-red-500">Remove Subscriber?</h3>
                        <p className="text-slate-300 mb-6">
                            Are you sure you want to remove <span className="text-white font-semibold">{deletingSubscriber}</span>?
                            They will no longer receive incident updates.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingSubscriber(null)}
                                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
