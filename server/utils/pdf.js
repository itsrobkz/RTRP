const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateTicketPDF(booking, event, res) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Stream directly to response
    doc.pipe(res);

    // -- Header --
    doc.rect(0, 0, 595, 120).fill('#6f4cff'); // Primary color banner
    doc.fontSize(28).fillColor('#ffffff').text('LUMINA EVENTS', 50, 45, { align: 'left' });
    doc.fontSize(12).text('Premium Event Experience', 50, 75);

    // -- Event Details --
    doc.fillColor('#000000').fontSize(24).text(event.title, 50, 160);

    doc.fontSize(14).font('Helvetica-Bold').text('Date & Time:', 50, 200);
    doc.font('Helvetica').text(`${new Date(event.date).toDateString()} | ${event.time}`, 150, 200);

    doc.font('Helvetica-Bold').text('Venue:', 50, 230);
    doc.font('Helvetica').text(event.location, 150, 230);

    doc.font('Helvetica-Bold').text('Booking ID:', 50, 260);
    doc.font('Helvetica').text(booking._id.toString(), 150, 260);

    // -- Ticket Box --
    doc.rect(50, 300, 495, 150).strokeColor('#cccccc').stroke();

    doc.fontSize(12).font('Helvetica-Bold').text('TICKET DETAILS', 70, 320);

    doc.font('Helvetica-Bold').text('Ticket #:', 70, 350);
    doc.font('Helvetica').text(booking.ticketNumber || 'N/A', 150, 350);

    doc.font('Helvetica-Bold').text('Quantity:', 70, 380);
    doc.font('Helvetica').text(booking.ticketQuantity.toString(), 150, 380);

    doc.font('Helvetica-Bold').text('Price:', 70, 410);
    doc.font('Helvetica').text(`$${booking.totalAmount}`, 150, 410);

    doc.font('Helvetica-Bold').text('Status:', 300, 350);

    const statusColor = booking.status === 'CONFIRMED' ? '#2ed573' : '#ff4757';
    doc.fillColor(statusColor).text(booking.status, 360, 350);
    doc.fillColor('#000000'); // Reset

    // -- QR Code --
    // Generate QR Data (Ticket Number is unique)
    const qrData = JSON.stringify({
        ticketId: booking.ticketNumber,
        bookingId: booking._id,
        event: event.title,
        user: booking.user
    });

    try {
        const qrImage = await QRCode.toDataURL(qrData);
        doc.image(qrImage, 350, 300, { width: 150, height: 150 });
    } catch (err) {
        console.error('QR Gen Error:', err);
    }

    // -- Footer --
    doc.fontSize(10).fillColor('#777777').text('Thank you for choosing Lumina Events. Please present this ticket at the venue.', 50, 700, { align: 'center' });

    doc.end();
}

async function generateInvoicePDF(booking, event, res) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // -- Header --
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(`Invoice #: ${booking.invoiceNumber || 'N/A'}`, { align: 'right' });
    doc.text(`Date: ${new Date(booking.invoiceGeneratedAt || Date.now()).toLocaleDateString()}`, { align: 'right' });

    doc.moveDown();
    doc.fontSize(20).text('LUMINA EVENTS', { align: 'left' });
    doc.fontSize(10).text('123 Event Horizon Way');
    doc.text('Silicon Valley, CA 94000');
    doc.text('GSTIN: 99AAAAA0000A1Z5'); // Dummy GST

    doc.moveDown();
    doc.text('Bill To:', { underline: true });
    // Ideally we have user name, but we might only have ID if not populated.
    // Let's assume user is populated or we use ID.
    const userName = booking.user.username || `User ID: ${booking.user}`;
    const userEmail = booking.user.email || '';
    doc.text(userName);
    if (userEmail) doc.text(userEmail);

    doc.moveDown();
    doc.text(`Event: ${event.title}`);
    doc.text(`Date: ${new Date(event.date).toDateString()}`);

    // -- Table Header --
    doc.moveDown(2);
    let y = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, y);
    doc.text('Qty', 300, y, { width: 50, align: 'right' });
    doc.text('Amount', 400, y, { width: 100, align: 'right' });
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();

    // -- Table Rows --
    doc.font('Helvetica');
    y += 25;
    doc.text('Event Ticket - General Admission', 50, y);
    doc.text(booking.ticketQuantity.toString(), 300, y, { width: 50, align: 'right' });
    doc.text(booking.baseAmount ? booking.baseAmount.toFixed(2) : (booking.totalAmount / 1.18).toFixed(2), 400, y, { width: 100, align: 'right' });

    // -- Totals --
    y += 40;
    doc.moveTo(300, y).lineTo(550, y).stroke();
    y += 10;

    doc.text('Subtotal:', 300, y, { width: 100, align: 'right' });
    doc.text(booking.baseAmount ? booking.baseAmount.toFixed(2) : (booking.totalAmount / 1.18).toFixed(2), 400, y, { width: 100, align: 'right' });
    y += 20;

    doc.text('GST (18%):', 300, y, { width: 100, align: 'right' });
    doc.text(booking.gstAmount ? booking.gstAmount.toFixed(2) : (booking.totalAmount - (booking.totalAmount / 1.18)).toFixed(2), 400, y, { width: 100, align: 'right' });
    y += 20;

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', 300, y, { width: 100, align: 'right' });
    doc.text(booking.totalAmount.toFixed(2), 400, y, { width: 100, align: 'right' });

    // -- Footer --
    doc.fontSize(10).font('Helvetica');
    doc.text('Thank you for your business.', 50, 700, { align: 'center' });

    doc.end();
}

module.exports = { generateTicketPDF, generateInvoicePDF };
