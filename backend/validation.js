const { z } = require('zod');

// Schema for services.json
const ServicesConfigSchema = z.array(z.object({
    id: z.string(),
    name: z.string(),
    services: z.array(z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        interval: z.number().optional(),
        probe_config: z.object({
            method: z.string().optional(),
            headers: z.record(z.string()).optional(),
            body: z.any().optional(),
            expected_status: z.number().optional(),
            timeout: z.number().optional()
        }).optional()
    }))
}));

// Schema for POST /api/check
const ProbeReportSchema = z.object({
    region: z.string(),
    results: z.record(z.object({
        status: z.enum(['operational', 'degraded', 'outage', 'maintenance']),
        latency: z.number().optional(),
        error: z.string().nullable().optional()
    }))
});

// Schema for POST /api/maintenance/schedule
const MaintenancePostSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    start_time: z.number().or(z.string().regex(/^\d+$/)), // Allow timestamp strings
    end_time: z.number().or(z.string().regex(/^\d+$/)),
    status: z.enum(['scheduled', 'in_progress', 'completed'])
});

module.exports = {
    ServicesConfigSchema,
    ProbeReportSchema,
    MaintenancePostSchema
};
