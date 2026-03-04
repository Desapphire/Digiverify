/**
 * Audit Controller — Query audit logs.
 */

const auditService = require('../services/auditService');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/audit
 */
const getAuditLogs = catchAsync(async (req, res) => {
    const { actorWallet, entityId, actionType, startDate, endDate, limit, offset } = req.query;

    const logs = await auditService.queryLogs({
        actorWallet,
        entityId,
        actionType,
        startDate,
        endDate,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
    });

    return res.status(200).json({
        success: true,
        data: logs,
        count: logs.length,
    });
});

module.exports = { getAuditLogs };
