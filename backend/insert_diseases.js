const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const SOURCE_DIR = "C:\\Users\\Sowmya Govindharajan\\OneDrive\\Desktop\\diseases";

async function populateDiseases() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'animalport'
        });

        // Create table
        await db.query(`CREATE TABLE IF NOT EXISTS diseases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log("Reading diseases folder...");
        const folders = fs.readdirSync(SOURCE_DIR);
        
        let inserted = 0;
        for(const folder of folders) {
            const path = SOURCE_DIR + '\\\\' + folder;
            if(fs.statSync(path).isDirectory()) {
                await db.execute("INSERT IGNORE INTO diseases (name) VALUES (?)", [folder]);
                inserted++;
            }
        }

        console.log(`Successfully populated ${inserted} diseases!`);
        await db.end();
    } catch(err) {
        console.error("Error:", err);
    }
}

populateDiseases();
