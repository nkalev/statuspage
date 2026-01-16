const db = require('./database');
const config = require('./config');

async function fix() {
    try {
        console.log("Connecting to DB...");
        // db.init expects the config object
        await db.init(config.servicesConfig);

        console.log("Resetting Sanbase stats...");
        // Reset status to 'operational' (0) and uptime to 100% for today
        const dateStr = new Date().toISOString().split('T')[0];
        const res = await db.query(
            "UPDATE daily_stats SET status = 'operational', uptime_pct = 100 WHERE component_id = 'sanbase' AND date = $1",
            [dateStr]
        );

        console.log(`Updated ${res.rowCount} rows.`);
        console.log("Sanbase stats reset to operational successfully.");
    } catch (err) {
        console.error("Failed to reset stats:", err);
    } finally {
        process.exit(0);
    }
}

fix();
