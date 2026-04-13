/**
 * Frontend Attendance Component - Complete Fix
 * Handles: 503 errors, empty data, loading states
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';

function AttendanceList() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [message, setMessage] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);

  useEffect(() => {
    fetchAttendanceRecords();
    checkTodayAttendance();
  }, [pagination.page]);

  // Check if user is already clocked in today
  const checkTodayAttendance = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId'); // CRITICAL: Get from storage
      
      // Validate tenantId exists
      if (!tenantId) {
        setError('Tenant ID not found. Please login again.');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/api/attendance/today`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId, // CRITICAL: Use X-Tenant-Id (capital T)
            'x-tenant-id': tenantId // Also send lowercase for compatibility
          }
        }
      );
      
      if (response.data.success && response.data.data?.check_in_time) {
        setIsClockedIn(true);
      }
    } catch (error) {
      // Ignore errors for today check
      setIsClockedIn(false);
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage('');
      
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId'); // CRITICAL: Get from storage
      
      if (!token) {
        setError('Please login to view attendance records');
        setLoading(false);
        return;
      }
      
      // CRITICAL: Validate tenantId exists
      if (!tenantId) {
        setError('Tenant ID not found. Please login again.');
        setLoading(false);
        window.location.href = '/login';
        return;
      }
      
      // ✅ Use correct base URL and endpoint
      const response = await axios.get(
        `${API_BASE_URL}/api/attendance`,
        {
          params: {
            page: pagination.page,
            limit: pagination.limit
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId, // CRITICAL: Use X-Tenant-Id (capital T)
            'x-tenant-id': tenantId // Also send lowercase for compatibility
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      // CRITICAL: Filter by tenantId on frontend (defense in depth)
      if (response.data.success && response.data.data) {
        const filteredRecords = response.data.data.filter(
          (record) => !record.tenantId || record.tenantId === tenantId
        );
        response.data.data = filteredRecords;
      }
      
      if (response.data.success) {
        // ✅ Access data.data (not just data)
        const records = response.data.data || [];
        const paginationData = response.data.pagination || {};
        
        setAttendanceRecords(records);
        setPagination({
          page: paginationData.page || pagination.page,
          limit: paginationData.limit || pagination.limit,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 0
        });
        
        // Handle empty data
        if (records.length === 0) {
          setMessage('No attendance records found. Please clock in to create a record.');
        } else {
          setMessage(response.data.message || '');
        }
      } else {
        setError('Failed to fetch attendance records');
      }
    } catch (error) {
      console.error('Attendance API error:', error);
      
      // ✅ Handle 503 errors with better message
      if (error.response?.status === 503) {
        setError('Attendance service is temporarily unavailable. The service is being updated. Please wait a moment and click "Refresh" to try again.');
      } else if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Optionally redirect to login
      } else if (error.response?.status === 404) {
        setError('Attendance endpoint not found. Please check API configuration.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Request timeout. Please check your connection and try again.');
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to fetch attendance records');
      }
      
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Clock in function
  const handleClockIn = async () => {
    try {
      setClockingIn(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId') || 'upcapto';
      
      // Get user location
      let latitude = 19.0760; // Default Mumbai
      let longitude = 72.8777;
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
          },
          (err) => {
            console.warn('Geolocation error:', err);
            // Use default location
          }
        );
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/attendance/clock-in`,
        {
          latitude: latitude,
          longitude: longitude,
          notes: 'Clock in from web app'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      if (response.data.success) {
        setIsClockedIn(true);
        setMessage('Successfully clocked in!');
        // Refresh attendance records
        await fetchAttendanceRecords();
        await checkTodayAttendance();
      }
    } catch (error) {
      console.error('Clock in error:', error);
      
      if (error.response?.status === 503) {
        setError('Service temporarily unavailable. The attendance service is being updated. Please wait and try again.');
      } else {
        setError(error.response?.data?.message || 'Failed to clock in. Please try again.');
      }
    } finally {
      setClockingIn(false);
    }
  };

  // Clock out function
  const handleClockOut = async () => {
    try {
      setClockingIn(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId') || 'upcapto';
      
      let latitude = 19.0760;
      let longitude = 72.8777;
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
          }
        );
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/attendance/clock-out`,
        {
          latitude: latitude,
          longitude: longitude,
          notes: 'Clock out from web app'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setIsClockedIn(false);
        setMessage('Successfully clocked out!');
        await fetchAttendanceRecords();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to clock out.');
    } finally {
      setClockingIn(false);
    }
  };

  // Retry function
  const handleRetry = () => {
    fetchAttendanceRecords();
  };

  if (loading) {
    return (
      <div className="attendance-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h2>Attendance Records</h2>
        <div className="action-buttons">
          {!isClockedIn ? (
            <button 
              onClick={handleClockIn} 
              disabled={clockingIn}
              className="btn-clock-in"
            >
              {clockingIn ? 'Clocking In...' : 'Clock In'}
            </button>
          ) : (
            <button 
              onClick={handleClockOut} 
              disabled={clockingIn}
              className="btn-clock-out"
            >
              {clockingIn ? 'Clocking Out...' : 'Clock Out'}
            </button>
          )}
          <button onClick={handleRetry} className="btn-refresh">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p className="error-message">❌ {error}</p>
          <button onClick={handleRetry} className="btn-retry">
            Try Again
          </button>
        </div>
      )}

      {message && !error && (
        <div className="info-message">
          <p>{message}</p>
        </div>
      )}

      {attendanceRecords.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Attendance Records</h3>
          <p>You haven't clocked in yet. Click "Clock In" to start tracking your attendance.</p>
          {!isClockedIn && (
            <button onClick={handleClockIn} className="btn-clock-in-large">
              Clock In Now
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="attendance-stats">
            <div className="stat-item">
              <span className="stat-label">Total Records:</span>
              <span className="stat-value">{pagination.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Showing:</span>
              <span className="stat-value">
                {attendanceRecords.length} of {pagination.total}
              </span>
            </div>
          </div>

          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id || record._id}>
                  <td>
                    {record.date 
                      ? new Date(record.date).toLocaleDateString() 
                      : record.check_in_time 
                        ? new Date(record.check_in_time).toLocaleDateString()
                        : '-'}
                  </td>
                  <td>
                    {record.check_in_time 
                      ? new Date(record.check_in_time).toLocaleTimeString()
                      : '-'}
                  </td>
                  <td>
                    {record.check_out_time 
                      ? new Date(record.check_out_time).toLocaleTimeString()
                      : '-'}
                  </td>
                  <td>
                    {record.total_hours 
                      ? `${record.total_hours.toFixed(2)}h`
                      : record.hours_worked
                        ? `${record.hours_worked.toFixed(2)}h`
                        : '-'}
                  </td>
                  <td>
                    <span className={`status-badge status-${record.status?.toLowerCase() || 'unknown'}`}>
                      {record.status || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    {record.check_in_location 
                      ? `${record.check_in_location.latitude?.toFixed(4)}, ${record.check_in_location.longitude?.toFixed(4)}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                disabled={pagination.page === 1}
                className="btn-pagination"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button 
                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-pagination"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AttendanceList;

// CSS Styles (add to your stylesheet)
/*
.attendance-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.attendance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn-clock-in, .btn-clock-out, .btn-refresh, .btn-retry {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
}

.btn-clock-in {
  background: #4CAF50;
  color: white;
}

.btn-clock-out {
  background: #f44336;
  color: white;
}

.btn-refresh, .btn-retry {
  background: #2196F3;
  color: white;
}

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 40px;
}

.error-message {
  color: #f44336;
  font-weight: 600;
}

.empty-state {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.attendance-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.attendance-table th,
.attendance-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.attendance-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-present {
  background: #4CAF50;
  color: white;
}

.status-absent {
  background: #f44336;
  color: white;
}

.status-late {
  background: #ff9800;
  color: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}
*/
