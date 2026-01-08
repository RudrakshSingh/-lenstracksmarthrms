// MongoDB initialization script for HRMS
// This script runs when the MongoDB container starts for the first time

// Switch to the HRMS database
db = db.getSiblingDB('hrms');

// Create application user
db.createUser({
  user: 'hrms_user',
  pwd: 'hrms_password',
  roles: [
    {
      role: 'readWrite',
      db: 'hrms'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employeeId', 'firstName', 'lastName', 'email', 'password', 'role', 'hireDate'],
      properties: {
        employeeId: {
          bsonType: 'string',
          description: 'Employee ID must be a string and is required'
        },
        firstName: {
          bsonType: 'string',
          description: 'First name must be a string and is required'
        },
        lastName: {
          bsonType: 'string',
          description: 'Last name must be a string and is required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Email must be a valid email address and is required'
        },
        password: {
          bsonType: 'string',
          minLength: 8,
          description: 'Password must be a string with at least 8 characters and is required'
        },
        role: {
          bsonType: 'objectId',
          description: 'Role must be an ObjectId and is required'
        },
        hireDate: {
          bsonType: 'date',
          description: 'Hire date must be a date and is required'
        },
        status: {
          enum: ['active', 'on_leave', 'terminated', 'pending'],
          description: 'Status must be one of the allowed values'
        }
      }
    }
  }
});

db.createCollection('roles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'permissions'],
      properties: {
        name: {
          bsonType: 'string',
          enum: ['SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee'],
          description: 'Role name must be one of the predefined roles'
        },
        permissions: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Permissions must be an array of strings'
        }
      }
    }
  }
});

db.createCollection('stores', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'location', 'geofenceRadiusKm'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Store name must be a string and is required'
        },
        location: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: {
              enum: ['Point'],
              description: 'Location type must be Point'
            },
            coordinates: {
              bsonType: 'array',
              items: {
                bsonType: 'double'
              },
              minItems: 2,
              maxItems: 2,
              description: 'Coordinates must be an array of exactly 2 numbers [longitude, latitude]'
            }
          }
        },
        geofenceRadiusKm: {
          bsonType: 'double',
          minimum: 0,
          description: 'Geofence radius must be a positive number'
        }
      }
    }
  }
});

db.createCollection('attendances', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employee', 'store', 'clockIn'],
      properties: {
        employee: {
          bsonType: 'objectId',
          description: 'Employee must be an ObjectId and is required'
        },
        store: {
          bsonType: 'objectId',
          description: 'Store must be an ObjectId and is required'
        },
        clockIn: {
          bsonType: 'object',
          required: ['time', 'location'],
          properties: {
            time: {
              bsonType: 'date',
              description: 'Clock in time must be a date'
            },
            location: {
              bsonType: 'object',
              required: ['type', 'coordinates'],
              properties: {
                type: {
                  enum: ['Point'],
                  description: 'Location type must be Point'
                },
                coordinates: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'double'
                  },
                  minItems: 2,
                  maxItems: 2,
                  description: 'Coordinates must be an array of exactly 2 numbers'
                }
              }
            }
          }
        },
        status: {
          enum: ['present', 'absent', 'on_leave', 'holiday'],
          description: 'Status must be one of the allowed values'
        }
      }
    }
  }
});

db.createCollection('transfers', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employee', 'currentStore', 'requestedStore', 'effectiveDate'],
      properties: {
        employee: {
          bsonType: 'objectId',
          description: 'Employee must be an ObjectId and is required'
        },
        currentStore: {
          bsonType: 'objectId',
          description: 'Current store must be an ObjectId and is required'
        },
        requestedStore: {
          bsonType: 'objectId',
          description: 'Requested store must be an ObjectId and is required'
        },
        effectiveDate: {
          bsonType: 'date',
          description: 'Effective date must be a date and is required'
        },
        status: {
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
          description: 'Status must be one of the allowed values'
        }
      }
    }
  }
});

db.createCollection('assets', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'assetId'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Asset name must be a string and is required'
        },
        assetId: {
          bsonType: 'string',
          description: 'Asset ID must be a string and is required'
        },
        status: {
          enum: ['assigned', 'available', 'maintenance', 'retired'],
          description: 'Status must be one of the allowed values'
        }
      }
    }
  }
});

db.createCollection('documents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employee', 'title', 'documentType', 'file'],
      properties: {
        employee: {
          bsonType: 'objectId',
          description: 'Employee must be an ObjectId and is required'
        },
        title: {
          bsonType: 'string',
          description: 'Document title must be a string and is required'
        },
        documentType: {
          enum: ['ID_PROOF', 'ADDRESS_PROOF', 'CONTRACT', 'RESUME', 'CERTIFICATE', 'OTHER'],
          description: 'Document type must be one of the allowed values'
        },
        file: {
          bsonType: 'object',
          required: ['url', 'public_id'],
          properties: {
            url: {
              bsonType: 'string',
              description: 'File URL must be a string and is required'
            },
            public_id: {
              bsonType: 'string',
              description: 'File public ID must be a string and is required'
            }
          }
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ employeeId: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ store: 1 });
db.users.createIndex({ status: 1 });

db.roles.createIndex({ name: 1 }, { unique: true });

db.stores.createIndex({ location: '2dsphere' });
db.stores.createIndex({ name: 1 }, { unique: true });
db.stores.createIndex({ manager: 1 });

db.attendances.createIndex({ employee: 1, 'clockIn.time': -1 });
db.attendances.createIndex({ store: 1, 'clockIn.time': -1 });

db.transfers.createIndex({ employee: 1, status: 1 });
db.transfers.createIndex({ currentStore: 1 });
db.transfers.createIndex({ requestedStore: 1 });

db.assets.createIndex({ assetId: 1 }, { unique: true });
db.assets.createIndex({ assignedTo: 1 });
db.assets.createIndex({ status: 1 });

db.documents.createIndex({ employee: 1, documentType: 1 });
db.documents.createIndex({ title: 1 });

print('HRMS database initialized successfully!');
print('Collections created: users, roles, stores, attendances, transfers, assets, documents');
print('Indexes created for optimal performance');
print('Application user created: hrms_user');
