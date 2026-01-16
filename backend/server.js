const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./database');
const StatusService = require('./services/status');
const ProbeService = require('./services/probe');
const createApiRouter = require('./routes/api');

async function startServer() {
    // 1. Determine Mode First
    if (config.PROBE_MODE) {
        // ==========================
        // PROBE MODE
        // ==========================
        console.log(`[Mode] Starting PROBE Service (Region: ${config.REGION})`);

        const probeService = new ProbeService(config);
        probeService.start();

    } else {
        // ==========================
        // CENTRAL API MODE
        // ==========================
        // Initialize Database (only needed for central API)
        try {
            await db.init(config.servicesConfig);
            console.log('[Init] Database initialized and connected.');
        } catch (err) {
            console.error('[Init] FATAL: Database initialization failed:', err);
            process.exit(1);
        }

        console.log(`[Mode] Starting CENTRAL API Service`);

        const app = express();

        // Middleware
        app.use(cors());
        app.use(express.json());

        // Rate Limiter
        const limiter = rateLimit({
            windowMs: 60 * 1000,
            max: 300,
            standardHeaders: true,
            legacyHeaders: false,
        });
        app.use(limiter);

        // Services
        const statusService = new StatusService(config);
        statusService.init();
        await statusService.hydrateHistory();

        // Routes
        app.use('/api', createApiRouter(config, db, statusService));

        // Start Server
        app.listen(config.PORT, () => {
            console.log(`[Server] Listening on port ${config.PORT}`);
        });

        // Background Jobs
        // 1. Data Retention (Daily)
        db.purgeOldData();
        setInterval(() => {
            db.purgeOldData().catch(err => console.error("[Job] Retention purge failed:", err));
        }, 24 * 60 * 60 * 1000);
    }
}

// Start
startServer().catch(err => {
    console.error("[Boot] Uncaught error:", err);
    process.exit(1);
});
