const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const nodemailer = require('nodemailer');
const http = require('http');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Start the persistent Python AI worker
console.log("Starting persistent AI Worker...");
const pyWorker = spawn('python', ['-u', 'predict_worker.py']);
pyWorker.stdout.on('data', data => console.log(`[AI Worker]: ${data.toString().trim()}`));
pyWorker.stderr.on('data', data => console.error(`[AI Worker Error]: ${data.toString().trim()}`));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'animalport',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const JWT_SECRET = 'supersecret_animalport_key_123';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop() || 'jpg';
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
    }
});
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'sowmyamedia006@gmail.com',
        pass: process.env.EMAIL_PASS || ''
    }
});

const dbRun = async (query, params = []) => {
    const [result] = await pool.execute(query, params);
    return result;
};

const dbGet = async (query, params = []) => {
    const [rows] = await pool.execute(query, params);
    return rows[0];
};

dbRun(`CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    filename VARCHAR(255),
    diagnosis VARCHAR(255),
    confidence FLOAT,
    status VARCHAR(50) DEFAULT 'pending_vet_review',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).catch(err => console.error(err));

dbRun(`CREATE TABLE IF NOT EXISTS user_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id VARCHAR(50),
    image VARCHAR(255),
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    reported_to VARCHAR(50)
)`).catch(err => console.error(err));

dbRun(`CREATE TABLE IF NOT EXISTS ngo_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id VARCHAR(50),
    name VARCHAR(255),
    contact_number VARCHAR(50),
    location VARCHAR(255),
    image VARCHAR(255),
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
)`).catch(err => console.error(err));

dbRun(`CREATE TABLE IF NOT EXISTS vet_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id VARCHAR(50),
    name VARCHAR(255),
    contact_number VARCHAR(50),
    location VARCHAR(255),
    image VARCHAR(255),
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(255)
)`).catch(err => console.error(err));

dbRun(`ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'normal'`).catch(err => {});
dbRun(`ALTER TABLE users ADD COLUMN location VARCHAR(255) DEFAULT ''`).catch(err => {});
dbRun(`ALTER TABLE users ADD COLUMN failed_attempts INT DEFAULT 0`).catch(err => {});
dbRun(`ALTER TABLE users ADD COLUMN locked_until VARCHAR(255) DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE user_cases ADD COLUMN user_id INT`).catch(err => {});
dbRun(`ALTER TABLE ngo_cases ADD COLUMN assigned_to VARCHAR(255)`).catch(err => {});
dbRun(`ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE user_cases ADD COLUMN email VARCHAR(255) DEFAULT NULL`).catch(err => {});

// Diagnostic Info Storage Columns
dbRun(`ALTER TABLE user_cases ADD COLUMN diagnosis VARCHAR(255) DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE user_cases ADD COLUMN confidence FLOAT DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE ngo_cases ADD COLUMN diagnosis VARCHAR(255) DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE ngo_cases ADD COLUMN confidence FLOAT DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE vet_cases ADD COLUMN diagnosis VARCHAR(255) DEFAULT NULL`).catch(err => {});
dbRun(`ALTER TABLE vet_cases ADD COLUMN confidence FLOAT DEFAULT NULL`).catch(err => {});

dbRun(`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).catch(err => console.error(err));

dbRun(`CREATE TABLE IF NOT EXISTS otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    otp VARCHAR(10),
    expires_at DATETIME
)`).catch(err => console.error(err));

