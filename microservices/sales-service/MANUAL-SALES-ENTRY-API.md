# Manual Sales Entry API Documentation

## Overview
This API endpoint allows creating temporary sales entries without requiring full product/inventory integration. It's designed for quick manual entries when the full product catalog may not be available.

---

## API Endpoint

### Create Manual Sales Entry

**Endpoint:** `POST /api/sales/manual-entry`

**Base URL:** `http://localhost:3007` (or your sales-service URL)

**Authentication:** Required (Bearer Token)

**Authorization:** 
- Roles: `admin`, `manager`, `sales`, `accountant`
- Permission: `create_sales_orders`

---

## Request

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body Schema

```json
{
  "customer_name": "string (required)",
  "customer_phone": "string (optional)",
  "customer_email": "string (optional)",
  "store_id": "ObjectId (required)",
  "order_date": "ISO Date (optional, defaults to current date)",
  "items": [
    {
      "product_name": "string (required)",
      "sku": "string (optional, auto-generated if not provided)",
      "quantity": "number (required, min: 1)",
      "unit_price": "number (required, min: 0)",
      "discount_percentage": "number (optional, default: 0, min: 0, max: 100)",
      "tax_rate": "number (optional, default: 0)"
    }
  ],
  "payment_method": "string (optional, default: 'CASH')",
  "payment_status": "string (optional, default: 'PAID')",
  "payment_reference": "string (optional)",
  "payment_date": "ISO Date (optional)",
  "shipping_charges": "number (optional, default: 0)",
  "delivery_type": "string (optional, default: 'PICKUP')",
  "delivery_address": {
    "street": "string (optional)",
    "city": "string (optional)",
    "state": "string (optional)",
    "pincode": "string (optional)",
    "phone": "string (optional)"
  },
  "special_instructions": "string (optional)",
  "notes": "string (optional)",
  "sales_person_name": "string (optional, defaults to 'Manual Entry')"
}
```

### Payment Method Enum Values
- `CASH`
- `CARD`
- `UPI`
- `NET_BANKING`
- `CHEQUE`
- `EMI`
- `OTHER`

### Payment Status Enum Values
- `PENDING`
- `PARTIAL`
- `PAID`
- `REFUNDED`
- `CANCELLED`

### Delivery Type Enum Values
- `PICKUP`
- `HOME_DELIVERY`
- `STORE_DELIVERY`

---

## Request Examples

### Example 1: Basic Manual Entry
```json
{
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "store_id": "507f1f77bcf86cd799439011",
  "items": [
    {
      "product_name": "Eyeglasses Frame",
      "quantity": 1,
      "unit_price": 2500,
      "discount_percentage": 10,
      "tax_rate": 18
    },
    {
      "product_name": "Lens Coating",
      "quantity": 1,
      "unit_price": 500,
      "tax_rate": 18
    }
  ],
  "payment_method": "CASH",
  "payment_status": "PAID"
}
```

### Example 2: Complete Manual Entry with All Fields
```json
{
  "customer_name": "Jane Smith",
  "customer_phone": "9876543211",
  "customer_email": "jane.smith@example.com",
  "store_id": "507f1f77bcf86cd799439011",
  "order_date": "2024-01-15T10:30:00Z",
  "items": [
    {
      "product_name": "Premium Sunglasses",
      "sku": "SUN-001",
      "quantity": 2,
      "unit_price": 3500,
      "discount_percentage": 15,
      "tax_rate": 18
    }
  ],
  "payment_method": "UPI",
  "payment_status": "PAID",
  "payment_reference": "UPI123456789",
  "payment_date": "2024-01-15T10:35:00Z",
  "shipping_charges": 50,
  "delivery_type": "HOME_DELIVERY",
  "delivery_address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "9876543211"
  },
  "special_instructions": "Handle with care",
  "notes": "Customer requested express delivery",
  "sales_person_name": "Sales Person Name"
}
```

