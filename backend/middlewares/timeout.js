/**
 * Request Timeout Middleware
 * Automatically terminates and responds to requests that exceed max processing duration.
 */

const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 20000; // 20 seconds

const requestTimeout = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
    return (req, res, next) => {
        let timer = null;

        const startTimer = (ms) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                if (!res.headersSent) {
                    res.status(504).json({
                        success: false,
                        message: 'Request timed out. The server took too long to respond.',
                        code: 'GATEWAY_TIMEOUT',
                        timeoutMs: ms,
                    });
                }
            }, ms);
        };

        // Expose helper on res to extend timeout for on-chain block mining
        res.extendTimeout = (ms = 300000) => {
            req.setTimeout(ms);
            res.setTimeout(ms);
            startTimer(ms);
        };

        req.setTimeout(timeoutMs);
        res.setTimeout(timeoutMs);
        startTimer(timeoutMs);

        // Clear timer when response finishes
        res.on('finish', () => { if (timer) clearTimeout(timer); });
        res.on('close', () => { if (timer) clearTimeout(timer); });

        next();
    };
};

module.exports = requestTimeout;
