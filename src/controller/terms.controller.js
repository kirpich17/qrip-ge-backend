const TermsModel = require("../models/Terms.model");

exports.getTerms = async (req, res) => {
  try {
    const terms = await TermsModel.findOne({ _id: "68c2ad62de3c6fa3e1801013" }).sort(
      { createdAt: -1 }
    ); // latest terms
    if (!terms) {
      return res.status(404).json({ message: "No Terms found" });
    }
    res.json(terms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Terms (by id)
exports.updateTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const { en, ru, ka } = req.body;

    const updateData = {};

    if (en) {
      updateData.en = en; // expect full en object { lastUpdated, note, sections }
    }

    if (ru) {
      updateData.ru = ru;
    }

    if (ka) {
      updateData.ka = ka;
    }

    const terms = await TermsModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!terms) {
      return res.status(404).json({ message: "Terms not found" });
    }

    res.json(terms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Create Terms (initial save)
exports.createTerms = async (req, res) => {
  try {
    const { en, ru, ka } = req.body;

    const newTerms = new TermsModel({ en, ru, ka });
    await newTerms.save();

    res.status(201).json(newTerms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
