const nodemailer = require('nodemailer');

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date helper
const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tbilisi'
  }).format(new Date(date)).replace('GMT+4', 'GET');
};

// Create transporter with Hetzner SMTP configuration
const createTransporter = () => {
  // Check if SMTP credentials are configured
  if (!process.env.SMTP_PASS) {
    throw new Error('SMTP_PASS environment variable is not set. Please configure your Hetzner email password.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.your-server.de',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
      user: process.env.SMTP_USER || 'info@qrip.ge',
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const getBaseEmailTemplate = (title, content, actionButton = null) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          padding: 20px; 
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
          text-align: center; 
          padding: 20px 0;
          border-bottom: 2px solid #547455;
        }
        .logo {
          max-width: 180px;
          margin-bottom: 10px;
        }
        .content { 
          padding: 30px 0; 
          border-bottom: 1px solid #eee;
        }
        .footer { 
          text-align: center; 
          font-size: 12px; 
          color: #777; 
          padding-top: 20px;
        }
        .action-btn { 
          display: inline-block; 
          background-color: #547455; 
          color: white !important; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          font-weight: bold; 
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .action-btn:hover {
          background-color: #4a634a;
        }
        .success { 
          background-color: #f0f8f0; 
          border-left: 4px solid #28a745; 
          padding: 15px; 
          margin: 20px 0; 
          border-radius: 4px;
        }
        .warning { 
          background-color: #fff8f0; 
          border-left: 4px solid #ffc107; 
          padding: 15px; 
          margin: 20px 0; 
          border-radius: 4px;
        }
        .error { 
          background-color: #fff8f8; 
          border-left: 4px solid #dc3545; 
          padding: 15px; 
          margin: 20px 0; 
          border-radius: 4px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 10px;
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${process.env.FRONTEND_URL}/placeholder-logo.svg" alt="Qrip.ge" class="logo">
          <h1 style="color: #547455; margin: 0;">${title}</h1>
        </div>
        <div class="content">
          ${content}
          ${actionButton ? `<div style="text-align: center; margin: 30px 0;">${actionButton}</div>` : ''}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Qrip.ge All rights reserved.</p>
          <p>This is an automated message. Please do not reply directly to this email.</p>
          <p>Need help? Contact us at <a href="mailto:info@qrip.ge">info@qrip.ge</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email function
const sendEmail = async (to, subject, html, text = null) => {
  try {
    // Validate email format
    const normalizedEmail = to.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      console.error(`❌ Invalid email format: ${normalizedEmail}`);
      return false;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Qrip.ge Support',
        address: process.env.EMAIL_FROM_ADDRESS || 'info@qrip.ge'
      },
      to: normalizedEmail,
      subject: subject,
      html: html,
      text: text,
      replyTo: process.env.EMAIL_REPLY_TO || 'info@qrip.ge'
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${normalizedEmail}: ${subject}`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

// 1. Welcome Email for New Users
const sendWelcomeEmail = async (userEmail, firstName) => {
  const content = `
    <div class="success">
      <h2>Welcome to Qrip.ge!</h2>
      <p>Hello ${firstName || 'User'},</p>
      <p>Thank you for joining Qrip.ge! We're excited to help you create meaningful digital memorials for your loved ones.</p>
      <p>With your account, you can:</p>
      <ul>
        <li>Create beautiful digital memorials</li>
        <li>Generate QR codes for physical memorials</li>
        <li>Share memories with family and friends</li>
        <li>Manage your memorials from anywhere</li>
      </ul>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/" class="action-btn">
      Create Your First Memorial
    </a>
  `;

  return await sendEmail(
    userEmail,
    'Welcome to Qrip.ge - Start Creating Memorials',
    getBaseEmailTemplate('Welcome to Qrip.ge!', content, actionButton),
    `Welcome to Qrip.ge!\n\nHello ${firstName || 'User'},\n\nThank you for joining Qrip.ge! We're excited to help you create meaningful digital memorials for your loved ones.\n\nGet started by creating your first memorial: ${process.env.FRONTEND_URL}/memorial/create\n\nBest regards,\nThe Qrip.ge Team`
  );
};

// 2. Order Confirmation Email
const sendOrderConfirmationEmail = async (userEmail, orderDetails) => {
  const { planName, amount, duration, orderId, transactionId } = orderDetails;
  
  const formattedPrice = new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2
  }).format(amount).replace('GEL', '₾');

  const content = `
    <div class="success">
      <h2>Order Confirmation</h2>
      <p>Thank you for your purchase! Your order has been confirmed.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Duration:</strong> ${duration}</p>
        <p><strong>Amount:</strong> ${formattedPrice}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Date:</strong> ${formatDate(new Date())}</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/dashboard" class="action-btn">
      View Your Dashboard
    </a>
  `;

  return await sendEmail(
    userEmail,
    `Order Confirmation - ${planName} Subscription`,
    getBaseEmailTemplate('Order Confirmed!', content, actionButton),
    `Order Confirmation\n\nThank you for your purchase! Your order has been confirmed.\n\nOrder Details:\nPlan: ${planName}\nDuration: ${duration}\nAmount: ${formattedPrice}\nOrder ID: ${orderId}\nTransaction ID: ${transactionId}\nDate: ${formatDate(new Date())}\n\nView your dashboard: ${process.env.FRONTEND_URL}/dashboard`
  );
};

// 3. Subscription Renewal Reminder Email
const sendSubscriptionRenewalReminderEmail = async (userEmail, subscriptionDetails) => {
  const { planName, expiryDate, renewalAmount } = subscriptionDetails;
  
  const formattedPrice = new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2
  }).format(renewalAmount).replace('GEL', '₾');

  const content = `
    <div class="warning">
      <h2>Subscription Renewal Reminder</h2>
      <p>Your ${planName} subscription will expire on ${formatDate(expiryDate)}.</p>
      <p>To continue enjoying our services, please ensure your payment method is up to date.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Renewal Details:</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Expiry Date:</strong> ${formatDate(expiryDate)}</p>
        <p><strong>Renewal Amount:</strong> ${formattedPrice}</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager" class="action-btn">
      Manage Subscription
    </a>
  `;

  return await sendEmail(
    userEmail,
    `Subscription Renewal Reminder - ${planName}`,
    getBaseEmailTemplate('Subscription Renewal Reminder', content, actionButton),
    `Subscription Renewal Reminder\n\nYour ${planName} subscription will expire on ${formatDate(expiryDate)}.\n\nRenewal Details:\nPlan: ${planName}\nExpiry Date: ${formatDate(expiryDate)}\nRenewal Amount: ${formattedPrice}\n\nManage your subscription: ${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager`
  );
};

