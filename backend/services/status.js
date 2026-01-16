const db = require('../database');

class StatusService {
    constructor(config) {
        this.config = config;
        this.services = {};
    }

    init() {
        this.services = this.initializeServiceState(this.config.servicesConfig);
        console.log("[StatusService] In-memory store initialized.");
    }

    initializeServiceState(servicesConfig) {
        const serviceState = {};
        servicesConfig.forEach(group => {
            group.services.forEach(service => {
                serviceState[service.id] = {
                    status: 'operational',
                    incidents: [],
                    regions: {},
                    history: [],
                    activeIncidentStatus: null
                };
            });
        });
        return serviceState;
    }

    reloadConfig(newConfig) {
        console.log('[StatusService] Reloading configuration...');
        this.config.servicesConfig = newConfig;

        const newServicesState = this.initializeServiceState(newConfig);

        for (const [id, service] of Object.entries(newServicesState)) {
            if (this.services[id]) {
                newServicesState[id].status = this.services[id].status;
                newServicesState[id].history = this.services[id].history;
            }
        }

        this.services = newServicesState;
        console.log('[StatusService] Configuration reloaded.');
    }

    async hydrateHistory() {
        // Ensure today has a record for every service
        const initPromises = [];
        Object.keys(this.services).forEach(id => {
            // Priority 0 (Operational) will create if missing, but not overwrite if higher priority exists
            initPromises.push(db.updateDailyStat(id, 'operational').catch(err => console.error(`[Init] Failed to init stat for ${id}`, err)));
        });
        await Promise.all(initPromises);

        const promises = [];
        Object.keys(this.services).forEach(id => {
            promises.push(db.getComponentHistory(id).then(h => {
                if (this.services[id]) {
                    this.services[id].history = h;
                }
            }));
        });
        await Promise.all(promises);
        console.log("[StatusService] History hydrated from DB.");
        await this.syncActiveIncidents();
    }

    async syncActiveIncidents() {
        try {
            const incidents = await db.getOpenIncidents();
            incidents.forEach(inc => {
                if (this.services[inc.component_id]) {
                    this.services[inc.component_id].activeIncidentStatus = inc.status;
                    // Trigger recalculation to ensure initial status is correct
                    this.recalculateStatus(inc.component_id);
                }
            });
            console.log(`[StatusService] Synced ${incidents.length} active incidents.`);
        } catch (err) {
            console.error("[StatusService] Failed to sync active incidents:", err);
        }
    }

    updateComponentStatus(id, region, newRegionStatus) {
        if (!this.services[id]) return;

        if (region) {
            this.services[id].regions[region] = newRegionStatus;
        }

        this.recalculateStatus(id);
    }

    setIncidentStatus(id, status) {
        if (!this.services[id]) return;
        // If resolved, we clear the active incident status (set to null or operational)
        // Actually, if status is 'resolved', we treat it as no active incident affecting status.
        this.services[id].activeIncidentStatus = (status === 'resolved') ? null : status;
        this.recalculateStatus(id);
    }

    recalculateStatus(id) {
        if (!this.services[id]) return;

        const regions = Object.values(this.services[id].regions);
        const priorities = { 'outage': 3, 'degraded': 2, 'maintenance': 1, 'operational': 0 };

        let derivedStatus = 'operational';
        if (regions.includes('outage')) derivedStatus = 'outage';
        else if (regions.includes('degraded')) derivedStatus = 'degraded';
        else if (regions.includes('maintenance')) derivedStatus = 'maintenance';

        // Check active incident override
        const incidentStatus = this.services[id].activeIncidentStatus;

        let finalStatus = derivedStatus;
        if (incidentStatus && priorities[incidentStatus] > priorities[derivedStatus]) {
            finalStatus = incidentStatus;
        }

        if (this.services[id].status !== finalStatus) {
            console.log(`[StatusChange] ${id}: ${this.services[id].status} -> ${finalStatus} (Regions: ${derivedStatus}, Incident: ${incidentStatus})`);
            this.services[id].status = finalStatus;
            db.updateDailyStat(id, finalStatus).catch(err => console.error(err));
        }
    }

    getAllStatus() {
        const response = {};
        this.config.servicesConfig.forEach(group => {
            const groupData = {
                id: group.id,
                name: group.name,
                services: []
            };
            group.services.forEach(service => {
                const s = this.services[service.id];
                if (s) {
                    groupData.services.push({
                        id: service.id,
                        name: service.name,
                        url: service.url,
                        status: s.status,
                        history: s.history,
                        regions: s.regions
                    });
                }
            });
            response[group.id] = groupData;
        });
        return response;
    }
}

module.exports = StatusService;
