const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
});

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  intro: { type: String },
  type: { type: String, enum: ["text", "list"], default: "text" },
  content: { type: String },
  items: [{ type: String }],
});

const languageSchema = new mongoose.Schema({
  lastUpdated: { type: Date, required: true },
  note: noteSchema,
  sections: [sectionSchema],
});

const termsSchema = new mongoose.Schema(
  {
    en: languageSchema,
    ru: languageSchema,
    ka: languageSchema,
  },
  { timestamps: true }
);
module.exports = mongoose.model("Terms", termsSchema);
