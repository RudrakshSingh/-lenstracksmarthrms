const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    index: true
  },
  items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    sku: String,
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  total_amount: {
    type: Number,
    required: true
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  tax_amount: {
    type: Number,
    default: 0
  },
  final_amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'upi', 'netbanking', 'other']
  },
  order_date: {
    type: Date,
    default: Date.now,
    index: true
  },
  delivery_date: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ customer_id: 1, order_date: -1 });
orderSchema.index({ store_id: 1, order_date: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ order_id: 1 });

module.exports = mongoose.model('Order', orderSchema);

