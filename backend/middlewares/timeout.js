/**
 * Request Timeout Middleware
 * Automatically terminates and responds to requests that exceed max processing duration.
 */

const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 20000; // 20 seconds

const requestTimeout = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
    return (req, res, next) => {
        // Set HTTP socket timeout
        req.setTimeout(timeoutMs);
        res.setTimeout(timeoutMs);

        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(504).json({
                    success: false,
                    message: 'Request timed out. The server took too long to respond.',
                    code: 'GATEWAY_TIMEOUT',
                    timeoutMs,
                });
            }
        }, timeoutMs);

        // Clear timer when response finishes
        res.on('finish', () => clearTimeout(timer));
        res.on('close', () => clearTimeout(timer));

        next();
    };
};

module.exports = requestTimeout;
