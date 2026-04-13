# Attendance Frontend Implementation Guide
## Selfie + GPS Location (Like Pagarbook)

## 🎯 Overview

The attendance system requires:
1. **Selfie capture** (like Pagarbook app)
2. **GPS location** (latitude, longitude)
3. **Optional additional data** (accuracy, notes, etc.)

---

## 📱 Frontend Implementation

### 1. Camera/Selfie Capture Setup

#### React/Next.js Example

```typescript
import { useState, useRef } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export default function AttendanceClockIn() {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request camera permission and start video stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for selfie
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Camera access denied. Please enable camera permissions.');
    }
  };

  // Capture selfie from video stream
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context?.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create File object from blob
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        setSelfie(file);
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(blob);
        setSelfiePreview(previewUrl);
        
        // Stop camera stream
        stopCamera();
      }
    }, 'image/jpeg', 0.9); // 90% quality
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCapturing(false);
    }
  };

  // Get GPS location
  const getLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true, // Use GPS if available
        timeout: 10000, // 10 seconds timeout
        maximumAge: 0 // Don't use cached location
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || undefined,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  };

  // Clock In with selfie and GPS
  const handleClockIn = async () => {
    try {
      // 1. Validate selfie
      if (!selfie) {
        alert('Please capture a selfie first');
        return;
      }

      // 2. Get GPS location
      const locationData = await getLocation();
      setLocation(locationData);

      // 3. Prepare FormData
      const formData = new FormData();
      formData.append('selfie', selfie); // Field name must be 'selfie'
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      
      if (locationData.accuracy) {
        formData.append('accuracy', locationData.accuracy.toString());
      }
      if (locationData.altitude) {
        formData.append('altitude', locationData.altitude.toString());
      }
      if (locationData.heading) {
        formData.append('heading', locationData.heading.toString());
      }
      if (locationData.speed) {
        formData.append('speed', locationData.speed.toString());
      }
      
      // Optional notes
      formData.append('notes', 'Clock in from mobile app');
      formData.append('timestamp', Date.now().toString());

      // 4. Get auth token
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        alert('Please login first');
        return;
      }

      // 5. Send request
      const response = await fetch(
        'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
            // DON'T set Content-Type header - browser will set it with boundary
          },
          body: formData
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Clock in successful!');
        // Reset form
        setSelfie(null);
        setSelfiePreview(null);
        setLocation(null);
      } else {
        alert(`Clock in failed: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Clock in error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Clock Out with selfie and GPS
  const handleClockOut = async () => {
    try {
      // Same process as clock in
      if (!selfie) {
        alert('Please capture a selfie first');
        return;
      }

      const locationData = await getLocation();
      setLocation(locationData);

      const formData = new FormData();
      formData.append('selfie', selfie);
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      
      if (locationData.accuracy) {
        formData.append('accuracy', locationData.accuracy.toString());
      }
      
      formData.append('notes', 'Clock out from mobile app');
      formData.append('timestamp', Date.now().toString());

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      const response = await fetch(
        'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-out',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          },
          body: formData
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Clock out successful!');
        setSelfie(null);
        setSelfiePreview(null);
        setLocation(null);
      } else {
        alert(`Clock out failed: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Clock out error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="attendance-container">
      <h1>Attendance</h1>

      {/* Camera Preview */}
      {isCapturing && (
        <div className="camera-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video-preview"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <button onClick={captureSelfie}>Capture Selfie</button>
          <button onClick={stopCamera}>Cancel</button>
        </div>
      )}

      {/* Selfie Preview */}
      {selfiePreview && !isCapturing && (
        <div className="selfie-preview">
          <img src={selfiePreview} alt="Selfie preview" />
          <button onClick={() => {
            setSelfie(null);
            setSelfiePreview(null);
            startCamera();
          }}>
            Retake
          </button>
        </div>
      )}

      {/* Location Display */}
      {location && (
        <div className="location-info">
          <p>📍 Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
          {location.accuracy && (
            <p>Accuracy: {location.accuracy.toFixed(0)} meters</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isCapturing && (
        <div className="actions">
          {!selfie && (
            <button onClick={startCamera}>
              📷 Capture Selfie
            </button>
          )}
          
          {selfie && !location && (
            <button onClick={async () => {
              try {
                const loc = await getLocation();
                setLocation(loc);
              } catch (error: any) {
                alert(`Location error: ${error.message}`);
              }
            }}>
              📍 Get Location
            </button>
          )}

          {selfie && location && (
            <>
              <button onClick={handleClockIn}>
                ✅ Clock In
              </button>
              <button onClick={handleClockOut}>
                🏁 Clock Out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 📝 API Details

### Endpoint
```
POST /api/attendance/clock-in
POST /api/attendance/clock-out
```

### Request Format
**Content-Type:** `multipart/form-data` (automatically set by browser)

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selfie` | File | **Yes** | Selfie image file (JPEG/PNG) |
| `latitude` | Number | **Yes** | GPS latitude |
| `longitude` | Number | **Yes** | GPS longitude |
| `accuracy` | Number | No | GPS accuracy in meters |
| `altitude` | Number | No | GPS altitude |
| `heading` | Number | No | GPS heading |
| `speed` | Number | No | GPS speed |
| `notes` | String | No | Optional notes |
| `timestamp` | Number | No | Timestamp (milliseconds) |

### Headers
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Important:** Do NOT set `Content-Type` header manually. Browser will automatically set it with the correct boundary for multipart/form-data.

---

## 🔧 Utility Functions

### Complete Attendance Helper

```typescript
// attendance.ts
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

interface ClockInOutData {
  selfie: File;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  notes?: string;
}

export const clockIn = async (
  token: string,
  tenantId: string,
  data: ClockInOutData
) => {
  const formData = new FormData();
  
  // Required fields
  formData.append('selfie', data.selfie);
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  
  // Optional fields
  if (data.accuracy !== undefined) {
    formData.append('accuracy', data.accuracy.toString());
  }
  if (data.altitude !== undefined) {
    formData.append('altitude', data.altitude.toString());
  }
  if (data.heading !== undefined) {
    formData.append('heading', data.heading.toString());
  }
  if (data.speed !== undefined) {
    formData.append('speed', data.speed.toString());
  }
  if (data.notes) {
    formData.append('notes', data.notes);
  }
  formData.append('timestamp', Date.now().toString());

  const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
      // DON'T set Content-Type - browser handles it
    },
    body: formData
  });

  return await response.json();
};

export const clockOut = async (
  token: string,
  tenantId: string,
  data: ClockInOutData
) => {
  const formData = new FormData();
  
  formData.append('selfie', data.selfie);
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  
  if (data.accuracy !== undefined) {
    formData.append('accuracy', data.accuracy.toString());
  }
  if (data.altitude !== undefined) {
    formData.append('altitude', data.altitude.toString());
  }
  if (data.heading !== undefined) {
    formData.append('heading', data.heading.toString());
  }
  if (data.speed !== undefined) {
    formData.append('speed', data.speed.toString());
  }
  if (data.notes) {
    formData.append('notes', data.notes);
  }
  formData.append('timestamp', Date.now().toString());

  const response = await fetch(`${API_BASE}/api/attendance/clock-out`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    },
    body: formData
  });

  return await response.json();
};

// Get GPS location with high accuracy
export const getCurrentLocation = (): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

// Capture selfie from camera
export const captureSelfieFromCamera = async (): Promise<File> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' }
  });

  const video = document.createElement('video');
  video.srcObject = stream;
  video.play();

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `selfie-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          resolve(file);
        } else {
          reject(new Error('Failed to capture selfie'));
        }
      }, 'image/jpeg', 0.9);
    };
  });
};
```

---

## 🎨 Complete UI Component (Styled)

```typescript
import { useState, useRef } from 'react';
import { clockIn, clockOut, getCurrentLocation, captureSelfieFromCamera } from './attendance';

