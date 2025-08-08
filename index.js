const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");

const adminRoutes = require("./src/routes/admin.routes");
const memorialRoutes = require("./src/routes/memorial.routes");
const qrCodeRoutes = require("./src/routes/qrcode.routes");
const paymentRouter = require("./src/routes/payment.routes");
const userRoutes = require("./src/routes/user.routes");
const subscriptionRoutes = require("./src/routes/subscriptions.routes");

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

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/memorials", memorialRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/qrcode", qrCodeRoutes);
app.use('/api/payments', paymentRouter);
app.use('/', (req, res) => {
  res.send("Hello Everyone");
})
// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
