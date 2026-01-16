const express = require('express');
const { ProbeReportSchema, MaintenancePostSchema } = require('../validation');
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

function createRouter(config, db, statusService) {
    const router = express.Router();

    // AWS SES Setup
    let sesClient = null;
    if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
        sesClient = new SESClient({
            region: config.AWS_REGION,
            credentials: {
                accessKeyId: config.AWS_ACCESS_KEY_ID,
                secretAccessKey: config.AWS_SECRET_ACCESS_KEY
            }
        });
    }

    // Helper: Send Email
    async function sendEmail(toAddresses, subject, bodyVal) {
        if (!sesClient) {
            console.log(`[SIMULATION] Sending Email to [${toAddresses.length} recipients]`);
            return;
        }
        try {
            const command = new SendEmailCommand({
                Source: config.SES_SOURCE_EMAIL,
                Destination: { ToAddresses: toAddresses },
                Message: {
                    Subject: { Data: subject },
                    Body: { Text: { Data: bodyVal } }
                }
            });
            await sesClient.send(command);
        } catch (err) {
            console.error("Failed to send SES email:", err);
        }
    }

    // GET /api/config
    router.get('/config', (req, res) => {
        res.json(config.servicesConfig);
    });

    // GET /api/status - Public Status
    router.get('/status', (req, res) => {
        res.json(statusService.getAllStatus());
    });

    // GET /api/incidents/history
    router.get('/incidents/history', async (req, res) => {
        try {
            const incidents = await db.getResolvedIncidents();
            res.json(incidents);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/incidents/history/clear
    router.delete('/incidents/history/clear', async (req, res) => {
        // Open for testing as requested, or check for specific header if needed later.
        // For now, allowing public access for testing purposes per user request.
        try {
            await db.clearResolvedIncidents();
            res.json({ success: true, message: 'History cleared' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/check - Probe Report
    router.post('/check', (req, res) => {
        if (req.headers['x-api-key'] !== config.API_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const validation = ProbeReportSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid payload', details: validation.error.errors });
        }

        const { region, results } = validation.data;

        Object.keys(results).forEach(id => {
            statusService.updateComponentStatus(id, region, results[id].status);
        });

        res.json({ success: true });
    });

    // POST /api/maintenance/schedule
    router.post('/maintenance/schedule', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const validation = MaintenancePostSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid payload', details: validation.error.errors });
        }

        const { title, description, start_time, end_time, status } = validation.data;

        try {
            await db.scheduleMaintenance({ title, description, start_time, end_time, status: status || 'scheduled' });

            // Notify
            const subscribers = await db.getVerifiedSubscribers();
            if (subscribers.length > 0) {
                const subject = `Scheduled Maintenance: ${title}`;
                const body = `Santiment Status Update:\n\n${description}\n\nStart: ${new Date(start_time).toUTCString()}\nEnd: ${new Date(end_time).toUTCString()}\n\nCheck status.santiment.net for updates.`;
                await sendEmail(subscribers, subject, body);
            }

            res.json({ success: true, message: 'Maintenance scheduled' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/maintenance/active
    router.get('/maintenance/active', async (req, res) => {
        try {
            const maintenance = await db.getActiveMaintenance();
            res.json(maintenance);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/maintenance/:id
    router.delete('/maintenance/:id', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        try {
            await db.deleteMaintenance(req.params.id);
            res.json({ success: true, message: 'Maintenance deleted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/subscribe
    router.post('/subscribe', async (req, res) => {
        const { email, type, entity_id } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        try {
            await db.addSubscriber(email, type || 'global', entity_id || 0);
            res.json({ success: true, message: 'Subscribed successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/admin/subscribers
    router.get('/admin/subscribers', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        try {
            const subscribers = await db.getAllSubscribers();
            res.json(subscribers);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/admin/subscribers/:email
    router.delete('/admin/subscribers/:email', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        try {
            await db.deleteSubscriber(req.params.email);
            res.json({ success: true, message: 'Subscriber removed' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/admin/incidents
    router.post('/admin/incidents', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const { component_id, title, status, description, update_text } = req.body;
        // Accept either description or update_text
        const desc = description || '';
        const initUpdate = update_text || description || ''; // Use description as initial update if update_text missing

        if (!component_id || !title || !status) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        try {
            const id = await db.createIncident(component_id, title, status, desc, initUpdate);
            // Also update component status immediately
            if (status !== 'resolved') {
                statusService.setIncidentStatus(component_id, status);
            }
            res.json({ success: true, id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/admin/incidents/:id', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        try {
            await db.deleteIncident(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/admin/incidents/:id/update
    router.post('/admin/incidents/:id/update', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const { update_text, status } = req.body;
        const incidentId = req.params.id;
        try {
            const updatedIncident = await db.updateIncident(incidentId, update_text, status);

            // If resolved, immediately recover the component status to operational (or fallback to probe status)
            if (updatedIncident) {
                statusService.setIncidentStatus(updatedIncident.component_id, status);
            }

            // Notify subscribers involved with this incident
            const subscribers = await db.getSubscribersForEntity('incident', incidentId);
            if (subscribers.length > 0) {
                const subject = `Incident Update: Status ${status}`;
                const body = `Update for incident #${incidentId}:\n\nStatus: ${status}\nMessage: ${update_text}\n\nVisit status page for more info.`;
                await sendEmail(subscribers, subject, body);
            }

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/incidents/active
    router.get('/incidents/active', async (req, res) => {
        try {
            const incidents = await db.getOpenIncidents();
            res.json(incidents);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/admin/config
    router.post('/admin/config', async (req, res) => {
        if (req.headers['x-admin-key'] !== config.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { ServicesConfigSchema } = require('../validation');
        const validation = ServicesConfigSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid configuration', details: validation.error.errors });
        }

        try {
            // Write to disk
            const fs = require('fs/promises');
            const path = require('path');
            const configPath = path.join(__dirname, '../services.json');

            await fs.writeFile(configPath, JSON.stringify(validation.data, null, 4));

            // Reload in-memory
            statusService.reloadConfig(validation.data);

            res.json({ success: true, message: 'Configuration saved and reloaded' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

module.exports = createRouter;
