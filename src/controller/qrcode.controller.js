
const QRCode = require('qrcode');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const Memorial = require('../models/memorial.model'); // <-- Import the Memorial model

/**
 * @desc    Generates a QR code for a specific memorial owned by the user.
 * @route   POST /api/qrcode/generate
 * @access  Private (User Only)
 */
exports.generateQrCode = async (req, res) => {
  try {
    // ✅ 1. Get memorialId and customization options from the request body
    const { memorialId, format = 'png', style, size = 800 } = req.body;

    if (!memorialId) {
      return res.status(400).json({ status: false, message: 'Memorial ID is required' });
    }

    // ✅ 2. Find the memorial in the database
    const memorial = await Memorial.findById(memorialId);
    if (!memorial) {
        return res.status(404).json({ status: false, message: 'Memorial not found.' });
    }

    // ✅ 3. Authorization Check: Ensure the logged-in user owns this memorial
    if (memorial.createdBy.toString() !== req.user.userId) {
        return res.status(403).json({ status: false, message: 'Forbidden: You do not have permission to generate a QR code for this memorial.' });
    }

    // ✅ 4. Construct the public URL based on the memorial's slug
    // It's best practice to store your frontend's base URL in an environment variable
    const publicUrl = `${process.env.FRONTEND_BASE_URL}/memorial/${memorial.slug}`;
    
    // --- The rest of the generation logic remains the same, using the new 'publicUrl' ---

    const qrCodeData = (format === 'png')
      ? await QRCode.toBuffer(publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 1,
          scale: 20,
          type: 'png'
        })
      : await QRCode.toString(publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 1,
          type: 'svg'
        });

    let finalImage = qrCodeData;
    let contentType = format === 'png' ? 'image/png' : 'image/svg+xml';

    if (format === 'png') {
        let sharpInstance = sharp(qrCodeData).resize(size, size);
        if (style === 'branded') {
            const logoPath = path.join(process.cwd(), 'public', 'logo.png');
            const logoBuffer = await fs.readFile(logoPath);
            sharpInstance = sharpInstance.composite([{ input: logoBuffer, gravity: 'center' }]);
        }
        finalImage = await sharpInstance.png().toBuffer();
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="qrip-${memorial.slug}.${format}"`);
    res.send(finalImage);

  } catch (error) {
    console.error('QR Code Generation Error:', error);
    res.status(500).json({ status: false, message: 'Failed to generate QR code' });
  }
};