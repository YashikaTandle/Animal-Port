const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const defaultPassword = 'password@123';

const initDb = async () => {
    try {
        // Connect without database to create it if it doesn't exist
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`animalport\`;`);
        console.log('Database animalport created or already exists.');
        await connection.end();

        // Re-connect with database selected
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'animalport'
        });
        
        console.log('Connected to the MySQL database.');

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(defaultPassword, salt);

        await db.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            failed_attempts INT DEFAULT 0,
            locked_until DATETIME,
            user_type VARCHAR(50) DEFAULT 'normal'
        )`);
        console.log('Users table initialized.');

        // Insert dummy users
        for (let i = 1; i <= 10; i++) {
            await db.execute("INSERT IGNORE INTO users (username, password_hash) VALUES (?, ?)", [`user${i}`, hash]);
        }
        
        console.log('Inserted 10 dummy users. Usernames: user1 to user10. Password: password@123');
        
        await db.end();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();
