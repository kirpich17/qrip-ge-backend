const nodemailer = require('nodemailer');

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date helper (Georgian locale)
const formatDate = (date) => {
  const months = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
  const d = new Date(date);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${year}, ${hours}:${minutes}`;
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
          <h1 style="color: #547455; margin: 0;">${title}</h1>
        </div>
        <div class="content">
          ${content}
          ${actionButton ? `<div style="text-align: center; margin: 30px 0;">${actionButton}</div>` : ''}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} QRIP.ge ყველა უფლება დაცულია.</p>
          <p>ეს არის ავტომატური შეტყობინება. გთხოვთ არ უპასუხოთ პირდაპირ ამ ელფოსტას.</p>
          <p>საჭიროა დახმარება? დაუკავშირდით გვენ: <a href="mailto:info@qrip.ge">info@qrip.ge</a></p>
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
        name: process.env.EMAIL_FROM_NAME || 'QRIP.ge Support',
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
      <h2>QRIP.GE მოგესალმებათ!🪽♾️</h2>
      <p>გამარჯობა ${firstName || 'მომხმარებელო'},</p>
      <p><strong>QRIP.GE პირველი ქართული ციფრული მემორიალია, რომელიც თქვენს მოგონებებს მარადიულად აქცევს!🕊️♾️</strong></p>
      <p>QRIP.GE საშუალებას გაძლევთ:</p>
      <ul>
        <li>შექმნათ ციფრული სივრცე, სადაც შეძლებთ განათავსოთ გარდაცვლილ ადამიანთან დაკავშირებული მოგონებები, ფოტოები, ვიდეოები, გენეოლოგიური ხე და ცხოვრებისეული მიღწევები. 📷🎞️🎥</li>
        <li>შეიძინოთ მემორიალური დაფები უნიკალური QR კოდებით, რომელსაც განათავსებთ თქვენს საყვარელ ადამიანთან დაკავშირებულ ნებისმიერ ადგილას — სასაფლაოზე, ჩარჩოში ან სივრცეში, რომელიც მათ გახსენებთ. 🥀</li>
        <li>მემორიალები შეგიძლიათ დაამზადოთ თქვენი საყვარელი შინაური ცხოველების მოსაგონრადაც. 🐶🐱</li>
        <li>QR კოდი შეგიძლიათ გაუზიაროთ ოჯახის წევრებსა და მეგობრებს მსოფლიოს ნებისმიერ წერტილში. 🌍</li>
      </ul>
      <p><strong>QRIP.GE — შექმენი ციფრული სივრცე მისთვის, ვინც არასოდეს გინდა დაივიწყო. 🪄</strong></p>
    </div>
`;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/" class="action-btn">
      შექმენით თქვენი პირველი მემორიალი
    </a>
  `;

  return await sendEmail(
    userEmail,
    'QRIP.GE მოგესალმებათ!🪽♾️',
    getBaseEmailTemplate('QRIP.GE მოგესალმებათ!🪽♾️', content, actionButton),
    `QRIP.GE მოგესალმებათ!\n\nგამარჯობა ${firstName || 'მომხმარებელო'},\n\nგმადლობთ QRIP.GE-ს არჩევისათვის! შექმენი ციფრული სივრცე მისთვის, ვინც არასოდეს გინდა დაივიწყო. 🪄\n\nდაიწყეთ თქვენი პირველი მემორიალის შექმნით: ${process.env.FRONTEND_URL}/memorial/create\n\nპატივისცემით,\nQRIP.GE-ს გუნდი`
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
      <h2>შეკვეთა დადასტურებულია</h2>
      <p>გმადლობთ თქვენი შესყიდვისთვის! თქვენი შეკვეთა დადასტურდა.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>შეკვეთის დეტალები:</h3>
        <p><strong>გეგმა:</strong> ${planName}</p>
        <p><strong>ხანგრძლივობა:</strong> ${duration}</p>
        <p><strong>თანხა:</strong> ${formattedPrice}</p>
        <p><strong>შეკვეთის ID:</strong> ${orderId}</p>
        <p><strong>ტრანზაქციის ID:</strong> ${transactionId}</p>
        <p><strong>თარიღი:</strong> ${formatDate(new Date())}</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/dashboard" class="action-btn">
      ნახეთ თქვენი პირადი გვერდი
    </a>
  `;

  return await sendEmail(
    userEmail,
    `შეკვეთა დადასტურებულია - ${planName} გამოწერა`,
    getBaseEmailTemplate('შეკვეთა დადასტურებულია!', content, actionButton),
    `შეკვეთა დადასტურებულია\n\nგმადლობთ თქვენი შესყიდვისთვის! თქვენი შეკვეთა დადასტურდა.\n\nშეკვეთის დეტალები:\nგეგმა: ${planName}\nხანგრძლივობა: ${duration}\nთანხა: ${formattedPrice}\nშეკვეთის ID: ${orderId}\nტრანზაქციის ID: ${transactionId}\nთარიღი: ${formatDate(new Date())}\n\nნახეთ თქვენი პირადი გვერდი: ${process.env.FRONTEND_URL}/dashboard`
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
      <h2>გამოწერის განახლების შეხსენება</h2>
      <p>თქვენი ${planName} გამოწერას ვადა გაუვა ${formatDate(expiryDate)}.</p>
      <p>სერვისით კვლავ სარგებლობისათვის, გთხოვთ დარწმუნდეთ, რომ თქვენი გადახდის მეთოდი განახლებულია.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>განახლების დეტალები:</h3>
        <p><strong>გეგმა:</strong> ${planName}</p>
        <p><strong>ვადის გასვლა:</strong> ${formatDate(expiryDate)}</p>
        <p><strong>განახლების თანხა:</strong> ${formattedPrice}</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager" class="action-btn">
      გამოწერა
    </a>
  `;

  return await sendEmail(
    userEmail,
    `გამოწერის განახლების შეხსენება - ${planName}`,
    getBaseEmailTemplate('გამოწერის განახლების შეხსენება', content, actionButton),
    `გამოწერის განახლების შეხსენება\n\nთქვენი ${planName} გამოწერა ვადას გაუვა ${formatDate(expiryDate)}.\n\nგანახლების დეტალები:\nგეგმა: ${planName}\nვადის გასვლა: ${formatDate(expiryDate)}\nგანახლების თანხა: ${formattedPrice}\n\nგარკვეული გამოწერა: ${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager`
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
      <h2>გამოწერილი გეგმა წარმატებით გააქტიურებულია!</h2>
      <p>თქვენი ${planName} გამოწერა ახლა აქტიურია და შეგიძლიათ დაიწყოთ გამოყენება ყველა ფუნქციის.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>გამოწერის დეტალები:</h3>
        <p><strong>გეგმა:</strong> ${planName}</p>
        <p><strong>თანხა:</strong> ${formattedPrice}</p>
        <p><strong>შემდეგი გადახდა:</strong> ${formatDate(nextBillingDate)}</p>
        <p><strong>სტატუსი:</strong> აქტიური</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/memorial/create" class="action-btn">
      შექმენით თქვენი მემორიალი
    </a>
  `;

  return await sendEmail(
    userEmail,
    `გამოწერა გააქტიურებულია - ${planName}`,
    getBaseEmailTemplate('გამოწერა გააქტიურებულია!', content, actionButton),
    `გამოწერა წარმატებით გააქტიურდა!\n\nთქვენი ${planName} გამოწერა ახლა აქტიურია.\n\nგამოწერის დეტალები:\nგეგმა: ${planName}\nთანხა: ${formattedPrice}\nშემდეგი გადახდა: ${formatDate(nextBillingDate)}\nსტატუსი: აქტიური\n\nშექმენით თქვენი მემორიალი: ${process.env.FRONTEND_URL}/memorial/create`
  );
};

// 5. Memorial Creation Confirmation Email
const sendMemorialCreationConfirmationEmail = async (userEmail, memorialDetails) => {
  const { memorialName, memorialUrl, qrCodeUrl } = memorialDetails;

  const content = `
    <div class="success">
      <h2>მემორიალი წარმატებით შეიქმნა!</h2>
      <p>თქვენი ციფრული მემორიალი "${memorialName}" შექმნილია.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>მემორიალის დეტალები:</h3>
        <p><strong>სახელი:</strong> ${memorialName}</p>
        <p><strong>URL:</strong> <a href="${memorialUrl}">${memorialUrl}</a></p>
        ${qrCodeUrl ? `<p><strong>QR კოდი:</strong> <a href="${qrCodeUrl}">გადმოიწერე QR კოდი</a></p>` : ''}
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${memorialUrl}" class="action-btn">
      იხილეთ მემორიალი
    </a>
  `;

  return await sendEmail(
    userEmail,
    `მემორიალი შეიქმნა - ${memorialName}`,
    getBaseEmailTemplate('მემორიალი შეიქმნა!', content, actionButton),
    `მემორიალი წარმატებით შეიქმნა!\n\nთქვენი ციფრული მემორიალი "${memorialName}" შექმნილია.\n\nმემორიალის დეტალები:\nსახელი: ${memorialName}\nURL: ${memorialUrl}\n${qrCodeUrl ? `QR კოდი: ${qrCodeUrl}` : ''}\n\nიხილეთ თქვენი მემორიალი: ${memorialUrl}`
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
      <h2>QR სტიკერის შეკვეთა დადასტურებულია!</h2>
      <p>გმადლობთ თქვენი QR სტიკერის შეკვეთისთვის. თქვენი სტიკერები გაიგზავნება მითითებულ მისამართზე.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>შეკვეთის დეტალები:</h3>
        <p><strong>სტიკერის ტიპი:</strong> ${stickerType}</p>
        <p><strong>რაოდენობა:</strong> ${quantity}</p>
        <p><strong>თანხა:</strong> ${formattedPrice}</p>
        <p><strong>მიწოდების მისამართი:</strong> ${shippingAddress}</p>
      </div>
    </div>
  `;

  const actionButton = `
    <a href="${process.env.FRONTEND_URL}/dashboard" class="action-btn">
      თვალყურის დევნა თქვენი შეკვეთის
    </a>
  `;

  return await sendEmail(
    userEmail,
    `QR სტიკერის შეკვეთა დადასტურებულია`,
    getBaseEmailTemplate('შეკვეთა დადასტურებულია!', content, actionButton),
    `QR სტიკერის შეკვეთა დადასტურებულია!\n\nგმადლობთ თქვენი QR სტიკერის შეკვეთისთვის.\n\nშეკვეთის დეტალები:\nსტიკერის ტიპი: ${stickerType}\nრაოდენობა: ${quantity}\nთანხა: ${formattedPrice}\nმიწოდების მისამართი: ${shippingAddress}\n\nთვალყურის დევნა თქვენი შეკვეთის: ${process.env.FRONTEND_URL}/dashboard`
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
        <h2>${userActionRequired ? ' გადახდა ვერ განხორციელდა' : 'დაფიქსირდა გადახდის პრობლემა'}</h2>
        <p>გადახდა ვერ შესრულდა ${formattedPrice} ${planName}-ზე.</p>
        ${isFinalAttempt 
          ? '<p><strong>ბოლო მცდელობა ჩაიშალა! თქვენი გამოწერა შეჩერებულია.</strong></p>' 
          : `<p>ჩვენ ავტომატურად გავიმეორებთ: ${formatDate(nextRetryDate)}<br>მცდელობას: ${retryCount} ${maxRetries}-დან</p>`
        }
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>პრობლემის გადასაჭრელად:</h3>
          <ol>
            <li>ეწვიეთ გამოწერების მენეჯერს: <a href="${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager">გამოწერის მართვა</a></li>
            <li>გააუქმეთ თქვენი ამჟამინდელი გამოწერა</li>
            <li>შეიყვანეთ ახალი გადახდის დეტალები</li>
          </ol>
          <h3>საერთო გადაწყვეტილებები:</h3>
          <ul>
            <li>დარწმუნდით, რომ საკმარისი თანხა გაქვთ ბალანსზე</li>
            <li>დაუკავშირდით თქვენს ბანკს, თუ ტრანზაქციები დაბლოკილია</li>
            <li>გამოიყენეთ სხვა ბარათი</li>
            <li>შეამოწმეთ ბარათის ვადის გასვლის თარიღი და CVV</li>
          </ul>
        </div>
      </div>
    `;

    const actionButton = `
      <a href="${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager" class="action-btn">
        გადახდის მეთოდის განახლება
      </a>
    `;

    return await sendEmail(
      recipientEmail,
      userActionRequired
        ? `❗ გადახდა ვერ განხორციელდა ${planName}-ზე`
        : `გადახდის პრობლემა თქვენს ${planName} გამოწერაზე`,
      getBaseEmailTemplate(
        userActionRequired ? 'გადახდა ვერ განხორციელდა' : 'გადახდის პრობლემა',
        content,
        actionButton
      ),
      `გადახდის შეტყობინება\n\nპატივისცემით, ძვირფასო მომხმარებელო,\n\n გადახდა ვერ განხორციელდა ${formattedPrice} ${planName}-ზე.\n${
        isFinalAttempt 
          ? "წარუმატებელი მცდელობა ! თქვენი გამოწერა შეჩერებულია.\n" 
          : `ჩვენ ავტომატურად გავიმეორებთ: ${formatDate(nextRetryDate)}\nმცდელობას: ${retryCount} ${maxRetries}-დან\n`
      }\nგანაახლთ გადახდის მეთოდი:\n${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager\n\nპრობლემის გადასაჭრელად:\n1. ეწვიეთ გამოწერების მენეჯერს: ${process.env.FRONTEND_URL}/dashboard?tab=subscriptionManager\n2. გააუქმეთ თქვენი ამჟამინდელი გამოწერა\n3. შეიყვანეთ თქვენი ახალი გადახდის დეტალებით\n\nსაერთო გადაწყვეტილებები:\n• დარწმუნდით, რომ საკმარისი თანხა გაქვთ ბალანსზე\n• დაუკავშირდით თქვენს ბანკს, თუ ტრანზაქციები დაბლოკილია\n• გამოიყენეთ სხვა ბარათი\n• შეამოწმეთ ბარათის ვადის გასვლის თარიღი და CVV\n\nდახმარებისათვის დაგვიკავშირდით :\nელფოსტა: info@qrip.ge`
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
      <h2>პაროლის გადაყენების მოთხოვნა</h2>
      <p>გამარჯობა ${firstName || 'მომხმარებელო'},</p>
      <p>თქვენ მოითხოვეთ თქვენი პაროლის გადაყენება. დააჭირეთ ქვემოთ მოცემულ ღილაკს რომ გადააყენოთ იგი:</p>
      <p><strong>ეს ლინკი ერთ საათში გაუქმდება.</strong></p>
    </div>
  `;

  const actionButton = `
    <a href="${resetLink}" class="action-btn">
      პაროლის გადაყენება
    </a>
  `;

  return await sendEmail(
    userEmail,
    'გადააყენეთ თქვენი QRIP.GE პაროლი',
    getBaseEmailTemplate('პაროლის გადაყენების მოთხოვნა', content, actionButton),
    `პაროლის გადაყენების მოთხოვნა\n\nგამარჯობა ${firstName || 'მომხმარებელო'},\n\nთქვენ მოითხოვეთ თქვენი პაროლის გადაყენება. დააჭირეთ ქვემოთ მოცემულ ლინკს რომ გადააყენოთ იგი:\n\n${resetLink}\n\nეს ლინკი ერთ საათში გაუქმდება.\n\nთუ თქვენ არ მოგითხოვიათ, გთხოვთ იგნორირება გაუკეთოთ ამ წერილს.`
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
