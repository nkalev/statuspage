import React, { useState } from 'react';
import { X, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export default function SubscribeModal({ onClose, entity = null }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState(null); // 'success' | 'error' | null
    const [loading, setLoading] = useState(false);

    // Contextual Title
    const title = entity
        ? `Subscribe to ${entity.type === 'incident' ? 'Incident' : 'Maintenance'} Updates`
        : 'Subscribe to Updates';

    // Contextual description
    const desc = entity?.title
        ? `Get notified about: ${entity.title}`
        : 'Get notified about incidents and scheduled maintenance.';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setStatus(null);

        try {
            await api.subscribe(email, entity?.type, entity?.id);
            setStatus('success');
            setEmail('');
        } catch (err) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <Mail size={32} className="modal-icon" />
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="mt-2 text-sm text-gray-400">{desc}</p>
                </div>

                {status === 'success' ? (
                    <div className="subscribe-success">
                        <CheckCircle size={48} className="success-icon" />
                        <p>Successfully subscribed!</p>
                        <p className="success-detail">You'll receive updates at your email address.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="subscribe-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        {status === 'error' && (
                            <div className="subscribe-error">
                                <AlertCircle size={16} />
                                <span>Failed to subscribe. Please try again.</span>
                            </div>
                        )}

                        <button type="submit" className="btn-subscribe" disabled={loading}>
                            {loading ? 'Subscribing...' : 'Subscribe'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
