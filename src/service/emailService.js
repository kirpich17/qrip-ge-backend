const sgMail=require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email validation helper
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Format date with proper Georgian timezone
const formatDate = (date) => {
  if (!date) return 'soon';
  
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tbilisi',
    timeZoneName: 'short'
  }).replace('GMT+4', 'GET');;
};

const sendPaymentFailureEmail = async (
  recipientEmail,
  planName,
  planPrice,
  retryCount,
  maxRetries,
  nextRetryDate = null
) => {
  try {
    // Validate email format
    const normalizedEmail = recipientEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      console.error(`❌ Invalid email format: ${normalizedEmail}`);
      return false;
    }

    const isFinalAttempt = retryCount >= maxRetries;
    const userActionRequired = isFinalAttempt || retryCount === maxRetries - 1;

    // Correct GEL formatting
    const formattedPrice = new Intl.NumberFormat('ka-GE', {
      style: 'currency',
      currency: 'GEL',
      minimumFractionDigits: 2
    }).format(planPrice).replace('GEL', '₾');

    const msg = {
      to: normalizedEmail,
      from: {
        name: "Qrip.ge Support",
        email: process.env.SENDGRID_SENDER_EMAIL,
      },
      subject: userActionRequired
        ? `❗ Action Required: Payment Failed for ${planName}`
        : `Payment Issue with Your ${planName} Subscription`,
      html: `
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
            }
            .logo {
              max-width: 180px;
            }
            .content { 
              padding: 30px 0; 
              border-top: 1px solid #eee;
              border-bottom: 1px solid #eee;
            }
            .urgent { 
              background-color: #fff8f8; 
              border-left: 4px solid #e74c3c; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 4px;
            }
            .troubleshooting { 
              background-color: #f9f9f9; 
              padding: 20px; 
              border-radius: 5px; 
              margin: 25px 0; 
              border: 1px solid #eee;
            }
            .troubleshooting h4 { 
              margin-top: 0; 
              color: #2c3e50;
            }
            .footer { 
              text-align: center; 
              font-size: 12px; 
              color: #777; 
              padding-top: 20px;
            }
            .action-btn { 
              display: inline-block; 
              background-color: #e74c3c; 
              color: white !important; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 4px; 
              font-weight: bold; 
              margin: 20px 0;
              transition: background-color 0.3s;
            }
            .action-btn:hover {
              background-color: #c0392b;
            }
            .attempt-info {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
              color: #e74c3c;
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
              <img src="${process.env.BACKEND_URL}/public/logo.png" alt="Qrip Logo" class="logo">
            </div>
            
            <div class="content">
              <h2>${userActionRequired ? '❗ Action Required' : 'Payment Notification'}</h2>
              
              <p>Dear Customer,</p>
              
              <div class="${userActionRequired ? 'urgent' : ''}">
                <p>We couldn't process your payment of <strong>${formattedPrice}</strong> for <strong>${planName}</strong>.</p>
                
                ${isFinalAttempt ? `
                  <p><strong>FINAL ATTEMPT FAILED!</strong> Your subscription has been suspended.</p>
                ` : `
                  <p>We'll automatically retry on:</p>
                  <p><strong>${formatDate(nextRetryDate)}</strong></p>
                  <div class="attempt-info">Attempt: ${retryCount} of ${maxRetries}</div>
                `}
              </div>
              
        
              
              <div class="troubleshooting">
                <h4>To resolve this:</h4>
                <ol>
                  <li>Visit <a href="${process.env.FRONTEND_URL}/business?tab=subscriptionManager">Subscription Manager</a></li>
                  <li>Cancel your current subscription</li>
                  <li>Resubscribe with your new payment details</li>
                </ol>
                
                <h4>Common Solutions:</h4>
                <ul>
                  <li>Ensure sufficient funds are available</li>
                  <li>Contact your bank if transactions are blocked</li>
                  <li>Try a different payment card</li>
                  <li>Verify card expiration date and CVV</li>
                </ul>
              </div>
              
              <p>Need immediate help? Contact our support team:</p>
              <p>
                <a href="mailto:info@qrip.ge">info@qrip.ge</a> | 
                <a href="tel:+995322123456">+995 32 212 34 56</a>
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply directly to this email.</p>
              <p>© ${new Date().getFullYear()} Qrip.ge All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Payment Notification\n\n
Dear Valued Customer,\n\n
We couldn't process your payment of ${formattedPrice} for ${planName}.\n
${
  isFinalAttempt 
  ? "FINAL ATTEMPT FAILED! Your subscription has been suspended.\n" 
  : `We'll automatically retry on: ${formatDate(nextRetryDate)}\nAttempt: ${retryCount} of ${maxRetries}\n`
}\n
Update Payment Method:\n${process.env.FRONTEND_URL}/business?tab=subscriptionManager\n\n
To resolve this:\n
1. Visit Subscription Manager: ${process.env.FRONTEND_URL}/business?tab=subscriptionManager
2. Cancel your current subscription
3. Resubscribe with new payment details\n\n
Common Solutions:\n
• Ensure sufficient funds are available\n
• Contact your bank if transactions are blocked\n
• Try a different payment card\n
• Verify card expiration date and CVV\n\n
Need immediate help? Contact support:\n
Email: info@qrip.ge\n

This is an automated message. Please do not reply directly to this email.\n
© ${new Date().getFullYear()} MyDiscount.ge`
    };

    await sgMail.send(msg);
    console.log(`📧 Sent payment failure email to ${normalizedEmail}`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
    if (error.response) console.error('SendGrid error details:', error.response.body);
    return false;
  }
};

module.exports = {
  sendPaymentFailureEmail
};