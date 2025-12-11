const { default: mongoose } = require('mongoose');

const footerInfoSchema = new mongoose.Schema(
  {
    phone: {
      type: Number,
      required: false,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    isVisibleEmail: { type: Boolean, default: true },
    isVisiblePhone: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const FooterInfo = mongoose.model('FooterInfo', footerInfoSchema);
module.exports = FooterInfo;
