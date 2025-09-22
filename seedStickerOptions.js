// seedStickerOptions.js - Script to seed initial sticker options

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const QRStickerOption = require("./src/models/QRStickerOption");

dotenv.config();

const seedStickerOptions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");

    // Clear existing sticker options
    await QRStickerOption.deleteMany({});
    console.log("Cleared existing sticker options");

    // Seed initial sticker options
    const stickerOptions = [
      {
        name: "Standard Vinyl QR Sticker",
        description: "High-quality vinyl QR code sticker perfect for outdoor use. Weather-resistant and durable.",
        type: "vinyl",
        size: "3x3 inches",
        price: 9.99,
        isActive: true,
        isInStock: true,
        stock: 100,
        specifications: {
          material: "Premium Vinyl",
          dimensions: "3\" x 3\" (76mm x 76mm)",
          durability: "2-3 years outdoor",
          weatherResistance: "Waterproof, UV resistant",
        },
      },
      {
        name: "Large Vinyl QR Sticker",
        description: "Extra large vinyl QR code sticker for better visibility and scanning distance.",
        type: "vinyl",
        size: "5x5 inches",
        price: 14.99,
        isActive: true,
        isInStock: true,
        stock: 50,
        specifications: {
          material: "Premium Vinyl",
          dimensions: "5\" x 5\" (127mm x 127mm)",
          durability: "2-3 years outdoor",
          weatherResistance: "Waterproof, UV resistant",
        },
      },
      {
        name: "Engraved Metal QR Sticker",
        description: "Premium engraved metal QR code sticker for permanent installation. Elegant and long-lasting.",
        type: "engraving",
        size: "4x4 inches",
        price: 24.99,
        isActive: true,
        isInStock: true,
        stock: 25,
        specifications: {
          material: "Anodized Aluminum",
          dimensions: "4\" x 4\" (102mm x 102mm)",
          durability: "10+ years",
          weatherResistance: "Fully weatherproof, corrosion resistant",
        },
      },
      {
        name: "Premium Ceramic QR Sticker",
        description: "Luxury ceramic QR code sticker with elegant finish. Perfect for indoor memorial displays.",
        type: "premium",
        size: "3x3 inches",
        price: 19.99,
        isActive: true,
        isInStock: true,
        stock: 30,
        specifications: {
          material: "High-grade Ceramic",
          dimensions: "3\" x 3\" (76mm x 76mm)",
          durability: "5+ years",
          weatherResistance: "Indoor use recommended",
        },
      },
    ];

    // Insert sticker options
    const createdOptions = await QRStickerOption.insertMany(stickerOptions);
    console.log(`Created ${createdOptions.length} sticker options:`);
    
    createdOptions.forEach(option => {
      console.log(`- ${option.name} (${option.type}, ${option.size}) - $${option.price}`);
    });

    console.log("Sticker options seeded successfully!");
  } catch (error) {
    console.error("Error seeding sticker options:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

// Run the seed function
seedStickerOptions();
