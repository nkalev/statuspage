const API_BASE = '/api';

export const api = {
    getConfig: () => fetch(`${API_BASE}/config`).then(r => r.json()),
    getStatus: () => fetch(`${API_BASE}/status`).then(r => r.json()),

    // Auth - just saves to localstorage, backend checks header
    getAuthHeader: () => ({
        'x-admin-key': localStorage.getItem('adminKey') || ''
    }),

    // Public
    getActiveMaintenance: () => fetch(`${API_BASE}/maintenance/active`).then(r => r.json()),

    getPastIncidents: () => fetch(`${API_BASE}/incidents/history`).then(r => r.json()),

    clearResolvedIncidents: () => fetch(`${API_BASE}/incidents/history/clear`, { method: 'DELETE' }).then(r => r.json()),

    subscribe: (email, type, entity_id) => fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type, entity_id })
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    // Admin
    scheduleMaintenance: (data) => fetch(`${API_BASE}/maintenance/schedule`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': localStorage.getItem('adminKey') || ''
        },
        body: JSON.stringify(data)
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    deleteMaintenance: (id) => fetch(`${API_BASE}/maintenance/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': localStorage.getItem('adminKey') || '' }
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    getSubscribers: () => fetch(`${API_BASE}/admin/subscribers`, {
        headers: { 'x-admin-key': localStorage.getItem('adminKey') || '' }
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    deleteSubscriber: (email) => fetch(`${API_BASE}/admin/subscribers/${email}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': localStorage.getItem('adminKey') || '' }
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    // Incidents
    createIncident: (data) => fetch(`${API_BASE}/admin/incidents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': localStorage.getItem('adminKey') || ''
        },
        body: JSON.stringify(data)
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    updateIncident: (id, data) => fetch(`${API_BASE}/admin/incidents/${id}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': localStorage.getItem('adminKey') || ''
        },
        body: JSON.stringify(data)
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    deleteIncident: (id) => fetch(`${API_BASE}/admin/incidents/${id}`, {
        method: 'DELETE',
        headers: {
            'x-admin-key': localStorage.getItem('adminKey') || ''
        }
    }).then(async r => {
        if (!r.ok) throw await r.json();
        return r.json();
    }),

    adminUpdateConfig: async (config) => {
        const res = await fetch(`${API_BASE}/admin/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': localStorage.getItem('adminKey') || '' // Using localStorage.getItem('adminKey') as ADMIN_KEY is not defined
            },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    },

    getActiveIncidents: () => fetch(`${API_BASE}/incidents/active`).then(r => r.json()),
};
