require('dotenv').config({ path: __dirname + '/../.env' });
const { connectDB } = require('../config/db');

const run = async () => {
    console.log('Starting DB schema upload...');
    await connectDB();
    console.log('DB schema uploaded successfully!');
    process.exit(0);
};

run().catch((err) => {
    console.error('❌ Schema upload failed:', err);
    process.exit(1);
});
