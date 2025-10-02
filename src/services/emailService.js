const { sendEmail } = require('../config/email');
const logger = require('../utils/logger');

/**
 * Email templates
 */
const emailTemplates = {
  // Welcome email template
  welcome: (userName) => ({
    subject: 'Welcome to Kazwab News Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Kazwab!</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for joining the Kazwab News Management System. We're excited to have you on board!</p>
        <p>You can now access all the features available to your account.</p>
        <p>Best regards,<br>The Kazwab Team</p>
      </div>
    `,
    text: `Welcome to Kazwab! Hello ${userName}, Thank you for joining the Kazwab News Management System. We're excited to have you on board!`,
  }),

  // Password reset email template
  passwordReset: (resetLink) => ({
    subject: 'Password Reset Request - Kazwab',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You have requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Kazwab Team</p>
      </div>
    `,
    text: `Password Reset Request - Click this link to reset your password: ${resetLink}`,
  }),

  // Contact form notification template
  contactNotification: (submission) => ({
    subject: `New Contact Form Submission - ${submission.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${submission.name}</p>
        <p><strong>Email:</strong> ${submission.email}</p>
        <p><strong>Phone:</strong> ${submission.phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${submission.subject}</p>
        <p><strong>Message:</strong></p>
        <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">${
          submission.message
        }</p>
        <p>Submitted on: ${new Date(submission.createdAt).toLocaleString()}</p>
      </div>
    `,
    text: `New Contact Form Submission from ${submission.name} (${submission.email}) - Subject: ${submission.subject}`,
  }),

  // Contact form response template
  contactResponse: (submission, response) => ({
    subject: `Re: ${submission.subject} - Kazwab`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Response to Your Inquiry</h2>
        <p>Dear ${submission.name},</p>
        <p>Thank you for contacting us. Here is our response to your inquiry:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Your original message:</strong></p>
          <p>${submission.message}</p>
        </div>
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Our response:</strong></p>
          <p>${response}</p>
        </div>
        <p>If you have any further questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The Kazwab Team</p>
      </div>
    `,
    text: `Response to Your Inquiry - Dear ${submission.name}, Thank you for contacting us. Here is our response: ${response}`,
  }),

  // Newsletter subscription confirmation
  newsletterConfirmation: (email, unsubscribeLink) => ({
    subject: 'Newsletter Subscription Confirmed - Kazwab',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Newsletter Subscription Confirmed</h2>
        <p>Thank you for subscribing to our newsletter!</p>
        <p>You will now receive updates about our latest news, articles, and community initiatives.</p>
        <p>If you wish to unsubscribe at any time, <a href="${unsubscribeLink}">click here</a>.</p>
        <p>Best regards,<br>The Kazwab Team</p>
      </div>
    `,
    text: `Newsletter Subscription Confirmed - Thank you for subscribing to our newsletter! Unsubscribe: ${unsubscribeLink}`,
  }),

  // Newsletter template
  newsletter: (content, unsubscribeLink) => ({
    subject: content.subject || 'Kazwab Newsletter',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Kazwab Newsletter</h2>
        ${content.html}
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          To unsubscribe from this newsletter, <a href="${unsubscribeLink}">click here</a>.
        </p>
      </div>
    `,
    text: `${content.text}\n\nTo unsubscribe: ${unsubscribeLink}`,
  }),

  // Article publication notification
  articlePublished: (article, authorName) => ({
    subject: `Article Published: ${article.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Article Published Successfully</h2>
        <p>Hello ${authorName},</p>
        <p>Your article "<strong>${
          article.title
        }</strong>" has been published successfully.</p>
        <p><strong>Category:</strong> ${article.categoryName}</p>
        <p><strong>Published on:</strong> ${new Date(
          article.publishedAt
        ).toLocaleString()}</p>
        <p>You can view your article on our website.</p>
        <p>Best regards,<br>The Kazwab Team</p>
      </div>
    `,
    text: `Article Published: ${article.title} - Your article has been published successfully.`,
  }),
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const template = emailTemplates.welcome(userName);
    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    logger.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  try {
    const resetLink = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    const template = emailTemplates.passwordReset(resetLink);

    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info(`Password reset email sent to ${userEmail}`);
    return true;
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send contact form notification to admin
 */
const sendContactNotification = async (submission, adminEmails) => {
  try {
    const template = emailTemplates.contactNotification(submission);

    for (const email of adminEmails) {
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    }

    logger.info(
      `Contact notification sent to admins for submission from ${submission.email}`
    );
    return true;
  } catch (error) {
    logger.error('Error sending contact notification:', error);
    return false;
  }
};

/**
 * Send contact form response to user
 */
const sendContactResponse = async (submission, response) => {
  try {
    const template = emailTemplates.contactResponse(submission, response);

    await sendEmail({
      to: submission.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info(`Contact response sent to ${submission.email}`);
    return true;
  } catch (error) {
    logger.error('Error sending contact response:', error);
    return false;
  }
};

/**
 * Send newsletter subscription confirmation
 */
const sendNewsletterConfirmation = async (email, unsubscribeToken) => {
  try {
    const unsubscribeLink = `${process.env.CORS_ORIGIN}/unsubscribe?token=${unsubscribeToken}`;
    const template = emailTemplates.newsletterConfirmation(
      email,
      unsubscribeLink
    );

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info(`Newsletter confirmation sent to ${email}`);
    return true;
  } catch (error) {
    logger.error('Error sending newsletter confirmation:', error);
    return false;
  }
};

/**
 * Send newsletter to subscribers
 */
const sendNewsletter = async (subscribers, content) => {
  try {
    let successCount = 0;
    let failureCount = 0;

    for (const subscriber of subscribers) {
      try {
        const unsubscribeLink = `${process.env.CORS_ORIGIN}/unsubscribe?token=${subscriber.unsubscribeToken}`;
        const template = emailTemplates.newsletter(content, unsubscribeLink);

        await sendEmail({
          to: subscriber.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        successCount++;
        logger.info(`Newsletter sent to ${subscriber.email}`);
      } catch (error) {
        failureCount++;
        logger.error(
          `Failed to send newsletter to ${subscriber.email}:`,
          error
        );
      }
    }

    logger.info(
      `Newsletter campaign completed: ${successCount} successful, ${failureCount} failed`
    );
    return { successCount, failureCount };
  } catch (error) {
    logger.error('Error sending newsletter campaign:', error);
    return { successCount: 0, failureCount: subscribers.length };
  }
};

/**
 * Send article publication notification
 */
const sendArticlePublishedNotification = async (
  article,
  authorEmail,
  authorName
) => {
  try {
    const template = emailTemplates.articlePublished(article, authorName);

    await sendEmail({
      to: authorEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info(`Article published notification sent to ${authorEmail}`);
    return true;
  } catch (error) {
    logger.error('Error sending article published notification:', error);
    return false;
  }
};

/**
 * Send custom email
 */
const sendCustomEmail = async (to, subject, html, text) => {
  try {
    await sendEmail({
      to,
      subject,
      html,
      text,
    });

    logger.info(`Custom email sent to ${to}`);
    return true;
  } catch (error) {
    logger.error('Error sending custom email:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendContactNotification,
  sendContactResponse,
  sendNewsletterConfirmation,
  sendNewsletter,
  sendArticlePublishedNotification,
  sendCustomEmail,
  emailTemplates,
};
