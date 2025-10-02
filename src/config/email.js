const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
const createTransporter = () => {
  // Check if email configuration is available
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    logger.warn(
      'Email configuration not found. Email features will be disabled.'
    );
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Test email connection
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn('Email service not configured');
      return false;
    }
    await transporter.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed:', error);
    return false;
  }
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn('Email service not configured, skipping email send');
      return { messageId: 'no-email-service' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@kazwab.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

module.exports = {
  createTransporter,
  testEmailConnection,
  sendEmail,
};
