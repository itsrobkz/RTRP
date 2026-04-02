const nodemailer = require('nodemailer');

// Setup Transporter (Using Environment Variables)
let transporter;
if (process.env.EMAIL_USER) {
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

async function sendTicketEmail(to, ticketData, pdfBuffer = null) {
    if (!transporter) {
        console.log('--- EMAIL SIMULATION ---');
        console.log(`To: ${to}`);
        console.log(`Subject: Your Ticket for ${ticketData.eventTitle}`);
        console.log('Body: Ticket details...');
        console.log('------------------------');
        return; // Skip actual sending if no credentials
    }

    const mailOptions = {
        from: `"Lumina Events" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `Your Ticket: ${ticketData.eventTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #6f4cff;">Event Booking Confirmed!</h1>
                <p>Hello,</p>
                <p>Thank you for booking <strong>${ticketData.eventTitle}</strong>.</p>
                <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
                    <p><strong>Date:</strong> ${new Date(ticketData.eventDate).toDateString()}</p>
                    <p><strong>Venue:</strong> ${ticketData.eventLocation}</p>
                    <p><strong>Tickets:</strong> ${ticketData.ticketQuantity}</p>
                    <p><strong>Amount Paid:</strong> $${ticketData.totalAmount}</p>
                </div>
                <p>Your e-ticket is attached. Please present the QR code at the entry.</p>
                <p>Regards,<br>Lumina Team</p>
            </div>
        `,
        attachments: pdfBuffer ? [
            {
                filename: `Ticket-${ticketData.ticketNumber}.pdf`,
                content: pdfBuffer
            }
        ] : []
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Email send error:', error);
    }
}

module.exports = { sendTicketEmail };
