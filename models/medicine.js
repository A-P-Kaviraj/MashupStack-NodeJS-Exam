const mongoose = require("mongoose");

const MedicineSchema = new mongoose.Schema({
  name: String,
  brand: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Medicine", MedicineSchema);
