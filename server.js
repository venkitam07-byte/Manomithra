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
            console.error('Database Error:', err.message);
            return res.status(500).json({ 
                error: 'The clinical records system is experiencing a temporary delay. Please try again or contact our administrative desk at +91 9495 867 342.' 
            });
        }
        try {
            // Parse daily checklist back to array of objects
            const parsedRows = rows.map(row => ({
                ...row,
                daily_checklist: JSON.parse(row.daily_checklist)
            }));
            res.json(parsedRows);
        } catch (parseErr) {
            console.error('JSON Parse Error:', parseErr.message);
            res.status(500).json({ 
                error: 'We encountered an issue reading some of the clinical files. Rest assured, patient records are safe. Please refresh the page.' 
            });
        }
    });
});

// API: Get Single Patient
app.get('/api/patients/:id', (req, res) => {
    const id = req.params.id.trim().toUpperCase();
    db.get("SELECT * FROM patients WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error('Database Lookup Error:', err.message);
            return res.status(500).json({ 
                error: 'We could not query the clinical ledger right now. Please try again in a few moments.' 
            });
        }
        if (!row) {
            return res.status(404).json({ 
                error: `The registration code "${id}" was not found. Please verify the code on your clinical admission slip or consult our front desk.` 
            });
        }
        try {
            row.daily_checklist = JSON.parse(row.daily_checklist);
            res.json(row);
        } catch (parseErr) {
            console.error('JSON Parse Error:', parseErr.message);
            res.status(500).json({ 
                error: 'We encountered an error loading this patient’s objectives checklist. Please contact our technical coordinator.' 
            });
        }
    });
});

// API: Create Patient
app.post('/api/patients', (req, res) => {
    const { name, phone, program, doctor, status, phase, daily_checklist, notes, duration_days, current_day } = req.body;
    
    if (!name || !phone || !program) {
        return res.status(400).json({ 
            error: 'Please fill in all essential patient details, including the full name, primary phone number, and selected treatment program.' 
        });
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
            console.error('Database Insertion Error:', err.message);
            return res.status(500).json({ 
                error: 'We were unable to create the new clinical file due to a registry synchronization error. Please try again.' 
            });
        }
        res.status(201).json({
            message: 'Patient registered successfully in secure registry',
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
            console.error('Database Lookup Error:', err.message);
            return res.status(500).json({ 
                error: 'We were unable to verify the clinical record for this update. Please try again.' 
            });
        }
        if (!row) {
            return res.status(404).json({ 
                error: 'The requested patient profile could not be located in our active clinical registry.' 
            });
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
                console.error('Database Update Error:', err.message);
                return res.status(500).json({ 
                    error: 'The clinical system failed to write updates to the patient’s record. Please verify details and try again.' 
                });
            }
            res.json({
                message: 'Patient record successfully updated',
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
            console.error('Database Selection Error:', err.message);
            return res.status(500).json({ 
                error: 'The consultation calendar is temporarily unavailable. Please try reloading or call our receptionist.' 
            });
        }
        res.json(rows);
    });
});

// API: Create Appointment
app.post('/api/appointments', (req, res) => {
    const { patient_name, patient_phone, service, doctor, date, time, notes } = req.body;

    if (!patient_name || !patient_phone || !date || !time) {
        return res.status(400).json({ 
            error: 'Please complete all required appointment details, including the patient name, phone, preferred date, and session time slot.' 
        });
    }

    // Generate unique Ticket ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticket_id = `MIMS-${randomSuffix}`;

    const sql = `INSERT INTO appointments (ticket_id, patient_name, patient_phone, service, doctor, date, time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;
    const params = [ticket_id, patient_name, patient_phone, service, doctor || 'Dr. C.D. Premadasan', date, time, notes || ''];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Database Insertion Error:', err.message);
            return res.status(500).json({ 
                error: 'We were unable to lock in your appointment slot due to a synchronization delay. Please call us directly to secure your session.' 
            });
        }
        res.status(201).json({
            message: 'Appointment successfully registered in ledger',
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

// API: Update Appointment Status
app.put('/api/appointments/:id/status', (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Verification status update parameter is missing.' });
    }

    db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, id], function(err) {
        if (err) {
            console.error('Database Update Error:', err.message);
            return res.status(500).json({ 
                error: 'We were unable to record the update to this consultation record. Please try again.' 
            });
        }
        if (this.changes === 0) {
            return res.status(404).json({ 
                error: 'The requested appointment record could not be found in our schedules ledger.' 
            });
        }
        res.json({ message: 'Consultation status updated in central records.', id, status });
    });
});

// API: Delete Appointment
app.delete('/api/appointments/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM appointments WHERE id = ?", [id], function(err) {
        if (err) {
            console.error('Database Deletion Error:', err.message);
            return res.status(500).json({ 
                error: 'We could not remove the appointment log due to an archive system delay. Please try again.' 
                });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Record not found.' });
        }
        res.json({ message: 'Appointment successfully removed from archives.', id });
    });
});

// Fallback: Securely serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Manomithra MIMS fullstack server listening on http://localhost:${PORT}`);
});
