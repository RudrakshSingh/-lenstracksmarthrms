const Dashboard = require('../models/Dashboard.model');
const Role = require('../models/Role.model');
const logger = require('../config/logger');

/**
 * Get dashboard layout and widgets for user's role
 */
const getDashboard = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    
    // Get dashboard for user's role
    const dashboard = await Dashboard.findByRole(userRole);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found for your role'
      });
    }

    // Get user's role permissions
    const role = await Role.findByName(userRole);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Filter widgets based on user permissions
    const accessibleWidgets = dashboard.widgets.filter(widget => {
      return widget.permissions.every(permission => 
        role.permissions.includes(permission)
      );
    });

    // Create filtered dashboard response
    const dashboardResponse = {
      ...dashboard.toObject(),
      widgets: accessibleWidgets
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard retrieved successfully',
      data: dashboardResponse
    });

  } catch (error) {
    logger.error('Error in getDashboard controller', { 
      error: error.message, 
      userId: req.user?._id,
      userRole: req.user?.role 
    });
    next(error);
  }
};

/**
 * Get dashboard widgets data
 */
const getDashboardData = async (req, res, next) => {
  try {
    const { widgetId } = req.params;
    const userRole = req.user.role;
    
    // Get dashboard for user's role
    const dashboard = await Dashboard.findByRole(userRole);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found for your role'
      });
    }

    // Find the specific widget
    const widget = dashboard.widgets.find(w => w.widget_id === widgetId);
    
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Check if user has permission to view this widget
    const role = await Role.findByName(userRole);
    const hasPermission = widget.permissions.every(permission => 
      role.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view this widget'
      });
    }

    // Get widget data based on data source
    const widgetData = await getWidgetData(widget, req.user);

    res.status(200).json({
      success: true,
      message: 'Widget data retrieved successfully',
      data: {
        widget: widget,
        data: widgetData
      }
    });

  } catch (error) {
    logger.error('Error in getDashboardData controller', { 
      error: error.message, 
      userId: req.user?._id,
      widgetId: req.params.widgetId 
    });
    next(error);
  }
};

/**
 * Get all available dashboards (Admin/SuperAdmin only)
 */
const getAllDashboards = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    
    // Only Admin and SuperAdmin can view all dashboards
    if (!['admin', 'superadmin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view all dashboards'
      });
    }

    const dashboards = await Dashboard.find({ is_active: true })
      .select('-widgets.permissions')
      .sort({ role: 1 });

    res.status(200).json({
      success: true,
      message: 'All dashboards retrieved successfully',
      data: dashboards
    });

  } catch (error) {
    logger.error('Error in getAllDashboards controller', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Update dashboard layout (Admin/SuperAdmin only)
 */
const updateDashboard = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const { role } = req.params;
    const updateData = req.body;
    
    // Only Admin and SuperAdmin can update dashboards
    if (!['admin', 'superadmin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update dashboards'
      });
    }

    const dashboard = await Dashboard.findOneAndUpdate(
      { role: role.toLowerCase() },
      { 
        ...updateData,
        updated_by: req.user._id
      },
      { new: true, runValidators: true }
    );

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard updated successfully',
      data: dashboard
    });

  } catch (error) {
    logger.error('Error in updateDashboard controller', { 
      error: error.message, 
      userId: req.user?._id,
      role: req.params.role 
    });
    next(error);
  }
};

/**
 * Get widget data based on data source
 */
const getWidgetData = async (widget, user) => {
  const { data_source, widget_type } = widget;
  
  try {
    switch (data_source) {
      case 'attendance':
        return await getAttendanceData(widget_type, user);
      case 'employees':
        return await getEmployeeData(widget_type, user);
      case 'assets':
        return await getAssetData(widget_type, user);
      case 'transfers':
        return await getTransferData(widget_type, user);
      case 'documents':
        return await getDocumentData(widget_type, user);
      case 'stores':
        return await getStoreData(widget_type, user);
      case 'audit_logs':
        return await getAuditLogData(widget_type, user);
      case 'system_metrics':
        return await getSystemMetricsData(widget_type, user);
      case 'compliance':
        return await getComplianceData(widget_type, user);
      default:
        return { message: 'Data source not implemented yet' };
    }
  } catch (error) {
    logger.error('Error getting widget data', { 
      error: error.message, 
      data_source, 
      widget_type 
    });
    return { error: 'Failed to fetch data' };
  }
};

/**
 * Get attendance data for widgets
 */
const getAttendanceData = async (widgetType, user) => {
  // This would integrate with your existing attendance service
  // For now, returning mock data structure
  return {
    type: 'attendance',
    data: {
      totalEmployees: 150,
      presentToday: 142,
      absentToday: 8,
      attendanceRate: 94.67,
      chartData: [
        { date: '2024-01-01', present: 140, absent: 10 },
        { date: '2024-01-02', present: 145, absent: 5 },
        { date: '2024-01-03', present: 142, absent: 8 }
      ]
    }
  };
};

/**
 * Get employee data for widgets
 */
const getEmployeeData = async (widgetType, user) => {
  return {
    type: 'employees',
    data: {
      totalEmployees: 150,
      activeEmployees: 145,
      newHires: 5,
      chartData: [
        { department: 'Sales', count: 45 },
        { department: 'HR', count: 8 },
        { department: 'IT', count: 12 },
        { department: 'Operations', count: 85 }
      ]
    }
  };
};

/**
 * Get asset data for widgets
 */