export default function AttendancePage() {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCaptureSelfie = async () => {
    try {
      const file = await captureSelfieFromCamera();
      setSelfie(file);
      const preview = URL.createObjectURL(file);
      setSelfiePreview(preview);
    } catch (error: any) {
      setError(`Camera error: ${error.message}`);
    }
  };

  const handleGetLocation = async () => {
    try {
      setLoading(true);
      const loc = await getCurrentLocation();
      setLocation(loc);
      setError(null);
    } catch (error: any) {
      setError(`Location error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!selfie || !location) {
      setError('Please capture selfie and get location first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        throw new Error('Please login first');
      }

      const result = await clockIn(token, tenantId, {
        selfie,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes: 'Clock in from mobile app'
      });

      if (result.success) {
        alert('✅ Clock in successful!');
        // Reset
        setSelfie(null);
        setSelfiePreview(null);
        setLocation(null);
      } else {
        throw new Error(result.message || 'Clock in failed');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!selfie || !location) {
      setError('Please capture selfie and get location first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      const result = await clockOut(token, tenantId, {
        selfie,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes: 'Clock out from mobile app'
      });

      if (result.success) {
        alert('✅ Clock out successful!');
        setSelfie(null);
        setSelfiePreview(null);
        setLocation(null);
      } else {
        throw new Error(result.message || 'Clock out failed');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>📸 Attendance</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Selfie Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>1. Capture Selfie</h3>
        {selfiePreview ? (
          <div>
            <img 
              src={selfiePreview} 
              alt="Selfie" 
              style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }}
            />
            <button onClick={() => {
              setSelfie(null);
              setSelfiePreview(null);
            }}>
              Retake
            </button>
          </div>
        ) : (
          <button onClick={handleCaptureSelfie} disabled={loading}>
            📷 Capture Selfie
          </button>
        )}
      </div>

      {/* Location Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>2. Get Location</h3>
        {location ? (
          <div>
            <p>📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
            {location.accuracy && (
              <p>Accuracy: {location.accuracy.toFixed(0)}m</p>
            )}
            <button onClick={handleGetLocation}>Refresh Location</button>
          </div>
        ) : (
          <button onClick={handleGetLocation} disabled={loading}>
            📍 Get Location
          </button>
        )}
      </div>

      {/* Actions */}
      {selfie && location && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleClockIn} 
            disabled={loading}
            style={{ flex: 1, padding: '15px', fontSize: '16px' }}
          >
            ✅ Clock In
          </button>
          <button 
            onClick={handleClockOut} 
            disabled={loading}
            style={{ flex: 1, padding: '15px', fontSize: '16px' }}
          >
            🏁 Clock Out
          </button>
        </div>
      )}

      {loading && <p>Processing...</p>}
    </div>
  );
}
```

---

## ⚠️ Important Notes

1. **Selfie Field Name:** Must be `selfie` (not `selfieFile` or `photo`)
2. **Content-Type:** Don't set manually - browser handles multipart/form-data
3. **GPS Required:** Both latitude and longitude are required
4. **File Format:** JPEG or PNG images accepted
5. **File Size:** Maximum 10MB
6. **Permissions:** Request camera and location permissions

---

## 🧪 Testing

```bash
# Test with curl (if you have a selfie file)
curl -X POST http://API_URL/api/attendance/clock-in \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto" \
  -F "selfie=@selfie.jpg" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777" \
  -F "notes=Test clock in"
```

---

**Complete implementation ready for Pagarbook-style attendance!** 📸📍
