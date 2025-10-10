const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cron =require('node-cron');
require('./src/service/subscriptionLifecycle');
const authRoutes = require("./src/routes/auth.routes");

const adminRoutes = require("./src/routes/admin.routes");
const memorialRoutes = require("./src/routes/memorial.routes");
const qrCodeRoutes = require("./src/routes/qrcode.routes");
const paymentRouter = require("./src/routes/payment.routes");
const termRouter = require("./src/routes/terms.routes");
const userRoutes = require("./src/routes/user.routes");
const subscriptionRoutes = require("./src/routes/subscriptions.routes");
const qrStickerRoutes = require("./src/routes/qrSticker.routes");
const adminStickerRoutes = require("./src/routes/adminSticker.routes");
const testimonialRoutes = require("./src/routes/testimonial.routes");
const chargeRecurringSubscriptions = require("./src/service/bog-cron-jobs");
dotenv.config();
const app = express();

// ✅ Enable CORS
app.use(cors());

// ✅ Accept JSON
app.use(express.json());

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

//   cron.schedule('* * * * * *', () => {
//   chargeRecurringSubscriptions();
// }, {
//   timezone: "Asia/Tbilisi"
// });


// This runs at 2:00 AM every single day.
cron.schedule('0 2 * * *', () => {
  console.log('Running the daily recurring subscription job at 2:00 AM...');
  chargeRecurringSubscriptions();
}, {
  timezone: "Asia/Tbilisi"
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminStickerRoutes);
app.use("/api/memorials", memorialRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/qrcode", qrCodeRoutes);
app.use("/api/stickers", qrStickerRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use('/api/payments', paymentRouter);
app.use('/api/terms', termRouter);
app.use('/', (req, res) => {
  res.send("Hello Everyone");
})
// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
