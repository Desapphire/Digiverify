/**
 * Server Entry Point — Squrify Land Registry Backend
 *
 * Production-ready Express server with:
 * - JWT wallet-based authentication
 * - RBAC middleware
 * - Rate limiting
 * - Helmet security headers
 * - Blockchain event listeners
 * - Graceful shutdown
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const { apiLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const { startEventListeners } = require('./events/eventListener');

// ── Route Imports ───────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const userRoutes = require('./routes/userRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const saleRoutes = require('./routes/saleRoutes');
const bankRoutes = require('./routes/bankRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ipfsRoutes = require('./routes/ipfsRoutes');

// ── Bootstrap ───────────────────────────────────────────
const app = express();

// ── Security ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ─────────────────────────────────────────────
if (!env.IS_PRODUCTION) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ── Rate Limiting ───────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Trust proxy (for correct IP behind reverse proxy) ───
app.set('trust proxy', 1);

// ── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ipfs', ipfsRoutes);

// ── Health Check ────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Squrify Land Registry API — Government-Grade Blockchain System',
        version: '2.0.0',
        network: 'Avalanche Fuji C-Chain (Testnet)',
        chainId: env.BLOCKCHAIN.chainId,
    });
});

// ── API Documentation Route ─────────────────────────────
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        endpoints: {
            auth: {
                'GET /api/auth/nonce/:walletAddress': 'Get nonce for wallet signing',
                'POST /api/auth/verify': 'Verify signature and get JWT',
                'POST /api/auth/refresh': 'Refresh access token',
                'GET /api/auth/me': 'Get current user (requires auth)',
            },
            onboarding: {
                'POST /api/onboarding/request-nonce': 'Request nonce for registration',
                'POST /api/onboarding/verify-signature': 'Verify signature for registration',
                'POST /api/onboarding/register': 'Register new user (Unified flow: name, email, password, wallet, birthdate)',
            },
            users: {
                'GET /api/users/profile': 'Get own profile',
                'POST /api/users/kyc': 'Submit KYC document hash',
                'PUT /api/users/:id/kyc/approve': 'Approve KYC (authority)',
                'PUT /api/users/:id/kyc/reject': 'Reject KYC (authority)',
                'PUT /api/users/face-id': 'Bind Face ID hash to user account',
            },
            properties: {
                'POST /api/properties': 'Register property (seller/authority)',
                'GET /api/properties/my': 'Get own properties',
                'GET /api/properties/search': 'Search properties',
                'GET /api/properties/:id': 'Get property by ID',
                'POST /api/properties/:id/documents': 'Upload property document',
                'GET /api/properties/:id/documents': 'Get property documents',
            },
            sales: {
                'POST /api/sales': 'Initiate sale (seller)',
                'GET /api/sales/my': 'Get own sales',
                'GET /api/sales/:id': 'Get sale details',
                'POST /api/sales/:id/sign': 'Sign sale (buyer/seller)',
                'POST /api/sales/:id/complete': 'Complete sale (authority)',
                'POST /api/sales/:id/cancel': 'Cancel sale (buyer/seller)',
            },
            bank: {
                'POST /api/bank/fund-block': 'Request fund block (buyer)',
                'PUT /api/bank/fund-block/:id/confirm': 'Confirm fund block (bank_admin)',
                'PUT /api/bank/fund-block/:id/release': 'Release funds (bank_admin)',
                'GET /api/bank/fund-block/transaction/:id': 'Get fund blocks for transaction',
            },
            admin: {
                'PUT /api/admin/property/:id/approve': 'Approve property (authority)',
                'POST /api/admin/sale/:id/approve': 'Approve sale (authority)',
                'POST /api/admin/sale/:id/reject': 'Reject sale (authority)',
                'PUT /api/admin/property/:id/encumbrance': 'Set/clear encumbrance (authority)',
                'POST /api/admin/property/freeze': 'Freeze property (court)',
                'POST /api/admin/property/reverse-freeze/:freezeOrderId': 'Reverse freeze order (court)',
                'POST /api/admin/property/force-transfer': 'Force-transfer ownership (court)',
                'PUT /api/admin/kyc/:id/approve': 'Approve KYC (authority)',
                'PUT /api/admin/kyc/:id/reject': 'Reject KYC (authority)',
                'GET /api/admin/recovery/pending': 'Get pending wallet recoveries',
                'PUT /api/admin/recovery/:id/verify': 'Verify identity for recovery',
                'PUT /api/admin/recovery/:id/complete': 'Complete wallet recovery',
                'PUT /api/admin/recovery/:id/reject': 'Reject wallet recovery',
                'PUT /api/admin/bank/fund-block/:id/confirm': 'Confirm fund block (bank_admin)',
                'PUT /api/admin/bank/fund-block/:id/release': 'Release funds (bank_admin)',
                'GET /api/admin/audit': 'Query audit logs (authority/court/admin)',
            },
        },
    });
});

// ── 404 Handler ─────────────────────────────────────────
app.use('{*path}', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
});

// ── Global Error Handler ────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Start blockchain event listeners
        try {
            startEventListeners();
        } catch (err) {
            console.warn('⚠️  Blockchain event listeners failed to start:', err.message);
        }

        const server = app.listen(env.PORT, () => {
            console.log(`\n🚀 Squrify Land Registry API`);
            console.log(`   Environment : ${env.NODE_ENV}`);
            console.log(`   Port        : ${env.PORT}`);
            console.log(`   Network     : Avalanche Fuji C-Chain`);
            console.log(`   Chain ID    : ${env.BLOCKCHAIN.chainId}`);
            console.log(`   API Docs    : http://localhost:${env.PORT}/api/docs\n`);
        });

        // ── Graceful Shutdown ─────────────────────────────────
        const shutdown = (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(() => {
                console.log('✅ Server closed.');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('⚠️  Forced shutdown after timeout.');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('\n❌ CRITICAL ERROR (Uncaught Exception):');
            console.error(err.stack);
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('\n❌ CRITICAL ERROR (Unhandled Rejection):');
            console.error(reason);
            shutdown('unhandledRejection');
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
