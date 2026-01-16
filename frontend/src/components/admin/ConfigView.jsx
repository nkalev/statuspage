import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ConfigView() {
    const [configJson, setConfigJson] = useState('');
    const [originalConfig, setOriginalConfig] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getConfig();
            const formatted = JSON.stringify(data, null, 4);
            setConfigJson(formatted);
            setOriginalConfig(formatted);
        } catch (err) {
            setError('Failed to load configuration');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(null);

        try {
            // Validate JSON client-side first
            let parsed;
            try {
                parsed = JSON.parse(configJson);
            } catch (e) {
                setError('Invalid JSON syntax');
                return;
            }

            await api.adminUpdateConfig(parsed);
            setSuccess('Configuration saved and reloaded successfully');
            setOriginalConfig(configJson);
        } catch (err) {
            setError(err.message || 'Failed to save configuration');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading configuration...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h2>
                    <p className="text-gray-500 dark:text-gray-400">Edit services.json directly. Changes apply immediately.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadConfig}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                        <RefreshCw size={18} />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={configJson === originalConfig}
                        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${configJson === originalConfig
                            ? 'bg-indigo-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        <Save size={18} />
                        Save Configuration
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {success}
                </div>
            )}

            <div className="relative">
                <textarea
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    className="w-full h-[600px] font-mono text-sm p-4 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{ backgroundColor: '#0f172a', color: '#f3f4f6' }}
                    spellCheck="false"
                />
            </div>
        </div>
    );
}
