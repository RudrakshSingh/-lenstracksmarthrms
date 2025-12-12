const mongoose = require('mongoose');

const teamMembershipSchema = new mongoose.Schema({
  team_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  team_name: {
    type: String,
    required: true,
    trim: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    index: true
  },
  members: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member', 'coordinator'],
      default: 'member'
    },
    joined_at: {
      type: Date,
      default: Date.now
    },
    is_active: {
      type: Boolean,
      default: true
    }
  }],
  leader_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
teamMembershipSchema.index({ store_id: 1, status: 1 });
teamMembershipSchema.index({ 'members.user_id': 1 });
teamMembershipSchema.index({ leader_id: 1 });
teamMembershipSchema.index({ team_id: 1 });

module.exports = mongoose.model('TeamMembership', teamMembershipSchema);

