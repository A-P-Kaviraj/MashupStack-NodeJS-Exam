const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: String,
  brand: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

medicineSchema.index({ name: "text", brand: "text" });

const Medicine = mongoose.model("Medicine", medicineSchema);

module.exports = Medicine;