const getAssetData = async (widgetType, user) => {
  return {
    type: 'assets',
    data: {
      totalAssets: 250,
      assignedAssets: 200,
      unassignedAssets: 50,
      chartData: [
        { category: 'Laptops', count: 80 },
        { category: 'Phones', count: 120 },
        { category: 'Vehicles', count: 50 }
      ]
    }
  };
};

/**
 * Get transfer data for widgets
 */
const getTransferData = async (widgetType, user) => {
  return {
    type: 'transfers',
    data: {
      pendingTransfers: 5,
      approvedTransfers: 12,
      rejectedTransfers: 3,
      recentTransfers: [
        { id: 1, employee: 'John Doe', from: 'Store A', to: 'Store B', status: 'pending' },
        { id: 2, employee: 'Jane Smith', from: 'Store B', to: 'Store C', status: 'approved' }
      ]
    }
  };
};

/**
 * Get document data for widgets
 */
const getDocumentData = async (widgetType, user) => {
  return {
    type: 'documents',
    data: {
      totalDocuments: 500,
      pendingSignatures: 15,
      completedDocuments: 485,
      recentDocuments: [
        { id: 1, name: 'Contract - John Doe', status: 'pending', type: 'contract' },
        { id: 2, name: 'NDA - Jane Smith', status: 'signed', type: 'nda' }
      ]
    }
  };
};

/**
 * Get store data for widgets
 */
const getStoreData = async (widgetType, user) => {
  return {
    type: 'stores',
    data: {
      totalStores: 25,
      activeStores: 23,
      chartData: [
        { store: 'Store A', employees: 15, attendance: 95 },
        { store: 'Store B', employees: 12, attendance: 92 },
        { store: 'Store C', employees: 18, attendance: 88 }
      ]
    }
  };
};

/**
 * Get audit log data for widgets
 */
const getAuditLogData = async (widgetType, user) => {
  return {
    type: 'audit_logs',
    data: {
      recentActivities: [
        { id: 1, action: 'User Login', user: 'John Doe', timestamp: '2024-01-15 10:30:00' },
        { id: 2, action: 'Document Upload', user: 'Jane Smith', timestamp: '2024-01-15 10:25:00' }
      ],
      systemAlerts: [
        { id: 1, type: 'warning', message: 'High memory usage detected', timestamp: '2024-01-15 10:00:00' }
      ]
    }
  };
};

/**
 * Get system metrics data for widgets
 */
const getSystemMetricsData = async (widgetType, user) => {
  return {
    type: 'system_metrics',
    data: {
      serverUptime: '99.9%',
      activeUsers: 45,
      databaseSize: '2.5GB',
      responseTime: '120ms',
      metrics: [
        { name: 'CPU Usage', value: 45, unit: '%' },
        { name: 'Memory Usage', value: 67, unit: '%' },
        { name: 'Disk Usage', value: 34, unit: '%' }
      ]
    }
  };
};

/**
 * Get compliance data for widgets
 */
const getComplianceData = async (widgetType, user) => {
  return {
    type: 'compliance',
    data: {
      overallCompliance: 92,
      poshCompliance: 95,
      ndaCompliance: 88,
      chartData: [
        { month: 'Jan', compliance: 90 },
        { month: 'Feb', compliance: 92 },
        { month: 'Mar', compliance: 94 }
      ]
    }
  };
};

/**
 * Get company statistics for dashboard
 */
const getCompanyStats = async (req, res, next) => {
  try {
    // This would integrate with actual services to get real data
    // For now, returning structure matching frontend expectations
    const stats = {
      totalEmployees: 1250,
      totalRevenue: 5000000,
      totalOrders: 3420,
      totalCustomers: 890,
      monthlyGrowth: 12.5,
      activeProjects: 45
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in getCompanyStats controller', { error: error.message });
    next(error);
  }
};

/**
 * Get top performers for dashboard
 */
const getTopPerformers = async (req, res, next) => {
  try {
    // This would integrate with HR and performance services
    const topPerformers = [
      {
        id: 'emp_001',
        name: 'John Doe',
        department: 'Sales',
        performance: 95.5,
        revenue: 150000,
        avatar: 'https://example.com/avatar.jpg'
      }
    ];

    res.status(200).json({
      success: true,
      data: topPerformers
    });
  } catch (error) {
    logger.error('Error in getTopPerformers controller', { error: error.message });
    next(error);
  }
};

/**
 * Get top sales for dashboard
 */
const getTopSales = async (req, res, next) => {
  try {
    // This would integrate with sales service
    const topSales = [
      {
        id: 'sale_001',
        customerName: 'ABC Corp',
        amount: 25000,
        date: '2024-01-15',
        status: 'completed',
        salesperson: 'Jane Smith'
      }
    ];

    res.status(200).json({
      success: true,
      data: topSales
    });
  } catch (error) {
    logger.error('Error in getTopSales controller', { error: error.message });
    next(error);
  }
};

/**
 * Get recent activities for dashboard
 */
const getRecentActivities = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    
    // This would integrate with audit logs and activity tracking
    const activities = [
      {
        id: 'activity_001',
        type: 'order_created',
        description: 'New order #ORD-001 created',
        timestamp: new Date().toISOString(),
        user: 'John Doe',
        metadata: {
          orderId: 'ORD-001',
          amount: 1500
        }
      }
    ];

    res.status(200).json({
      success: true,
      data: activities.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Error in getRecentActivities controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getDashboard,
  getDashboardData,
  getAllDashboards,
  updateDashboard,
  getCompanyStats,
  getTopPerformers,
  getTopSales,
  getRecentActivities
};
