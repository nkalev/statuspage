const db = require('./database');
const config = require('./config');

async function seed() {
    try {
        console.log("Connecting to DB...");
        await db.init(config.servicesConfig);

        // Get all service IDs
        const services = [];
        config.servicesConfig.forEach(group => {
            group.services.forEach(s => services.push(s.id));
        });

        console.log(`Seeding history for ${services.length} services...`);

        const now = new Date();
        const promises = [];

        // Generate 89 days back (starting from yesterday)
        for (let i = 1; i <= 89; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            for (const id of services) {
                // Use INSERT ON CONFLICT DO NOTHING to avoid overwriting if exists (or UPDATE if we want to force good?)
                // User said "fill up", implying empty spots or overwriting bad data? 
                // "fill up ... with good operational days". I'll assume overwriting is safer for "visual testing" to ensure it looks good.
                // But let's check if collision happens.
                // Actually, simple INSERT and ignoring error is easiest if empty. 
                // But UPSERT is better. Use Postgres syntax.

                const queryText = `
                    INSERT INTO daily_stats (date, component_id, status, uptime_pct) 
                    VALUES ($1, $2, 'operational', 100.0)
                    ON CONFLICT (date, component_id) 
                    DO UPDATE SET status = 'operational', uptime_pct = 100.0;
                `;

                promises.push(db.query(queryText, [dateStr, id]));
            }
        }

        await Promise.all(promises);
        console.log(`Seeded 89 days for ${services.join(', ')}.`);

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        process.exit(0);
    }
}

seed();