### Example 3: Minimal Entry (Only Required Fields)
```json
{
  "customer_name": "Walk-in Customer",
  "store_id": "507f1f77bcf86cd799439011",
  "items": [
    {
      "product_name": "Contact Lens Solution",
      "quantity": 1,
      "unit_price": 299
    }
  ]
}
```

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Manual sales entry created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "order_number": "ORD-1705312345678-abc12",
    "order_date": "2024-01-15T10:30:00.000Z",
    "store_id": "507f1f77bcf86cd799439011",
    "customer_id": "507f1f77bcf86cd799439013",
    "customer_name": "John Doe",
    "customer_phone": "9876543210",
    "customer_email": "john@example.com",
    "items": [
      {
        "product_name": "Eyeglasses Frame",
        "sku": "MANUAL-1705312345678-xyz45",
        "quantity": 1,
        "unit_price": 2500,
        "discount_percentage": 10,
        "discount_amount": 250,
        "tax_rate": 18,
        "tax_amount": 405,
        "line_total": 2655
      }
    ],
    "subtotal": 2500,
    "total_discount": 250,
    "total_tax": 405,
    "shipping_charges": 0,
    "total_amount": 2655,
    "payment_method": "CASH",
    "payment_status": "PAID",
    "payment_reference": null,
    "payment_date": "2024-01-15T10:30:00.000Z",
    "status": "CONFIRMED",
    "delivery_type": "PICKUP",
    "delivery_address": null,
    "special_instructions": null,
    "notes": "Manual sales entry - temporary",
    "sales_person_id": "507f1f77bcf86cd799439014",
    "sales_person_name": "Manual Entry",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "success": false,
  "message": "Customer name is required",
  "service": "sales-service"
}
```

#### 400 Bad Request - Invalid Items
```json
{
  "success": false,
  "message": "At least one item is required",
  "service": "sales-service"
}
```

#### 400 Bad Request - Invalid Item Data
```json
{
  "success": false,
  "message": "Item must have product_name, quantity, and unit_price",
  "service": "sales-service"
}
```

#### 401 Unauthorized - Missing Token
```json
{
  "success": false,
  "message": "Access token required",
  "hint": "Include Authorization header: Bearer <token>",
  "code": "AUTH_REQUIRED"
}
```

#### 403 Forbidden - Insufficient Permissions
```json
{
  "success": false,
  "message": "Access denied. Insufficient role privileges."
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "service": "sales-service"
}
```

---

## Features

### Automatic Calculations
- **Line Totals**: Calculated as `(unit_price * quantity - discount_amount) + tax_amount`
- **Discount Amount**: Calculated as `(unit_price * quantity * discount_percentage) / 100`
- **Tax Amount**: Calculated as `((unit_price * quantity - discount_amount) * tax_rate) / 100`
- **Order Totals**: Automatically calculated from all items

### Customer Management
- Automatically creates customer record if phone number doesn't exist
- Links existing customer if phone number matches
- Generates unique customer_id if not provided

### Order Number Generation
- Automatically generates unique order number in format: `ORD-{timestamp}-{random}`
- Format: `ORD-1705312345678-abc12`

### SKU Generation
- If SKU not provided, auto-generates in format: `MANUAL-{timestamp}-{random}`
- Format: `MANUAL-1705312345678-xyz45`

---

## cURL Examples

### Basic Request
```bash
curl -X POST http://localhost:3007/api/sales/manual-entry \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "9876543210",
    "store_id": "507f1f77bcf86cd799439011",
    "items": [
      {
        "product_name": "Eyeglasses Frame",
        "quantity": 1,
        "unit_price": 2500,
        "discount_percentage": 10,
        "tax_rate": 18
      }
    ],
    "payment_method": "CASH",
    "payment_status": "PAID"
  }'
```

### Complete Request
```bash
curl -X POST http://localhost:3007/api/sales/manual-entry \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Jane Smith",
    "customer_phone": "9876543211",
    "customer_email": "jane@example.com",
    "store_id": "507f1f77bcf86cd799439011",
    "items": [
      {
        "product_name": "Premium Sunglasses",
        "sku": "SUN-001",
        "quantity": 2,
        "unit_price": 3500,
        "discount_percentage": 15,
        "tax_rate": 18
      }
    ],
    "payment_method": "UPI",
    "payment_status": "PAID",
    "payment_reference": "UPI123456789",
    "shipping_charges": 50,
    "delivery_type": "HOME_DELIVERY",
    "delivery_address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "notes": "Express delivery requested"
  }'
```

---

## JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function createManualSalesEntry() {
  try {
    const response = await axios.post(
      'http://localhost:3007/api/sales/manual-entry',
      {
        customer_name: "John Doe",
        customer_phone: "9876543210",
        store_id: "507f1f77bcf86cd799439011",
        items: [
          {
            product_name: "Eyeglasses Frame",
            quantity: 1,
            unit_price: 2500,
            discount_percentage: 10,
            tax_rate: 18
          }
        ],
        payment_method: "CASH",
        payment_status: "PAID"
      },
      {
        headers: {
          'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Order created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

createManualSalesEntry();
```

---

## Python Example

```python
import requests

def create_manual_sales_entry():
    url = "http://localhost:3007/api/sales/manual-entry"
    headers = {
        "Authorization": f"Bearer {YOUR_JWT_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "customer_name": "John Doe",
        "customer_phone": "9876543210",
        "store_id": "507f1f77bcf86cd799439011",
        "items": [
            {
                "product_name": "Eyeglasses Frame",
                "quantity": 1,
                "unit_price": 2500,
                "discount_percentage": 10,
                "tax_rate": 18
            }
        ],
        "payment_method": "CASH",
        "payment_status": "PAID"
    }
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()

result = create_manual_sales_entry()
print(result)
```

---

## Notes

1. **Temporary Entries**: All manual entries are marked with `"notes": "Manual sales entry - temporary"` to distinguish them from regular sales orders.

2. **No Inventory Validation**: Unlike regular sales orders, manual entries do not validate inventory stock levels or update inventory.

3. **Customer Creation**: If a customer with the provided phone number doesn't exist, a new customer record is automatically created.

4. **Product Variant ID**: The `product_variant_id` field in items is optional for manual entries, allowing entry of products not in the system.

5. **Order Status**: Manual entries are automatically set to `CONFIRMED` status.

6. **Payment Date**: If `payment_status` is `PAID` and `payment_date` is not provided, it defaults to the current date/time.

---

## Related Endpoints

After creating a manual entry, you can use these endpoints to view/manage it:

- **GET** `/api/sales/orders/:orderId` - Get order details
- **GET** `/api/sales/orders` - List all orders (including manual entries)
- **PUT** `/api/sales/orders/:orderId/status` - Update order status

---

## Support

For issues or questions, contact the development team or refer to the main sales service documentation.

