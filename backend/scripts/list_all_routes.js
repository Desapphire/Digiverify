const express = require('express');

// We can mount each route file with its prefix exactly as in server.js without starting the server
const authRoutes = require('../routes/authRoutes');
const onboardingRoutes = require('../routes/onboardingRoutes');
const userRoutes = require('../routes/userRoutes');
const propertyRoutes = require('../routes/propertyRoutes');
const saleRoutes = require('../routes/saleRoutes');
const bankRoutes = require('../routes/bankRoutes');
const adminRoutes = require('../routes/adminRoutes');
const ipfsRoutes = require('../routes/ipfsRoutes');
const mlRiskRoutes = require('../routes/mlRiskRoutes');
const biometricRoutes = require('../routes/biometricRoutes');

const routeMounts = [
    { prefix: '/api/auth', router: authRoutes },
    { prefix: '/api/onboarding', router: onboardingRoutes },
    { prefix: '/api/users', router: userRoutes },
    { prefix: '/api/properties', router: propertyRoutes },
    { prefix: '/api/sales', router: saleRoutes },
    { prefix: '/api/bank', router: bankRoutes },
    { prefix: '/api/admin', router: adminRoutes },
    { prefix: '/api/ipfs', router: ipfsRoutes },
    { prefix: '/api/risk', router: mlRiskRoutes },
    { prefix: '/api/biometric', router: biometricRoutes },
];

const allRoutes = [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/api/docs' },
];

routeMounts.forEach(({ prefix, router }) => {
    if (router && router.stack) {
        router.stack.forEach(layer => {
            if (layer.route) {
                const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
                methods.forEach(method => {
                    let subPath = layer.route.path;
                    if (subPath === '/') subPath = '';
                    allRoutes.push({ method, path: prefix + subPath });
                });
            }
        });
    }
});

console.log(JSON.stringify(allRoutes, null, 2));
console.log('Total routes found:', allRoutes.length);
