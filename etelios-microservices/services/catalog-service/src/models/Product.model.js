const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant_id: {
    type: String,
    required: true,
    index: true
  },

  // Basic info
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  short_description: {
    type: String,
    trim: true
  },

  // Category & Taxonomy
  category_id: {
    type: String,
    required: true,
    index: true
  },
  subcategory_id: {
    type: String,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public'
  },

  // Vertical-specific attributes
  vertical: {
    type: String,
    enum: ['optical', 'grocery', 'clothing', 'shoes', 'electronics', 'qsr', 'pharmacy', 'general'],
    default: 'general',
    index: true
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Media
  images: [{
    url: String,
    alt_text: String,
    is_primary: {
      type: Boolean,
      default: false
    },
    sort_order: {
      type: Number,
      default: 0
    }
  }],
  videos: [{
    url: String,
    thumbnail: String,
    duration: Number
  }],

  // SEO
  seo: {
    meta_title: String,
    meta_description: String,
    slug: {
      type: String,
      unique: true,
      sparse: true
    },
    keywords: [String]
  },

  // Dimensions & Weight
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      default: 'kg'
    }
  },

  // Barcodes & Identifiers
  barcodes: [{
    type: String,
    trim: true
  }],
  gtin: {
    type: String,
    trim: true
  },
  manufacturer_sku: {
    type: String,
    trim: true
  },

  // Pricing
  base_price: {
    type: Number,
    default: 0
  },
  cost_price: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },

  // Inventory
  track_inventory: {
    type: Boolean,
    default: true
  },
  allow_backorder: {
    type: Boolean,
    default: false
  },
  min_order_qty: {
    type: Number,
    default: 1
  },
  max_order_qty: {
    type: Number,
    default: null
  },

  // Bundles & Kits
  is_bundle: {
    type: Boolean,
    default: false
  },
  bundle_items: [{
    product_id: String,
    sku: String,
    quantity: Number,
    price_override: Number
  }],

  // Digital products
  is_digital: {
    type: Boolean,
    default: false
  },
  digital_files: [{
    name: String,
    url: String,
    size: Number,
    type: String
  }],

  // Warranty & Support
  warranty_period: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'months', 'years'],
      default: 'months'
    }
  },
  support_info: {
    phone: String,
    email: String,
    website: String
  },

  // Analytics
  view_count: {
    type: Number,
    default: 0
  },
  purchase_count: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  published_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
productSchema.index({ tenant_id: 1, status: 1 });
productSchema.index({ tenant_id: 1, category_id: 1 });
productSchema.index({ tenant_id: 1, vertical: 1 });
productSchema.index({ tenant_id: 1, 'seo.slug': 1 });
productSchema.index({ tenant_id: 1, title: 'text', description: 'text' });
productSchema.index({ tenant_id: 1, tags: 1 });
productSchema.index({ tenant_id: 1, barcodes: 1 });

// Instance methods
productSchema.methods.isAvailable = function() {
  return this.status === 'active' && this.visibility === 'public';
};

productSchema.methods.getPrimaryImage = function() {
  const primaryImage = this.images.find(img => img.is_primary);
  return primaryImage || this.images[0] || null;
};

productSchema.methods.incrementViewCount = function() {
  this.view_count += 1;
  return this.save();
};

productSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
