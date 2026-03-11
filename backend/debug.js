require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
});

client.connect().then(() => {
    return client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
}).then(res => {
    console.table(res.rows);
    client.end();
}).catch(console.error);
