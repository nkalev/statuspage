const servicesConfig = require('./services.json');
const { ServicesConfigSchema } = require('./validation');

// Validate Startup Config
try {
    ServicesConfigSchema.parse(servicesConfig);
    console.log("[Config] Services configuration validation successful.");
} catch (err) {
    console.error("[Config] FATAL: Configuration validation failed:", err.errors);
    process.exit(1);
}

module.exports = {
    PORT: process.env.PORT || 3000,
    PROBE_MODE: process.env.PROBE_MODE === 'true',
    REGION: process.env.REGION || 'Local',
    CENTRAL_API_URL: process.env.CENTRAL_API_URL || 'http://localhost:3000',
    API_SECRET: process.env.API_SECRET || 'dev-secret',
    ADMIN_SECRET: process.env.ADMIN_SECRET || 'admin-secret-secure',

    // AWS
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    SES_SOURCE_EMAIL: process.env.SES_SOURCE_EMAIL || 'support@santiment.net',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,

    // Data
    servicesConfig
};
