const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const providers = [
  // NGOs
  { username: 'NGO_Paws', location: 'Bandra', user_type: 'ngo' },
  { username: 'NGO_Rescue', location: 'Andheri', user_type: 'ngo' },
  { username: 'NGO_Care', location: 'Malad', user_type: 'ngo' },
  
  // Vets
  { username: 'Dr_Smith', location: 'Churchgate', user_type: 'vet' },
  { username: 'Dr_Patil', location: 'Goregaon', user_type: 'vet' },
  { username: 'Dr_Khan', location: 'Versova', user_type: 'vet' }
];

const seedProviders = async () => {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'animalport'
        });

        console.log('Connected to the MySQL database.');

        const defaultPassword = 'Password@123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(defaultPassword, salt);

        for (const provider of providers) {
            // Check if user exists first to avoid duplicate email/username clashes safely
            const [rows] = await db.execute("SELECT id FROM users WHERE username = ?", [provider.username]);
            if (rows.length === 0) {
                await db.execute(
                    "INSERT INTO users (username, password_hash, user_type, location) VALUES (?, ?, ?, ?)", 
                    [provider.username, hash, provider.user_type, provider.location]
                );
                console.log(`Inserted ${provider.user_type} ${provider.username} in ${provider.location}.`);
            } else {
                console.log(`User ${provider.username} already exists. Skipping insertion.`);
            }
        }
        console.log('Finished seeding location-based providers.');
        
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        if (db) await db.end();
    }
};

seedProviders();
