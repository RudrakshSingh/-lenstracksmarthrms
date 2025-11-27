const User = require('../models/User.model');
const Role = require('../models/Role.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

class AdminUserService {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const query = { isDeleted: false };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.role) {
        const role = await Role.findOne({ name: filters.role.toLowerCase() });
        if (role) {
          query.role = role._id;
        }
      }
      if (filters.department) {
        query.department = filters.department;
      }
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { employeeId: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(query)
          .populate('role', 'name display_name')
          .populate('store', 'name code')
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);

      return {
        data: users,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error in getUsers service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await User.findOne({ _id: userId, isDeleted: false })
        .populate('role', 'name display_name permissions')
        .populate('store', 'name code')
        .select('-password')
        .lean();

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      return user;
    } catch (error) {
      logger.error('Error in getUserById service', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData, createdBy) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { employeeId: userData.employeeId.toUpperCase() }
        ],
        isDeleted: false
      });

      if (existingUser) {
        const error = new Error('User with this email or employee ID already exists');
        error.statusCode = 400;
        throw error;
      }

      // Validate role
      const role = await Role.findById(userData.role);
      if (!role) {
        const error = new Error('Invalid role');
        error.statusCode = 400;
        throw error;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = new User({
        ...userData,
        email: userData.email.toLowerCase(),
        employeeId: userData.employeeId.toUpperCase(),
        password: hashedPassword,
        createdBy: createdBy
      });

      await user.save();

      // Return user without password
      const userObj = user.toObject();
      delete userObj.password;

      return userObj;
    } catch (error) {
      logger.error('Error in createUser service', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData, updatedBy) {
    try {
      const user = await User.findOne({ _id: userId, isDeleted: false });

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // If email is being updated, check for duplicates
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          email: updateData.email.toLowerCase(),
          _id: { $ne: userId },
          isDeleted: false
        });

        if (existingUser) {
          const error = new Error('Email already in use');
          error.statusCode = 400;
          throw error;
        }
        updateData.email = updateData.email.toLowerCase();
      }

      // If role is being updated, validate it
      if (updateData.role) {
        const role = await Role.findById(updateData.role);
        if (!role) {
          const error = new Error('Invalid role');
          error.statusCode = 400;
          throw error;
        }
      }

      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Update user
      Object.assign(user, updateData);
      user.updatedBy = updatedBy;
      await user.save();

      // Return user without password
      const userObj = user.toObject();
      delete userObj.password;

      return userObj;
    } catch (error) {
      logger.error('Error in updateUser service', { error: error.message });
      throw error;
    }
  }

  /**
   * Suspend user
   */
  async suspendUser(userId, reason, suspendedBy) {
    try {
      const user = await User.findOne({ _id: userId, isDeleted: false });

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      user.is_active = false;
      user.status = 'terminated';
      user.suspendedAt = new Date();
      user.suspendedBy = suspendedBy;
      user.suspensionReason = reason;
      user.updatedBy = suspendedBy;

      await user.save();

      // Return user without password
      const userObj = user.toObject();
      delete userObj.password;

      return userObj;
    } catch (error) {
      logger.error('Error in suspendUser service', { error: error.message });
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(userId, newPassword, resetBy) {
    try {
      const user = await User.findOne({ _id: userId, isDeleted: false });

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      user.passwordResetAt = new Date();
      user.passwordResetBy = resetBy;
      user.updatedBy = resetBy;

      await user.save();

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Error in resetPassword service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AdminUserService();

