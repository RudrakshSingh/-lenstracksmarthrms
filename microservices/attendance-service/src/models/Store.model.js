const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema(
  {
    name: { type: String },
    code: { type: String },
    location: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Store', StoreSchema);

