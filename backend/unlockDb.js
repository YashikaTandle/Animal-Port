const mysql = require('mysql2/promise');
require('dotenv').config();

async function unlockDb() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'animalport'
        });
        const [result] = await db.query("UPDATE users SET failed_attempts = 0, locked_until = NULL");
        console.log(`Success! Unlocked ${result.affectedRows} accounts.`);
        await db.end();
    } catch (err) {
        console.error(err);
    }
}

unlockDb();
