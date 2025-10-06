// scripts/seedStickerTypes.js
const mongoose = require('mongoose');
const StickerType = require('../models/StickerType');

const seedStickerTypes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qrip', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if sticker types already exist
    const existingTypes = await StickerType.countDocuments();
    if (existingTypes > 0) {
      console.log('Sticker types already exist, skipping seed');
      return;
    }

    // Seed data
    const stickerTypes = [
      {
        name: 'vinyl',
        displayName: 'Vinyl',
        description: 'High-quality vinyl material perfect for outdoor use',
        isActive: true,
        sortOrder: 1,
        specifications: {
          material: 'Premium Vinyl',
          durability: '2-3 years outdoor',
          weatherResistance: 'Waterproof, UV resistant',
          specialFeatures: 'Custom colors available'
        }
      },
      {
        name: 'engraving',
        displayName: 'Engraving',
        description: 'Durable engraved metal for permanent memorials',
        isActive: true,
        sortOrder: 2,
        specifications: {
          material: 'Stainless Steel',
          durability: '10+ years',
          weatherResistance: 'Rust-proof, weather resistant',
          specialFeatures: 'Laser engraved, premium finish'
        }
      },
      {
        name: 'premium',
        displayName: 'Premium',
        description: 'Luxury materials for premium memorials',
        isActive: true,
        sortOrder: 3,
        specifications: {
          material: 'Brass or Bronze',
          durability: '20+ years',
          weatherResistance: 'Weather resistant, patina develops over time',
          specialFeatures: 'Hand-crafted, premium materials'
        }
      }
    ];

    // Insert sticker types
    await StickerType.insertMany(stickerTypes);
    console.log('Sticker types seeded successfully');

  } catch (error) {
    console.error('Error seeding sticker types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedStickerTypes();
}

module.exports = seedStickerTypes;
