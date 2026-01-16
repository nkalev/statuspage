const db = require('./database');
const config = require('./config');

async function seedIssues() {
    try {
        console.log("Connecting to DB...");
        await db.init(config.servicesConfig);

        const targets = ['sanbase', 'academy'];
        const statuses = ['outage', 'maintenance', 'degraded'];

        console.log(`Seeding random issues for: ${targets.join(', ')}`);

        // Seed 5 random days for each target
        for (const id of targets) {
            const usedDays = new Set();
            for (let i = 0; i < 5; i++) {
                let daysAgo;
                do {
                    daysAgo = Math.floor(Math.random() * 88) + 1; // 1 to 89
                } while (usedDays.has(daysAgo));
                usedDays.add(daysAgo);

                const d = new Date();
                d.setDate(d.getDate() - daysAgo);
                const dateStr = d.toISOString().split('T')[0];

                const status = statuses[Math.floor(Math.random() * statuses.length)];

                // Set uptime based on status
                let uptime = 100.0;
                if (status === 'outage') uptime = 0.0;
                if (status === 'degraded') uptime = 75.0;
                if (status === 'maintenance') uptime = 100.0; // Maintenance usually doesn't hit uptime score but has status

                // Update
                const res = await db.query(
                    "UPDATE daily_stats SET status = $1, uptime_pct = $2 WHERE component_id = $3 AND date = $4",
                    [status, uptime, id, dateStr]
                );

                console.log(`[${id}] Set ${dateStr} to ${status} (uptime ${uptime}%)`);
            }
        }

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        process.exit(0);
    }
}

seedIssues();
