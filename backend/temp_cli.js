#!/usr/bin/env node

const { Client } = require('pg');
const readline = require('readline');
require('dotenv').config({ path: __dirname + '/.env' });

const dbUrl = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

if (!process.env.PGUSER) {
    console.error('❌ ERROR: PG variables are missing in .env.');
    process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

const rl = readline.createInterface({
    input: process.env.NODE_ENV === 'test' ? process.stdin : process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function runInteractive() {
    try {
        await client.connect();
        
        // 1. Fetch all users
        const res = await client.query('SELECT id, name, email FROM users ORDER BY name');
        let users = res.rows.map((u, index) => ({ ...u, index: index + 1, marked: false }));
        
        if (users.length === 0) {
            console.log("No users found in database.");
            process.exit(0);
        }

        // 2. Interactive Loop
        while (true) {
            console.clear();
            console.log('============= Interactive User Cleanup =============');
            console.log(`Found ${users.length} users in Database\n`);
            
            console.log(' No. | Mark | Name                            | Email                          ');
            console.log('-----|------|---------------------------------|--------------------------------');
            for (let u of users) {
                const checked = u.marked ? '[X]' : '[ ]';
                const noStr = String(u.index).padEnd(3);
                const nameStr = (u.name || 'Unknown').substring(0, 31).padEnd(31);
                const emailStr = (u.email || 'No Email').substring(0, 30).padEnd(30);
                
                console.log(` ${noStr} |  ${checked} | ${nameStr} | ${emailStr}`);
            }
            console.log('-------------------------------------------------------------------------------');

            console.log('\nOptions:');
            console.log('  Type a number (e.g., "5") to toggle marking that user for deletion.');
            console.log('  Type a dash range (e.g., "1-10") to mark a group.');
            console.log('  Type "all" to mark everyone, "none" to unmark everyone.');
            console.log('  Type "run" to confirm and delete all marked users.');
            console.log('  Type "quit" or "exit" to cancel and exit.\n');

            const answer = (await askQuestion('Command > ')).trim().toLowerCase();

            if (answer === 'quit' || answer === 'exit' || answer === 'q') {
                console.log('Exiting without changes.');
                break;
            }

            if (answer === 'run') {
                const markedUsers = users.filter(u => u.marked);
                if (markedUsers.length === 0) {
                    await askQuestion('\nNo users marked for deletion. Press Enter to continue...');
                    continue;
                }

                console.log(`\n⚠️  You are about to DELETE ${markedUsers.length} users AND their properties!`);
                const confirm = await askQuestion('Are you absolutely sure? (type "yes" to confirm): ');
                
                if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
                    const markedIds = markedUsers.map(u => u.id);
                    
                    // Fetch wallets
                    const walletRes = await client.query('SELECT wallet_address FROM users WHERE id = ANY($1)', [markedIds]);
                    const markedWallets = walletRes.rows.map(r => r.wallet_address).filter(w => w);

                    console.log('\n--- Executing Deletion ---');
                    
                    if (markedWallets.length > 0) {
                        try {
                            // First, get the IDs of the properties that are about to be deleted
                            const propIdsRes = await client.query('SELECT id FROM properties WHERE owner_wallet = ANY($1)', [markedWallets]);
                            const propIds = propIdsRes.rows.map(r => r.id);

                            if (propIds.length > 0) {
                                // Delete dependent court freeze orders
                                const courtRes = await client.query('DELETE FROM court_freeze_orders WHERE property_id = ANY($1)', [propIds]);
                                if (courtRes.rowCount > 0) console.log(`✅ Deleted ${courtRes.rowCount} dependent court freeze orders.`);

                                // Delete dependent multi_sig_approvals AND fund_blocks tied to sale_transactions
                                const transIdsRes = await client.query('SELECT id FROM sale_transactions WHERE property_id = ANY($1)', [propIds]);
                                const transIds = transIdsRes.rows.map(t => t.id);
                                if (transIds.length > 0) {
                                    const msaRes = await client.query('DELETE FROM multi_sig_approvals WHERE transaction_id = ANY($1)', [transIds]);
                                    if (msaRes.rowCount > 0) console.log(`✅ Deleted ${msaRes.rowCount} dependent multi-sig approvals.`);
                                    
                                    const fbRes = await client.query('DELETE FROM fund_blocks WHERE transaction_id = ANY($1)', [transIds]);
                                    if (fbRes.rowCount > 0) console.log(`✅ Deleted ${fbRes.rowCount} dependent fund blocks.`);
                                }

                                // Delete dependent sale transactions
                                const transRes = await client.query('DELETE FROM sale_transactions WHERE property_id = ANY($1)', [propIds]);
                                if (transRes.rowCount > 0) console.log(`✅ Deleted ${transRes.rowCount} dependent sale transactions.`);
                                
                                // Now delete the properties
                                const propRes = await client.query('DELETE FROM properties WHERE id = ANY($1)', [propIds]);
                                console.log(`✅ Deleted ${propRes.rowCount} associated properties.`);
                            } else {
                                console.log('✅ No associated properties to delete.');
                            }

                        } catch(e) {
                            console.log(`⚠️ Dependent object deletion failed: ${e.message}`);
                        }
                    }

                    try {
                        const userRes = await client.query('DELETE FROM users WHERE id = ANY($1) RETURNING name', [markedIds]);
                        console.log(`✅ Deleted ${userRes.rowCount} users.`);
                    } catch(e) {
                         console.log(`❌ Failed to delete users: ${e.message}`);
                    }
                    
                    console.log('\nDone! Exiting.');
                    break;
                } else {
                    await askQuestion('\nDeletion cancelled. Press Enter to return to menu...');
                    continue;
                }
            }

            if (answer === 'all') {
                users.forEach(u => u.marked = true);
                continue;
            }

            if (answer === 'none') {
                users.forEach(u => u.marked = false);
                continue;
            }

            // Handle range "1-5"
            if (answer.includes('-')) {
                const [start, end] = answer.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end) && start > 0 && end <= users.length && start <= end) {
                    for(let i = start; i <= end; i++) {
                        users[i - 1].marked = true;
                    }
                }
                continue;
            }

            // Handle singular number "5"
            const num = parseInt(answer, 10);
            if (!isNaN(num) && num > 0 && num <= users.length) {
                users[num - 1].marked = !users[num - 1].marked;
            }
        }
        
    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        rl.close();
        await client.end();
    }
}

runInteractive();