// --- API Endpoints ---

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    try {
        const existingUser = await dbGet("SELECT * FROM users WHERE email = ? OR username = ?", [email, email]);
        if (existingUser) return res.status(409).json({ error: 'User already exists.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        await dbRun("INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?", [email, otp, expiresAt, otp, expiresAt]);

        const mailOptions = {
            from: process.env.EMAIL_USER || 'sowmyamedia006@gmail.com',
            to: email,
            subject: 'AnimalPort - Verify your Email',
            text: `Your OTP for AnimalPort signup is: ${otp}. It is valid for 10 minutes.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Email send error:", error);
                return res.status(500).json({ error: 'Failed to send OTP email.' });
            }
            res.json({ message: 'OTP sent successfully.' });
        });
    } catch (err) {
        console.error("DEBUG ERROR IN SEND OTP:", err.message, err.stack);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
});

app.post('/api/signup', async (req, res) => {
    const { username, password, user_type, email, otp } = req.body;
    if (!username || !password || !otp) return res.status(400).json({ error: 'Username, password, and OTP required.' });

    const role = user_type || 'normal';

    try {
        const otpRecord = await dbGet("SELECT * FROM otps WHERE email = ?", [email]);
        if (!otpRecord) return res.status(400).json({ error: 'No OTP requested for this email.' });
        
        if (otpRecord.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await dbRun("INSERT INTO users (username, password_hash, user_type, email) VALUES (?, ?, ?, ?)", [username, hash, role, email || null]);
        
        await dbRun("DELETE FROM otps WHERE email = ?", [email]);

        res.status(201).json({ message: 'User created successfully.' });
    } catch (error) {
        console.error("DEBUG ERROR IN SIGNUP:", error.message, error.stack);
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists.' });
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

app.get('/api/providers', async (req, res) => {
    const { type, location } = req.query;
    if (!type || !location) return res.status(400).json({ error: 'type and location required' });
    
    const role = type.toLowerCase();

    try {
        const [results] = await pool.execute("SELECT username, user_type, location FROM users WHERE user_type = ?", [role]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error fetching providers.' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [cases] = await pool.execute("SELECT COUNT(*) AS count FROM user_cases WHERE DATE(date) = CURDATE()");
        const [providers] = await pool.execute("SELECT COUNT(*) AS count FROM users WHERE user_type IN ('ngo', 'vet')");
        res.json({ todayCases: cases[0].count || 0, connectedProviders: providers[0].count || 0, avgDetection: "2.3 sec" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve stats' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    try {
        const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

        if (user.locked_until) {
            if (new Date(user.locked_until) > new Date()) {
                return res.status(403).json({ error: 'Account is locked. Try again later.' });
            } else {
                user.failed_attempts = 0;
                await dbRun("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?", [user.id]);
            }
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            let newAttempts = (user.failed_attempts || 0) + 1;
            let lockedUntil = null;
            let msg = 'Invalid credentials.';

            if (newAttempts >= 3) {
                const d = new Date(Date.now() + 10 * 60 * 1000);
                const pad = (n) => n < 10 ? '0' + n : n;
                lockedUntil = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                msg = 'Account locked due to 3 failed attempts. Please try again after 10 minutes.';
            }
            await dbRun("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?", [newAttempts, lockedUntil, user.id]);
            return res.status(401).json({ error: msg });
        }

        await dbRun("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?", [user.id]);
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful.', token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    const imagePath = req.file.path;

    const postData = JSON.stringify({ image_path: imagePath });

    const options = {
        hostname: '127.0.0.1',
        port: 5001,
        path: '/predict',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const pyReq = http.request(options, (pyRes) => {
        let data = '';
        pyRes.on('data', (chunk) => { data += chunk; });
        pyRes.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.error) return res.status(500).json({ error: result.error });

                res.json({
                    message: 'Image processed successfully.',
                    filename: req.file.filename,
                    patternMatched: result.disease,
                    confidence: result.confidence
                });
            } catch (err) {
                res.status(500).json({ error: 'Failed parsing prediction.' });
            }
        });
    });

    pyReq.on('error', (e) => {
        console.error("AI Server request failed:", e);
        // Fallback or error
        res.status(500).json({ error: 'AI processing server is unavailable. It may still be initializing models. Try again in a few seconds.' });
    });

    pyReq.write(postData);
    pyReq.end();
});

app.post('/api/cases', async (req, res) => {
    const { filename, diagnosis, confidence } = req.body;
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try { userId = jwt.verify(authHeader.split(' ')[1], JWT_SECRET).id; } catch (e) {}
    }
    try {
        await dbRun("INSERT INTO cases (user_id, filename, diagnosis, confidence) VALUES (?, ?, ?, ?)", [userId, filename, diagnosis, confidence]);
        res.status(201).json({ message: 'Success! Case forwarded to Vet Dashboard.' });
    } catch (err) { res.status(500).json({ error: 'Failed to forward case.' }); }
});

app.get('/api/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const user = await dbGet("SELECT id, username, user_type FROM users WHERE id = ?", [decoded.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

app.put('/api/users/credentials', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const { newUsername, newPassword } = req.body;
        if (newUsername) await dbRun("UPDATE users SET username = ? WHERE id = ?", [newUsername, decoded.id]);
        if (newPassword) {
            const hash = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
            await dbRun("UPDATE users SET password_hash = ? WHERE id = ?", [hash, decoded.id]);
        }
        res.json({ message: 'Credentials updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists' });
        res.status(500).json({ error: 'Failed to update credentials' });
    }
});

const generateCaseId = () => {
    const d = new Date();
    const dateStr = `${d.getDate().toString().padStart(2, '0')}${(d.getMonth()+1).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}`;
    return `AP-${dateStr}-${Math.floor(Math.random() * 900) + 100}`;
};

app.post('/api/submit-case', async (req, res) => {
    const { name, contact, location, image, reportedToType, reportedToName, email, diagnosis, confidence } = req.body;
    const authHeader = req.headers.authorization;
    
    try {
        let userId = null;
        let username = null;
        let userType = 'guest';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
                const user = await dbGet("SELECT user_type, username FROM users WHERE id = ?", [decoded.id]);
                if (user) { userId = decoded.id; username = user.username; userType = user.user_type; }
            } catch(e) {}
        }
        
        const caseId = generateCaseId();
        const imgDisplay = image || '📷 View';
        const targetAssignee = reportedToName || 'Unassigned';
        const reportedToString = reportedToType ? `${reportedToType} - ${targetAssignee}` : `NGO - ${targetAssignee}`;
        
        const diag = diagnosis || 'Unknown';
        const conf = confidence || 0;

        if (userType === 'normal' || userType === 'guest') {
            await dbRun("INSERT INTO user_cases (case_id, image, status, reported_to, user_id, email, diagnosis, confidence) VALUES (?, ?, 'Pending', ?, ?, ?, ?, ?)", 
                 [caseId, imgDisplay, reportedToString, userId, email || null, diag, conf]);
                 
            if (reportedToType && reportedToType.toUpperCase() === 'VET') {
                 await dbRun("INSERT INTO vet_cases (case_id, name, contact_number, location, image, status, assigned_to, diagnosis, confidence) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?)",
                      [caseId, name || 'Anonymous User', contact || 'N/A', location || 'Unknown', imgDisplay, targetAssignee, diag, conf]);
            } else {
                 await dbRun("INSERT INTO ngo_cases (case_id, name, contact_number, location, image, status, assigned_to, diagnosis, confidence) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?)",
                      [caseId, name || 'Anonymous User', contact || 'N/A', location || 'Unknown', imgDisplay, targetAssignee, diag, conf]);
            }

            if (targetAssignee && targetAssignee !== 'Unassigned') {
                 const targetProvider = await dbGet("SELECT id FROM users WHERE username = ?", [targetAssignee]);
                 if (targetProvider) {
                      await dbRun("INSERT INTO notifications (user_id, message) VALUES (?, ?)", 
                         [targetProvider.id, `1 Case Reported from ${location || 'Unknown'} by ${name || 'Anonymous User'}`]);
                 }
            }
            if (userId) {
                 await dbRun("INSERT INTO notifications (user_id, message) VALUES (?, ?)", 
                     [userId, `Your Case was successfully routed to ${targetAssignee}`]);
            }
        } else {
            if (reportedToType && reportedToType.toUpperCase() === 'VET') {
                 await dbRun("INSERT INTO vet_cases (case_id, name, contact_number, location, image, status, assigned_to, diagnosis, confidence) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?)",
                      [caseId, name, contact, location, imgDisplay, targetAssignee, diag, conf]);
            } else {
                 await dbRun("INSERT INTO ngo_cases (case_id, name, contact_number, location, image, status, assigned_to, diagnosis, confidence) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?)",
                      [caseId, name, contact, location, imgDisplay, targetAssignee, diag, conf]);
            }
                 
            await dbRun("INSERT INTO user_cases (case_id, image, status, reported_to, user_id, email, diagnosis, confidence) VALUES (?, ?, 'Pending', ?, ?, ?, ?, ?)", 
                 [caseId, imgDisplay, reportedToString, userId, email || null, diag, conf]);
                 
            await dbRun("INSERT INTO notifications (user_id, message) VALUES (?, ?)", 
                 [userId, `Your Case was successfully routed to ${targetAssignee}`]);

            if (targetAssignee && targetAssignee !== 'Unassigned') {
                 const targetProvider = await dbGet("SELECT id FROM users WHERE username = ?", [targetAssignee]);
                 if (targetProvider) {
                      await dbRun("INSERT INTO notifications (user_id, message) VALUES (?, ?)", 
                         [targetProvider.id, `1 Case Reported from ${location || 'Unknown'} by ${name || 'Provider'}`]);
                 }
            }
        }
        res.status(201).json({ message: 'Submitted successfully!', case_id: caseId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit case' });
    }
});

app.get('/api/cases', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await dbGet("SELECT user_type, username, email FROM users WHERE id = ?", [decoded.id]);
        
        let cases = [];
        if (user && user.user_type === 'normal') {
            const [rows] = await pool.execute("SELECT case_id as id, 'You' as name, 'N/A' as contact, 'My Location' as loc, image as img, DATE_FORMAT(date, '%d/%m/%Y %H:%i') as date, status, reported_to as reportedTo, diagnosis, confidence FROM user_cases WHERE user_id = ? OR (email IS NOT NULL AND email = ?) ORDER BY date DESC", [decoded.id, user.email || 'NO_MATCH']);
            cases = rows;
        } else if (user) {
            const tableName = user.user_type === 'vet' ? 'vet_cases' : 'ngo_cases';
            const [rows] = await pool.execute(`SELECT case_id as id, name, contact_number as contact, location as loc, image as img, DATE_FORMAT(date, '%d/%m/%Y %H:%i') as date, status, 'Direct' as reportedTo, diagnosis, confidence FROM ${tableName} WHERE assigned_to = ? OR assigned_to = 'Unassigned' OR assigned_to = '' ORDER BY date DESC`, [user.username]);
            cases = rows;
        }
        res.json(cases);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

app.get('/api/personal-cases', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute("SELECT case_id as id, 'You' as name, 'N/A' as contact, 'My Location' as loc, image as img, DATE_FORMAT(date, '%d/%m/%Y %H:%i') as date, status, reported_to as reportedTo, diagnosis, confidence FROM user_cases WHERE user_id = ? ORDER BY date DESC", [decoded.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/cases/:case_id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const { type } = req.query; 

        if (type === 'personal') {
            await dbRun("DELETE FROM user_cases WHERE case_id = ? AND user_id = ?", [req.params.case_id, decoded.id]);
        } else if (type === 'assigned') {
            const user = await dbGet("SELECT user_type FROM users WHERE id = ?", [decoded.id]);
            if (user.user_type === 'ngo') await dbRun("DELETE FROM ngo_cases WHERE case_id = ?", [req.params.case_id]);
            else if (user.user_type === 'vet') await dbRun("DELETE FROM vet_cases WHERE case_id = ?", [req.params.case_id]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Delete Case Error:", err);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.put('/api/cases/:case_id/status', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { status } = req.body;
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const user = await dbGet("SELECT user_type FROM users WHERE id = ?", [decoded.id]);
        if (user.user_type === 'normal') return res.status(403).json({ error: 'Forbidden' });
        
        const table = user.user_type === 'vet' ? 'vet_cases' : 'ngo_cases';
        
        // Update Local & Global
        await dbRun(`UPDATE ${table} SET status = ? WHERE case_id = ?`, [status, req.params.case_id]);
        await dbRun(`UPDATE user_cases SET status = ? WHERE case_id = ?`, [status, req.params.case_id]);
        
        // Notify original creator
        const original = await dbGet("SELECT user_id FROM user_cases WHERE case_id = ? AND user_id IS NOT NULL", [req.params.case_id]);
        if (original && original.user_id) {
            await dbRun("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [original.user_id, `Case id: ${req.params.case_id} Current Status: ${status}`]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Change Status API Error:", err);
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.get('/api/notifications', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute("SELECT id, message, is_read as isRead, DATE_FORMAT(created_at, '%h:%i %p') as time FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15", [decoded.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/notifications/read', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        await dbRun("UPDATE notifications SET is_read = true WHERE user_id = ?", [decoded.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
