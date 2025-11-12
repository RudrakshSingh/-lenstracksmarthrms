const AuthService = require('../../src/services/auth.service');
const User = require('../../src/models/User.model');
const Role = require('../../src/models/Role.model');
const { comparePassword } = require('../../src/utils/hashUtils');

describe('AuthService', () => {
  let testRole;
  let testUser;

  beforeEach(async () => {
    // Create a test role
    testRole = new Role({
      name: 'Employee',
      permissions: ['attendance:record', 'attendance:read'],
      description: 'Basic employee access'
    });
    await testRole.save();

    // Create a test user
    testUser = new User({
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      password: 'password123',
      role: testRole._id,
      status: 'active'
    });
    await testUser.save();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        employeeId: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        password: 'password123',
        roleName: 'Employee'
      };

      const result = await AuthService.registerUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.firstName).toBe(userData.firstName);
      expect(result.lastName).toBe(userData.lastName);
      expect(result.role.toString()).toBe(testRole._id.toString());
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        employeeId: 'EMP003',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'john.doe@test.com', // Same email as existing user
        password: 'password123',
        roleName: 'Employee'
      };

      await expect(AuthService.registerUser(userData)).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if role not found', async () => {
      const userData = {
        employeeId: 'EMP004',
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice.brown@test.com',
        password: 'password123',
        roleName: 'NonExistentRole'
      };

      await expect(AuthService.registerUser(userData)).rejects.toThrow('Specified role not found');
    });
  });

  describe('loginUser', () => {
    it('should login user with valid credentials', async () => {
      const result = await AuthService.loginUser('john.doe@test.com', 'password123');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('john.doe@test.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      await expect(AuthService.loginUser('invalid@test.com', 'password123')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      await expect(AuthService.loginUser('john.doe@test.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for terminated user', async () => {
      testUser.status = 'terminated';
      await testUser.save();

      await expect(AuthService.loginUser('john.doe@test.com', 'password123')).rejects.toThrow('Account is inactive or terminated');
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First login to get tokens
      const loginResult = await AuthService.loginUser('john.doe@test.com', 'password123');
      
      const result = await AuthService.refreshToken(loginResult.refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(AuthService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logoutUser', () => {
    it('should logout user successfully', async () => {
      // First login to get tokens
      const loginResult = await AuthService.loginUser('john.doe@test.com', 'password123');
      
      const result = await AuthService.logoutUser(loginResult.refreshToken);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle logout with invalid token gracefully', async () => {
      const result = await AuthService.logoutUser('invalid-token');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});