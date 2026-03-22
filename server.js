const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const env = {
  SMTP_HOST: String(process.env.SMTP_HOST || '').trim(),
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: String(process.env.SMTP_SECURE || 'false').trim().toLowerCase() === 'true',
  SMTP_USER: String(process.env.SMTP_USER || '').trim(),
  // Gmail app passwords are often copied with spaces; strip them safely.
  SMTP_PASS: String(process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  SMTP_FROM: String(process.env.SMTP_FROM || '').trim(),
  CONTACT_TO_EMAIL: String(process.env.CONTACT_TO_EMAIL || '').trim(),
};

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO_EMAIL'];
const missingEnv = requiredEnv.filter((key) => !env[key]);

if (missingEnv.length > 0) {
  console.warn(`Missing environment variables: ${missingEnv.join(', ')}`);
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const cleanText = (value) => String(value || '').trim();

app.post('/api/contact', async (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email);
    const message = cleanText(req.body.message);

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const subject = `Portfolio Contact from ${name}`;
    const toEmail = env.CONTACT_TO_EMAIL;

    const textBody = [
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Message:',
      message,
    ].join('\n');

    const htmlBody = `
      <h2>New Portfolio Message</h2>
      <p><strong>Name:</strong> ${name.replace(/</g, '&lt;')}</p>
      <p><strong>Email:</strong> ${email.replace(/</g, '&lt;')}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;">${message.replace(/</g, '&lt;')}</p>
    `;

    await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: toEmail,
      replyTo: email,
      subject,
      text: textBody,
      html: htmlBody,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to send message right now.',
    });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'portfolio.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