// 4. Subscription Success Email
const sendSubscriptionSuccessEmail = async (userEmail, subscriptionDetails) => {
  const { planName, amount, nextBillingDate } = subscriptionDetails;
  
  const formattedPrice = new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2
  }).format(amount).replace('GEL', '₾');

  const content = `
    <div class="success">
      <h2>Subscription Activated Successfully!</h2>
      <p>Your ${planName} subscription is now active and you can start using all the features.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Subscription Details:</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Amount:</strong> ${formattedPrice}</p>
        <p><strong>Next Billing:</strong> ${formatDate(nextBillingDate)}</p>
        <p><strong>Status:</strong> Active</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/memorial/create" class="action-btn">
      Create Your Memorial
    </a>
  `;

  return await sendEmail(
    userEmail,
    `Subscription Activated - ${planName}`,
    getBaseEmailTemplate('Subscription Activated!', content, actionButton),
    `Subscription Activated Successfully!\n\nYour ${planName} subscription is now active.\n\nSubscription Details:\nPlan: ${planName}\nAmount: ${formattedPrice}\nNext Billing: ${formatDate(nextBillingDate)}\nStatus: Active\n\nCreate your memorial: ${process.env.FRONTEND_URL}/memorial/create`
  );
};

// 5. Memorial Creation Confirmation Email
const sendMemorialCreationConfirmationEmail = async (userEmail, memorialDetails) => {
  const { memorialName, memorialUrl, qrCodeUrl } = memorialDetails;

  const content = `
    <div class="success">
      <h2>Memorial Created Successfully!</h2>
      <p>Your digital memorial "${memorialName}" has been created and is now live.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Memorial Details:</h3>
        <p><strong>Name:</strong> ${memorialName}</p>
        <p><strong>URL:</strong> <a href="${memorialUrl}">${memorialUrl}</a></p>
        ${qrCodeUrl ? `<p><strong>QR Code:</strong> <a href="${qrCodeUrl}">Download QR Code</a></p>` : ''}
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${memorialUrl}" class="action-btn">
      View Memorial
    </a>
  `;

  return await sendEmail(
    userEmail,
    `Memorial Created - ${memorialName}`,
    getBaseEmailTemplate('Memorial Created!', content, actionButton),
    `Memorial Created Successfully!\n\nYour digital memorial "${memorialName}" has been created and is now live.\n\nMemorial Details:\nName: ${memorialName}\nURL: ${memorialUrl}\n${qrCodeUrl ? `QR Code: ${qrCodeUrl}` : ''}\n\nView your memorial: ${memorialUrl}`
  );
};

