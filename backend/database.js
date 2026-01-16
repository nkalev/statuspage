const { Pool } = require('pg');

// Config
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://santiment:securepass@localhost:5432/statusdb';

const pool = new Pool({
    connectionString: DATABASE_URL,
});

function query(text, params) {
    return pool.query(text, params);
}

function init(servicesConfig) {
    return new Promise(async (resolve, reject) => {
        try {
            // Wait for DB to be ready (naive retry logic could be added here, but Docker restart policy helps)

            // Daily Stats
            await query(`CREATE TABLE IF NOT EXISTS daily_stats (
                date TEXT, 
                component_id TEXT, 
                status TEXT, 
                uptime_pct DOUBLE PRECISION,
                PRIMARY KEY (date, component_id)
            )`);

            // Incidents
            await query(`CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                component_id TEXT,
                title TEXT,
                meta TEXT,
                update_text TEXT,
                description TEXT,
                created_at BIGINT,
                resolved_at BIGINT
            )`);

            // Migration for description
            try {
                await query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS description TEXT`);
            } catch (e) { /* ignore if exists */ }

            // Incident Updates History
            await query(`CREATE TABLE IF NOT EXISTS incident_updates (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER,
                message TEXT,
                status TEXT,
                created_at BIGINT
            )`);

            // Maintenance Table
            await query(`CREATE TABLE IF NOT EXISTS maintenance_posts (
                id SERIAL PRIMARY KEY,
                title TEXT,
                description TEXT,
                start_time BIGINT,
                end_time BIGINT,
                status TEXT,
                created_at BIGINT
            )`);

            // Subscribers Table (Updated for Context)
            // Note: We use a composite key or just allow duplicates for different entities? 
            // Let's use a flexible schema: id, email, type ('global', 'incident', 'maintenance'), entity_id, created_at
            await query(`CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                email TEXT,
                type TEXT,
                entity_id INTEGER,
                created_at BIGINT
            )`);
            // Add unique constraint to prevent duplicate subs for same entity
            // await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_unique ON subscriptions (email, type, entity_id)`);

            const res = await query("SELECT count(*) as count FROM daily_stats");
            if (parseInt(res.rows[0].count) === 0) {
                console.log("Database empty. Seeding 5 years of history...");
                await seedHistory(servicesConfig);
            } else {
                console.log("Database already initialized.");
            }
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}
// ... (skip lines) ...
async function updateIncident(id, update_text, status) {
    const now = Date.now();

    // Add to history
    await query(
        `INSERT INTO incident_updates (incident_id, message, status, created_at) VALUES ($1, $2, $3, $4)`,
        [id, update_text, status, now]
    );

    // If status is resolved, set resolved_at
    // If status is resolved, set resolved_at
    if (status === 'resolved') {
        const res = await query(
            `UPDATE incidents SET update_text = $1, status = $2, resolved_at = $3 WHERE id = $4 RETURNING *`,
            [update_text, status, now, id]
        );
        return res.rows[0];
    } else {
        const res = await query(
            `UPDATE incidents SET update_text = $1, status = $2 WHERE id = $3 RETURNING *`,
            [update_text, status, id]
        );
        return res.rows[0];
    }
}

async function seedHistory(servicesConfig) {
    // Extract all IDs from config
    const components = [];
    if (servicesConfig) {
        servicesConfig.forEach(g => {
            g.services.forEach(s => components.push(s.id));
        });
    }

    if (components.length === 0) {
        console.log("No components to seed.");
        return;
    }

    const now = new Date();
    // Use transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Generate 5 years (approx 1825 days)
        for (let i = 0; i < 1825; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            for (const comp of components) {
                // 99.5% operational
                let status = 'operational';
                let uptime = 100.0;

                const rand = Math.random();
                if (rand > 0.998) {
                    status = 'outage';
                    uptime = 0.0;
                } else if (rand > 0.99) {
                    status = 'degraded';
                    uptime = 80.0;
                }

                await client.query(
                    "INSERT INTO daily_stats (date, component_id, status, uptime_pct) VALUES ($1, $2, $3, $4)",
                    [dateStr, comp, status, uptime]
                );
            }
        }
        await client.query('COMMIT');
        console.log("Seeding complete.");
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

async function getComponentHistory(componentId, limit = 90) {
    const res = await query(
        `SELECT date, status FROM daily_stats 
         WHERE component_id = $1 
         ORDER BY date DESC 
         LIMIT $2`,
        [componentId, limit]
    );

    // Map to expected format
    return res.rows.map((row, index) => ({
        date: index, // Frontend expects an index logic currently? Or just date? Original code kept index.
        status: row.status
    }));
}

async function updateDailyStat(componentId, status) {
    const dateStr = new Date().toISOString().split('T')[0];
    const priority = { 'outage': 3, 'degraded': 2, 'maintenance': 1, 'operational': 0 };

    const res = await query("SELECT status FROM daily_stats WHERE date = $1 AND component_id = $2", [dateStr, componentId]);

    if (res.rows.length === 0) {
        await query("INSERT INTO daily_stats (date, component_id, status, uptime_pct) VALUES ($1, $2, $3, $4)", [dateStr, componentId, status, 100.0]);
    } else {
        const currentStatus = res.rows[0].status;
        const currentP = priority[currentStatus] || 0;
        const newP = priority[status] || 0;
        if (newP > currentP) {
            await query("UPDATE daily_stats SET status = $1 WHERE date = $2 AND component_id = $3", [status, dateStr, componentId]);
        }
    }
}

async function scheduleMaintenance(post) {
    const { title, description, start_time, end_time, status } = post;
    const created_at = Date.now();
    const res = await query(
        `INSERT INTO maintenance_posts (title, description, start_time, end_time, status, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [title, description, start_time, end_time, status, created_at]
    );
    return res.rows[0].id;
}

async function getActiveMaintenance() {
    const now = Date.now();
    const res = await query(
        `SELECT * FROM maintenance_posts WHERE end_time > $1 ORDER BY start_time ASC`,
        [now]
    );
    return res.rows;
}

async function addSubscriber(email, type = 'global', entityId = 0) {
    const created_at = Date.now();
    // Check if exists
    const check = await query(
        `SELECT id FROM subscriptions WHERE email=$1 AND type=$2 AND entity_id=$3`,
        [email, type, entityId]
    );
    if (check.rows.length === 0) {
        await query(
            `INSERT INTO subscriptions (email, type, entity_id, created_at) VALUES ($1, $2, $3, $4)`,
            [email, type, entityId, created_at]
        );
    }
}

async function getSubscribersForEntity(type, entityId) {
    const res = await query(`SELECT email FROM subscriptions WHERE type = $1 AND entity_id = $2`, [type, entityId]);
    return res.rows.map(r => r.email);
}

// Keep global subscribers getter for legacy or admin purposes
async function getVerifiedSubscribers() {
    // For now, treat 'global' type as the main list, entity_id=0
    const res = await query(`SELECT email FROM subscriptions WHERE type = 'global'`);
    return res.rows.map(r => r.email);
}

async function getResolvedIncidents(limit = 5) {
    const now = Date.now();
    console.log(`[DB] Fetching resolved incidents. limit=${limit}, now=${now}`);

    try {
        // Limit lookback to 14 days
        const limitMs = 14 * 24 * 60 * 60 * 1000;
        const cutoff = now - limitMs;

        // 1. Fetch past maintenance
        const maintenanceRes = await query(
            `SELECT id, title, description, start_time, end_time, 'maintenance' as type FROM maintenance_posts WHERE end_time < $1 AND end_time > $2 ORDER BY end_time DESC LIMIT $3`,
            [now, cutoff, limit]
        );

        // 2. Fetch resolved incidents
        // Use 'description' column, fallback to update_text if null (legacy)
        const incidentsRes = await query(
            `SELECT id, title, COALESCE(description, update_text) as description, created_at as start_time, resolved_at as end_time, 'incident' as type FROM incidents WHERE status = 'resolved' AND resolved_at > $1 ORDER BY resolved_at DESC LIMIT $2`,
            [cutoff, limit]
        );

        // 3. Combine and sort by end_time descending
        const combined = [...maintenanceRes.rows, ...incidentsRes.rows]
            .sort((a, b) => {
                const tA = parseInt(a.end_time) || 0;
                const tB = parseInt(b.end_time) || 0;
                return tB - tA;
            })
            .slice(0, limit);

        console.log(`[DB] Returning ${combined.length} combined items`);
        return combined;
    } catch (err) {
        console.error("[DB] Error in getResolvedIncidents:", err);
        return [];
    }
}

async function purgeOldData(retentionDays = 365) {
    const now = new Date();
    now.setDate(now.getDate() - retentionDays);
    const cutoffDate = now.toISOString().split('T')[0];

    const res = await query("DELETE FROM daily_stats WHERE date < $1", [cutoffDate]);
    console.log(`[Data Retention] Purged ${res.rowCount} records older than ${cutoffDate}.`);
    return res.rowCount;
}

async function getAllSubscribers() {
    const res = await query(`SELECT * FROM subscriptions ORDER BY created_at DESC`);
    return res.rows;
}

async function deleteSubscriber(email) {
    // This wipes all subscriptions for an email
    await query(`DELETE FROM subscriptions WHERE email = $1`, [email]);
}

async function createIncident(component_id, title, status, description = '', update_text = '') {
    const created_at = Date.now();
    // usage: update_text often equals description initially, or is empty. 
    // We'll store description in 'description' and initial status in 'update_text'
    const res = await query(
        `INSERT INTO incidents (component_id, title, status, description, update_text, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [component_id, title, status, description, update_text, created_at]
    );
    return res.rows[0].id;
}



async function getOpenIncidents() {
    const res = await query(`SELECT * FROM incidents WHERE status != 'resolved' ORDER BY created_at DESC`);
    const incidents = res.rows;

    // Attach last 3 updates
    for (const inc of incidents) {
        const updatesRes = await query(
            `SELECT message, status, created_at FROM incident_updates WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 3`,
            [inc.id]
        );
        inc.updates = updatesRes.rows;
    }

    return incidents;
}

module.exports = {
    init,
    getComponentHistory,
    updateDailyStat,
    scheduleMaintenance,
    getActiveMaintenance,
    addSubscriber,
    getVerifiedSubscribers, // Legacy global
    getSubscribersForEntity, // New context
    getAllSubscribers,
    deleteSubscriber,
    getResolvedIncidents,
    createIncident,
    updateIncident,
    createIncident,

    getOpenIncidents,
    deleteMaintenance,
    clearResolvedIncidents,
    deleteIncident,
    deleteIncident,
    purgeOldData,
    query
};

async function deleteMaintenance(id) {
    await query(`DELETE FROM maintenance_posts WHERE id = $1`, [id]);
}

async function clearResolvedIncidents() {
    await query(`DELETE FROM incidents WHERE status = 'resolved'`);
    await query(`DELETE FROM maintenance_posts WHERE end_time < $1`, [Date.now()]);
}

async function deleteIncident(id) {
    await query(`DELETE FROM incident_updates WHERE incident_id = $1`, [id]);
    await query(`DELETE FROM incidents WHERE id = $1`, [id]);
}
