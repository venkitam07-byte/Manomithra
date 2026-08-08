const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create Patients Table
        db.run(`CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            program TEXT NOT NULL,
            doctor TEXT NOT NULL,
            status TEXT NOT NULL,
            phase INTEGER NOT NULL DEFAULT 1,
            daily_checklist TEXT NOT NULL,
            notes TEXT,
            duration_days INTEGER NOT NULL DEFAULT 30,
            current_day INTEGER NOT NULL DEFAULT 1
        )`, (err) => {
            if (err) console.error('Error creating patients table:', err.message);
            else seedPatients();
        });

        // Create Appointments Table
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE NOT NULL,
            patient_name TEXT NOT NULL,
            patient_phone TEXT NOT NULL,
            service TEXT NOT NULL,
            doctor TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating appointments table:', err.message);
            else seedAppointments();
        });
    });
}

function seedPatients() {
    db.get("SELECT COUNT(*) as count FROM patients", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log('Seeding initial patients into database...');
            const seedData = [
                {
                    id: 'MIMS-2025',
                    name: 'Suresh Nair',
                    phone: '+91 9446 112 233',
                    program: 'Outpatient Stress Management Program',
                    doctor: 'Dr. C.D. Premadasan',
                    status: 'Active Progress',
                    phase: 4,
                    daily_checklist: JSON.stringify([
                        { text: 'Morning mindfulness meditation', done: true },
                        { text: 'Brief stress triggers checklist log', done: true },
                        { text: 'Individual counseling check-in', done: true },
                        { text: 'Evening physical exercise walk', done: false }
                    ]),
                    notes: 'Suresh is responding wonderfully to outpatient stress therapies. His coping skills for high-stress work scenarios are highly structured. Recommended to continue bi-weekly check-ins.',
                    duration_days: 30,
                    current_day: 25
                },
                {
                    id: 'MIMS-2026',
                    name: 'Rahul Sharma',
                    phone: '+91 9495 867 342',
                    program: '45-Day Custom Rehab & De-addiction Plan',
                    doctor: 'Dr. C.D. Premadasan',
                    status: 'Daily Therapy Active',
                    phase: 3,
                    daily_checklist: JSON.stringify([
                        { text: 'Assisted morning meditation', done: true },
                        { text: 'Clinical psychological interview', done: true },
                        { text: 'Occupational art workshop session', done: true },
                        { text: 'Family group video call (6 PM)', done: false }
                    ]),
                    notes: 'Rahul is showing exceptional resilience and mental clarity. Physical cravings have stabilized, and he is highly active in occupational workshops. Family reintegration therapies are progressing positively.',
                    duration_days: 45,
                    current_day: 28
                },
                {
                    id: 'MIMS-2027',
                    name: 'Anjali Menon',
                    phone: '+91 9847 445 566',
                    program: 'Residential Inpatient Psychiatric Care',
                    doctor: 'Attending Clinical Psychologist',
                    status: 'Evaluation Phase',
                    phase: 2,
                    daily_checklist: JSON.stringify([
                        { text: 'Physiological vitals & medication check', done: true },
                        { text: 'Diagnostic psychological screening', done: true },
                        { text: 'Gentle garden walk therapy', done: false },
                        { text: 'Nutritional wellness diet monitoring', done: true }
                    ]),
                    notes: 'Admitted for comprehensive psychiatric observation. Sleep cycles have registered steady improvement. Medication tolerance is stable and being continuously fine-tuned by clinical nurses.',
                    duration_days: 60,
                    current_day: 8
                }
            ];

            const stmt = db.prepare(`INSERT INTO patients (id, name, phone, program, doctor, status, phase, daily_checklist, notes, duration_days, current_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            seedData.forEach(p => {
                stmt.run(p.id, p.name, p.phone, p.program, p.doctor, p.status, p.phase, p.daily_checklist, p.notes, p.duration_days, p.current_day);
            });
            stmt.finalize();
        }
    });
}

function seedAppointments() {
    db.get("SELECT COUNT(*) as count FROM appointments", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log('Seeding initial appointments into database...');
            const seedData = [
                {
                    ticket_id: 'MIMS-8321',
                    patient_name: 'John Doe',
                    patient_phone: '+91 9495 123 456',
                    service: 'op',
                    doctor: 'Dr. C.D. Premadasan',
                    date: '2026-08-10',
                    time: '11:00 AM',
                    notes: 'Requesting primary anxiety screening.',
                    status: 'Approved'
                },
                {
                    ticket_id: 'MIMS-4921',
                    patient_name: 'Meera Viswanathan',
                    patient_phone: '+91 9447 789 012',
                    service: 'deaddiction',
                    doctor: 'Dr. C.D. Premadasan',
                    date: '2026-08-12',
                    time: '02:00 PM',
                    notes: 'Consultation for outpatient chemical dependency program admission.',
                    status: 'Pending'
                }
            ];

            const stmt = db.prepare(`INSERT INTO appointments (ticket_id, patient_name, patient_phone, service, doctor, date, time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            seedData.forEach(a => {
                stmt.run(a.ticket_id, a.patient_name, a.patient_phone, a.service, a.doctor, a.date, a.time, a.notes, a.status);
            });
            stmt.finalize();
        }
    });
}

module.exports = db;