// 6. QR Sticker Order Confirmation Email
const sendQRStickerOrderConfirmationEmail = async (userEmail, orderDetails) => {
  const { stickerType, quantity, amount, shippingAddress } = orderDetails;
  
  const formattedPrice = new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2
  }).format(amount).replace('GEL', '₾');

  const content = `
    <div class="success">
      <h2>QR Sticker Order Confirmed!</h2>
      <p>Thank you for your QR sticker order. Your stickers will be shipped to the provided address.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Sticker Type:</strong> ${stickerType}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Amount:</strong> ${formattedPrice}</p>
        <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/dashboard" class="action-btn">
      Track Your Order
    </a>
  `;

  return await sendEmail(
    userEmail,
    `QR Sticker Order Confirmation`,
    getBaseEmailTemplate('Order Confirmed!', content, actionButton),
    `QR Sticker Order Confirmed!\n\nThank you for your QR sticker order.\n\nOrder Details:\nSticker Type: ${stickerType}\nQuantity: ${quantity}\nAmount: ${formattedPrice}\nShipping Address: ${shippingAddress}\n\nTrack your order: ${process.env.FRONTEND_URL}/dashboard`
  );
};

// 7. Updated Payment Failure Email (replacing the old one)
const sendPaymentFailureEmail = async (
  recipientEmail,
  planName,
  planPrice,
  retryCount,
  maxRetries,
  nextRetryDate = null
) => {
  try {
    const isFinalAttempt = retryCount >= maxRetries;
    const userActionRequired = isFinalAttempt || retryCount === maxRetries - 1;

    const formattedPrice = new Intl.NumberFormat('ka-GE', {
      style: 'currency',
      currency: 'GEL',
      minimumFractionDigits: 2
    }).format(planPrice).replace('GEL', '₾');

    const content = `
      <div class="error">
        <h2>${userActionRequired ? 'Action Required: Payment Failed' : 'Payment Issue with Your Subscription'}</h2>
        <p>We couldn't process your payment of ${formattedPrice} for ${planName}.</p>
        ${isFinalAttempt 
          ? '<p><strong>FINAL ATTEMPT FAILED! Your subscription has been suspended.</strong></p>' 
          : `<p>We'll automatically retry on: ${formatDate(nextRetryDate)}<br>Attempt: ${retryCount} of ${maxRetries}</p>`
        }
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>To resolve this:</h3>
          <ol>
            <li>Visit Subscription Manager: <a href="${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager">Manage Subscription</a></li>
            <li>Cancel your current subscription</li>
            <li>Resubscribe with new payment details</li>
          </ol>
          <h3>Common Solutions:</h3>
          <ul>
            <li>Ensure sufficient funds are available</li>
            <li>Contact your bank if transactions are blocked</li>
            <li>Try a different payment card</li>
            <li>Verify card expiration date and CVV</li>
          </ul>
        </div>
      </div>
    `;

    const actionButton = `
      <a href="${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager" class="action-btn">
        Update Payment Method
      </a>
    `;

    return await sendEmail(
      recipientEmail,
      userActionRequired
        ? `❗ Action Required: Payment Failed for ${planName}`
        : `Payment Issue with Your ${planName} Subscription`,
      getBaseEmailTemplate(
        userActionRequired ? 'Action Required: Payment Failed' : 'Payment Issue',
        content,
        actionButton
      ),
      `Payment Notification\n\nDear Valued Customer,\n\nWe couldn't process your payment of ${formattedPrice} for ${planName}.\n${
        isFinalAttempt 
          ? "FINAL ATTEMPT FAILED! Your subscription has been suspended.\n" 
          : `We'll automatically retry on: ${formatDate(nextRetryDate)}\nAttempt: ${retryCount} of ${maxRetries}\n`
      }\nUpdate Payment Method:\n${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager\n\nTo resolve this:\n1. Visit Subscription Manager: ${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager\n2. Cancel your current subscription\n3. Resubscribe with new payment details\n\nCommon Solutions:\n• Ensure sufficient funds are available\n• Contact your bank if transactions are blocked\n• Try a different payment card\n• Verify card expiration date and CVV\n\nNeed immediate help? Contact support:\nEmail: info@qrip.ge`
    );
    
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
    return false;
  }
};

// 8. Password Reset Email (updated to use unified service)
const sendPasswordResetEmail = async (userEmail, resetLink, firstName) => {
  const content = `
    <div class="warning">
      <h2>Password Reset Request</h2>
      <p>Hello ${firstName || 'User'},</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
    </div>
  `;

  const actionButton = `
    <a href="${resetLink}" class="action-btn">
      Reset Password
    </a>
  `;

  return await sendEmail(
    userEmail,
    'Reset your Qrip.ge password',
    getBaseEmailTemplate('Password Reset Request', content, actionButton),
    `Password Reset Request\n\nHello ${firstName || 'User'},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`
  );
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendSubscriptionRenewalReminderEmail,
  sendSubscriptionSuccessEmail,
  sendMemorialCreationConfirmationEmail,
  sendQRStickerOrderConfirmationEmail,
  sendPaymentFailureEmail,
  sendPasswordResetEmail
};
