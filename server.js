const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// API: Get All Patients
app.get('/api/patients', (req, res) => {
    db.all("SELECT * FROM patients ORDER BY id ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Parse daily checklist back to array of objects
        const parsedRows = rows.map(row => ({
            ...row,
            daily_checklist: JSON.parse(row.daily_checklist)
        }));
        res.json(parsedRows);
    });
});

// API: Get Single Patient
app.get('/api/patients/:id', (req, res) => {
    const id = req.params.id.trim().toUpperCase();
    db.get("SELECT * FROM patients WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        row.daily_checklist = JSON.parse(row.daily_checklist);
        res.json(row);
    });
});

// API: Create Patient
app.post('/api/patients', (req, res) => {
    const { name, phone, program, doctor, status, phase, daily_checklist, notes, duration_days, current_day } = req.body;
    
    if (!name || !phone || !program) {
        return res.status(400).json({ error: 'Name, phone, and program are required.' });
    }

    // Generate unique Patient ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const id = `MIMS-${randomSuffix}`;

    const defaultChecklist = daily_checklist || [
        { text: 'Morning mindfulness session', done: false },
        { text: 'Clinical review meeting', done: false },
        { text: 'Occupational therapy workshop', done: false },
        { text: 'Family reintegration circle', done: false }
    ];

    const checklistStr = JSON.stringify(defaultChecklist);
    const defaultDoctor = doctor || 'Dr. C.D. Premadasan';
    const defaultStatus = status || 'Evaluation Active';
    const defaultPhase = phase !== undefined ? phase : 1;
    const defaultNotes = notes || 'New patient file opened in database. Baseline clinical interviews pending.';
    const defaultDur = duration_days || 30;
    const defaultCurDay = current_day || 1;

    const sql = `INSERT INTO patients (id, name, phone, program, doctor, status, phase, daily_checklist, notes, duration_days, current_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [id, name, phone, program, defaultDoctor, defaultStatus, defaultPhase, checklistStr, defaultNotes, defaultDur, defaultCurDay];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Patient registered successfully in database',
            patient: {
                id, name, phone, program, doctor: defaultDoctor, status: defaultStatus, phase: defaultPhase, daily_checklist: defaultChecklist, notes: defaultNotes, duration_days: defaultDur, current_day: defaultCurDay
            }
        });
    });
});

// API: Update Patient
app.put('/api/patients/:id', (req, res) => {
    const id = req.params.id.trim().toUpperCase();
    const { name, phone, program, doctor, status, phase, daily_checklist, notes, duration_days, current_day } = req.body;

    // Check if patient exists first
    db.get("SELECT * FROM patients WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const updatedName = name || row.name;
        const updatedPhone = phone || row.phone;
        const updatedProgram = program || row.program;
        const updatedDoctor = doctor || row.doctor;
        const updatedStatus = status || row.status;
        const updatedPhase = phase !== undefined ? phase : row.phase;
        const updatedChecklistStr = daily_checklist ? JSON.stringify(daily_checklist) : row.daily_checklist;
        const updatedNotes = notes !== undefined ? notes : row.notes;
        const updatedDuration = duration_days !== undefined ? duration_days : row.duration_days;
        const updatedCurrentDay = current_day !== undefined ? current_day : row.current_day;

        const sql = `UPDATE patients SET name = ?, phone = ?, program = ?, doctor = ?, status = ?, phase = ?, daily_checklist = ?, notes = ?, duration_days = ?, current_day = ? WHERE id = ?`;
        const params = [updatedName, updatedPhone, updatedProgram, updatedDoctor, updatedStatus, updatedPhase, updatedChecklistStr, updatedNotes, updatedDuration, updatedCurrentDay, id];

        db.run(sql, params, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                message: 'Patient file updated inside SQLite',
                patient: {
                    id, name: updatedName, phone: updatedPhone, program: updatedProgram, doctor: updatedDoctor, status: updatedStatus, phase: updatedPhase, daily_checklist: daily_checklist || JSON.parse(row.daily_checklist), notes: updatedNotes, duration_days: updatedDuration, current_day: updatedCurrentDay
                }
            });
        });
    });
});

// API: Get All Appointments
app.get('/api/appointments', (req, res) => {
    db.all("SELECT * FROM appointments ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API: Create Appointment
app.post('/api/appointments', (req, res) => {
    const { patient_name, patient_phone, service, doctor, date, time, notes } = req.body;

    if (!patient_name || !patient_phone || !date || !time) {
        return res.status(400).json({ error: 'Name, phone, date, and time are required.' });
    }

    // Generate unique Ticket ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticket_id = `MIMS-${randomSuffix}`;

    const sql = `INSERT INTO appointments (ticket_id, patient_name, patient_phone, service, doctor, date, time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;
    const params = [ticket_id, patient_name, patient_phone, service, doctor || 'Dr. C.D. Premadasan', date, time, notes || ''];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Appointment scheduled in SQLite',
            appointment: {
                id: this.lastID,
                ticket_id,
                patient_name,
                patient_phone,
                service,
                doctor: doctor || 'Dr. C.D. Premadasan',
                date,
                time,
                notes,
                status: 'Pending'
            }
        });
    });
});

// API: Update Appointment Status (Approve/Complete/Cancel)
app.put('/api/appointments/:id/status', (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Appointment record not found' });
        }
        res.json({ message: 'Appointment status successfully updated inside SQLite', id, status });
    });
});

// API: Delete Appointment
app.delete('/api/appointments/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM appointments WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json({ message: 'Appointment deleted from database', id });
    });
});

// Catch-all route to serve Frontend index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Manomithra MIMS fullstack server listening on http://localhost:${PORT}`);
});
