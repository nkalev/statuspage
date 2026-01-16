const axios = require('axios');
const http = require('http');
const https = require('https');

class ProbeService {
    constructor(config) {
        this.config = config;
        this.httpAgent = new http.Agent({ keepAlive: true, maxHeaderSize: 32768 });
        this.httpsAgent = new https.Agent({ keepAlive: true, maxHeaderSize: 32768 });
        this.consecutiveFailures = {};
    }

    start() {
        console.log(`[ProbeService] Starting in region: ${this.config.REGION}`);

        this.config.servicesConfig.forEach(group => {
            group.services.forEach(service => {
                // Determine interval (default 30s)
                const intervalMs = (service.interval || 30) * 1000;

                // Jitter startup to prevent thundering herd
                const delay = Math.random() * 5000;

                setTimeout(() => {
                    this.runCheck(service); // Run immediately
                    setInterval(() => this.runCheck(service), intervalMs);
                }, delay);

                console.log(`[ProbeService] Scheduled ${service.id} every ${intervalMs}ms`);
            });
        });
    }

    async runCheck(service) {
        let status = 'operational';
        let latency = 0;
        let error = null;

        const start = Date.now();
        try {
            const method = service.probe_config?.method || 'GET';
            const url = service.url;
            const timeout = service.probe_config?.timeout || 10000;
            const headers = service.probe_config?.headers || {};
            const data = service.probe_config?.body || null;

            if (!url) {
                // Skip service groups or headers
                return;
            }

            await axios({
                method,
                url,
                headers,
                data,
                timeout,
                validateStatus: null, // Capture all status codes
                httpAgent: this.httpAgent,
                httpsAgent: this.httpsAgent,
                maxRedirects: 5
            });

            latency = Date.now() - start;

            // Success - Reset failures
            if (this.consecutiveFailures[service.id] > 0) {
                console.log(`[ProbeService] ${service.id} recovered after ${this.consecutiveFailures[service.id]} failures.`);
            }
            this.consecutiveFailures[service.id] = 0;

        } catch (err) {
            latency = Date.now() - start;

            // Increment failures
            this.consecutiveFailures[service.id] = (this.consecutiveFailures[service.id] || 0) + 1;
            const failures = this.consecutiveFailures[service.id];

            if (failures >= 3) {
                status = 'outage';
                error = err.message;
                console.log(`[ProbeService] Check failed for ${service.id}: ${err.message} (Attempt ${failures})`);
            } else {
                console.log(`[ProbeService] ${service.id} glitch detected: ${err.message} (Attempt ${failures}/3) - Masking as Operational`);
                status = 'operational';
                error = null; // Mask error
            }
        }

        // Report
        this.reportResult(service.id, { status, latency, error });
    }

    async reportResult(id, result) {
        const payload = {
            region: this.config.REGION,
            results: {
                [id]: result
            }
        };

        try {
            await axios.post(`${this.config.CENTRAL_API_URL}/api/check`, payload, {
                headers: { 'x-api-key': this.config.API_SECRET }
            });
            // console.log(`[ProbeService] Reported ${id}: ${result.status}`);
        } catch (err) {
            console.error(`[ProbeService] Failed to report ${id}: ${err.message}`);
        }
    }
}

module.exports = ProbeService;
