const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const envFile =
  process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envFile) });

require('./src/service/subscriptionLifecycle');

const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const memorialRoutes = require('./src/routes/memorial.routes');
const qrCodeRoutes = require('./src/routes/qrcode.routes');
const paymentRouter = require('./src/routes/payment.routes');
const termRouter = require('./src/routes/terms.routes');
const userRoutes = require('./src/routes/user.routes');
const subscriptionRoutes = require('./src/routes/subscriptions.routes');
const qrStickerRoutes = require('./src/routes/qrSticker.routes');
const adminStickerRoutes = require('./src/routes/adminSticker.routes');
const testimonialRoutes = require('./src/routes/testimonial.routes');
const translationRoutes = require('./src/routes/translation.routes');
const chargeRecurringSubscriptions = require('./src/service/bog-cron-jobs');

const app = express();

// ✅ Enable CORS
app.use(cors());

// ✅ Accept JSON
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() =>
    console.log(`MongoDB connected to ${process.env.NODE_ENV} database`)
  )
  .catch((err) => console.error('MongoDB connection error:', err));

cron.schedule(
  '0 2 * * *',
  () => {
    console.log('Running the daily recurring subscription job at 2:00 AM...');
    chargeRecurringSubscriptions();
  },
  {
    timezone: 'Asia/Tbilisi',
  }
);

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminStickerRoutes);
app.use('/api/memorials', memorialRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/qrcode', qrCodeRoutes);
app.use('/api/stickers', qrStickerRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/payments', paymentRouter);
app.use('/api/terms', termRouter);

// ✅ Start Server
const PORT = process.env.PORT || 4040;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
