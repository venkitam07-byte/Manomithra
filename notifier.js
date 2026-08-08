/**
 * Manomithra Institute of Medical Sciences (MIMS)
 * Secure Patient Notification Dispatcher (Twilio SMS & WhatsApp Core)
 * 
 * To activate real-time SMS & WhatsApp alerts to patient mobile numbers:
 * 1. Install the Twilio SDK: npm install twilio
 * 2. Set up your Twilio account and obtain your credentials.
 * 3. Configure your Environment Variables on your hosting provider (Render, Vercel, Railway, etc.):
 *    - TWILIO_ACCOUNT_SID=your_account_sid
 *    - TWILIO_AUTH_TOKEN=your_auth_token
 *    - TWILIO_PHONE_NUMBER=your_twilio_sms_number
 *    - TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_approved_number
 */

const twilio = require('twilio');

// Retrieve secure environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioSmsNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWaNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let client = null;

// Initialize Twilio client if credentials are configured
if (accountSid && authToken) {
    try {
        client = twilio(accountSid, authToken);
        console.log('Secure Notifier: Twilio Notification Engine initialized successfully.');
    } catch (err) {
        console.error('Secure Notifier: Initialization failed:', err.message);
    }
} else {
    console.log('Secure Notifier: Twilio variables not found. Operating in local sandbox mode.');
}

/**
 * Dispatches an automated clinical SMS confirmation to the patient's mobile number.
 * @param {string} toPhone Patient's mobile number (e.g., +919495867342)
 * @param {object} ticket Booking details
 */
async function dispatchSmsAlert(toPhone, ticket) {
    if (!client) {
        console.log(`[Local Simulation] SMS dispatched to ${toPhone}: "MIMS Booking Locked! ID: ${ticket.ticket_id} on ${ticket.date}"`);
        return { success: true, mode: 'simulation' };
    }

    const cleanPhone = formatInternationalNumber(toPhone);
    const smsBody = `MIMS Alert: Dear ${ticket.patient_name}, your clinical consultation is pre-registered. Ticket ID: ${ticket.ticket_id}. Date: ${ticket.date} at ${ticket.time}. Location: ${ticket.location}. Please show this slip at the front desk.`;

    try {
        const message = await client.messages.create({
            body: smsBody,
            from: twilioSmsNumber,
            to: cleanPhone
        });
        console.log(`Secure Notifier: SMS safely sent to ${cleanPhone}. Message SID: ${message.sid}`);
        return { success: true, messageSid: message.sid };
    } catch (err) {
        console.error(`Secure Notifier: SMS dispatch failed to ${cleanPhone}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Dispatches an automated clinical WhatsApp confirmation to the patient's mobile number.
 * @param {string} toPhone Patient's mobile number (e.g., +919495867342)
 * @param {object} ticket Booking details
 */
async function dispatchWhatsAppAlert(toPhone, ticket) {
    if (!client) {
        console.log(`[Local Simulation] WhatsApp dispatched to ${toPhone}: "Welcome, ${ticket.patient_name}! Your session is recorded."`);
        return { success: true, mode: 'simulation' };
    }

    const cleanPhone = formatInternationalNumber(toPhone);
    // WhatsApp requires approved templates or standard sandbox formats: "Your appointment is confirmed for..."
    const waBody = `Welcome to Manomithra Institute of Medical Sciences (MIMS), *${ticket.patient_name}*! Your mind wellness session has been successfully logged. \n\n*Ticket Code:* ${ticket.ticket_id}\n*Date:* ${ticket.date}\n*Time:* ${ticket.time}\n*Consultant:* ${ticket.doctor}\n*Location:* ${ticket.location}\n\nPlease show this secure pass at our clinical desk.`;

    try {
        const message = await client.messages.create({
            body: waBody,
            from: `whatsapp:${twilioWaNumber}`,
            to: `whatsapp:${cleanPhone}`
        });
        console.log(`Secure Notifier: WhatsApp alert dispatched to ${cleanPhone}. Message SID: ${message.sid}`);
        return { success: true, messageSid: message.sid };
    } catch (err) {
        console.error(`Secure Notifier: WhatsApp dispatch failed to ${cleanPhone}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Ensures phone numbers are formatted with correct country codes (defaults to India +91 if missing)
 * @param {string} phone 
 */
function formatInternationalNumber(phone) {
    let clean = phone.replace(/[^0-9+]/g, ''); // strip spaces/dashes
    if (!clean.startsWith('+')) {
        if (clean.length === 10) {
            clean = '+91' + clean; // default to India prefix
        } else if (clean.startsWith('91') && clean.length === 12) {
            clean = '+' + clean;
        }
    }
    return clean;
}

module.exports = {
    dispatchSmsAlert,
    dispatchWhatsAppAlert
};
