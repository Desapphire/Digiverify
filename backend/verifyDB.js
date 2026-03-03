require('dotenv').config();
const { connectDB } = require('./config/db');

(async () => {
    try {
        await connectDB();
        console.log('✅ Database connection and schema initialization verified.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification failed:', err);
        process.exit(1);
    }
})();
