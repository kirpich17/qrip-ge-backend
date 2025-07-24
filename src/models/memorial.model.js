// models/memorial.model.js

const mongoose = require('mongoose');
const slugify = require('slugify');

// A sub-schema for family members to keep the main schema clean
const FamilyMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: { 
    type: String, 
    required: true,
    // enum: ['Spouse', 'Partner', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Other'] 
  },
  // Optional: link to another memorial if they have one
  memorialLink: { type: mongoose.Schema.Types.ObjectId, ref: 'Memorial' } 
});

const MemorialSchema = new mongoose.Schema({
  // --- Core & Association ---
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Links this memorial to the user who created it
    required: true,
  },
  slug: {
    type: String,
    unique: true, // URL-friendly identifier (e.g., /eleanor-grace-thompson)
    required: true
  },
  qrCode: { type: String }, // URL to the generated QR code image

  // --- Tab 1: Basic Information ---
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  profileImage: { type: String }, // URL to the main photo
  birthDate: { type: Date, required: true },
  deathDate: { type: Date, required: true },
  location: { type: String, trim: true }, // e.g., "Tbilisi, Georgia"
  gps: {
    lat: { type: Number },
    lng: { type: Number }
  },
  lifeStory: { type: String }, // Biography

  // --- Tab 2: Media ---
  photoGallery: [{ type: String }], // Array of image URLs
  videoGallery: [{ // Array of video objects
    title: { type: String },
    url: { type: String } // e.g., YouTube embed URL
  }],
  documents: [{ // Array of document objects
      fileName: { type: String },
      url: { type: String }
  }],

  // --- Tab 3: Family Tree ---
  familyTree: [FamilyMemberSchema],
  
  // --- Tab 4: Settings ---
  isPublic: { type: Boolean, default: true }, // "Public Memorial" toggle
  allowComments: { type: Boolean, default: true },
  enableEmailNotifications: { type: Boolean, default: true },

  // --- Public Page Data ---
  achievements: [{ type: String }], // List for "Achievements & Legacy"
  
  // --- System Managed Fields ---

  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending' // New memorials require approval
  },


  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'], // Controlled by subscription status
    default: 'active',
  },
  plan: {
    type: String,
    enum: ['Starter', 'Plus', 'Premium'], // Example subscription tiers
    default: 'Premium'
  },
  views: { type: Number, default: 0 },

}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Middleware to automatically create a slug from the name before saving
MemorialSchema.pre('validate', function(next) {
  if (this.isModified('firstName') || this.isModified('lastName')) {
    const randomString = Math.random().toString(36).substring(2, 7); // To ensure uniqueness
    this.slug = slugify(`${this.firstName} ${this.lastName} ${randomString}`, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Memorial', MemorialSchema);