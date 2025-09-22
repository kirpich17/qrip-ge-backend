const QRCode = require("qrcode");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const Memorial = require("../models/memorial.model"); 


exports.generateQrCode = async (req, res) => {
  try {
    const { memorialId, format = "png", style, size = 800 } = req.body;

    if (!memorialId) {
      return res
        .status(400)
        .json({ status: false, message: "Memorial ID is required" });
    }

    const memorial = await Memorial.findById(memorialId);
    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Allow admin users to generate QR codes for any memorial
    // Regular users can only generate QR codes for their own memorials
    if (req.user.userType !== 'admin' && memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message:
          "Forbidden: You do not have permission to generate a QR code for this memorial.",
      });
    }

    const publicUrl = `${process.env.FRONTEND_URL}/memorial/${memorial._id}?isScan=true`;

    const qrCodeData =
      format === "png"
        ? await QRCode.toBuffer(publicUrl, {
            errorCorrectionLevel: "H",
            margin: 1,
            scale: 20,
            type: "png",
          })
        : await QRCode.toString(publicUrl, {
            errorCorrectionLevel: "H",
            margin: 1,
            type: "svg",
          });

    let finalImage = qrCodeData;
    let contentType = format === "png" ? "image/png" : "image/svg+xml";

    if (format === "png") {
      let sharpInstance = sharp(qrCodeData).resize(size, size);
      if (style === "branded") {
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        const logoBuffer = await fs.readFile(logoPath);
        sharpInstance = sharpInstance.composite([
          { input: logoBuffer, gravity: "center" },
        ]);
      }
      finalImage = await sharpInstance.png().toBuffer();
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="qrip-${memorial.slug}.${format}"`
    );
    res.send(finalImage);
  } catch (error) {
    console.error("QR Code Generation Error:", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to generate QR code" });
  }
};
