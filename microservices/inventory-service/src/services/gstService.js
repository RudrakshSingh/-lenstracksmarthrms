const logger = require('../config/logger');

/**
 * GST Service
 * Handles GST calculations and HSN code validation
 */
class GSTService {
  /**
   * Calculate bulk GST for multiple items
   * @param {Array} items - Array of items with price, quantity, and HSN code
   * @returns {Object} GST calculation results
   */
  async calculateBulkGST(items) {
    try {
      const results = {
        items: [],
        total: {
          taxable_value: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total_gst: 0,
          grand_total: 0
        }
      };

      for (const item of items) {
        const { price, quantity = 1, hsnCode, gstRate = 18, isInterState = false } = item;
        const taxableValue = price * quantity;
        const gstAmount = (taxableValue * gstRate) / 100;

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (isInterState) {
          // Inter-state: IGST applies
          igst = gstAmount;
        } else {
          // Intra-state: CGST + SGST applies
          cgst = gstAmount / 2;
          sgst = gstAmount / 2;
        }

        const itemTotal = taxableValue + gstAmount;

        results.items.push({
          hsnCode,
          price,
          quantity,
          taxable_value: taxableValue,
          gst_rate: gstRate,
          cgst,
          sgst,
          igst,
          total_gst: gstAmount,
          total: itemTotal
        });

        results.total.taxable_value += taxableValue;
        results.total.cgst += cgst;
        results.total.sgst += sgst;
        results.total.igst += igst;
        results.total.total_gst += gstAmount;
        results.total.grand_total += itemTotal;
      }

      return results;
    } catch (error) {
      logger.error('Error calculating bulk GST:', error);
      throw error;
    }
  }

  /**
   * Validate HSN code format
   * @param {string} hsnCode - HSN code to validate
   * @returns {Object} Validation result with HSN details
   */
  async validateHSNCode(hsnCode) {
    try {
      if (!hsnCode || typeof hsnCode !== 'string') {
        return {
          valid: false,
          error: 'HSN code is required and must be a string'
        };
      }

      // Remove spaces and convert to uppercase
      const cleanedCode = hsnCode.replace(/\s+/g, '').toUpperCase();

      // HSN codes are typically 4, 6, or 8 digits
      if (!/^\d{4,8}$/.test(cleanedCode)) {
        return {
          valid: false,
          error: 'HSN code must be 4, 6, or 8 digits'
        };
      }

      // Determine GST rate based on HSN code (simplified - in production, use a database)
      const gstRate = this.getGSTRateByHSN(cleanedCode);

      return {
        valid: true,
        hsnCode: cleanedCode,
        gstRate,
        description: this.getHSNDescription(cleanedCode)
      };
    } catch (error) {
      logger.error('Error validating HSN code:', error);
      throw error;
    }
  }

  /**
   * Get GST rate by HSN code (simplified mapping)
   * @param {string} hsnCode - HSN code
   * @returns {number} GST rate percentage
   */
  getGSTRateByHSN(hsnCode) {
    // Simplified mapping - in production, use a database or API
    const hsnPrefix = hsnCode.substring(0, 2);
    
    // Common GST rates by HSN prefix
    const rateMap = {
      '90': 18, // Optical instruments
      '85': 18, // Electrical machinery
      '84': 18, // Machinery
      '39': 18, // Plastics
      '30': 12, // Pharmaceutical products
      '61': 5,  // Articles of apparel
      '62': 5,  // Articles of apparel
      '64': 18, // Footwear
      '71': 3   // Precious stones
    };

    return rateMap[hsnPrefix] || 18; // Default to 18%
  }

  /**
   * Get HSN description (simplified)
   * @param {string} hsnCode - HSN code
   * @returns {string} Description
   */
  getHSNDescription(hsnCode) {
    // Simplified - in production, use a database
    const hsnPrefix = hsnCode.substring(0, 2);
    
    const descriptionMap = {
      '90': 'Optical, photographic, cinematographic, measuring, checking, precision, medical or surgical instruments',
      '85': 'Electrical machinery and equipment',
      '84': 'Nuclear reactors, boilers, machinery and mechanical appliances',
      '39': 'Plastics and articles thereof',
      '30': 'Pharmaceutical products',
      '61': 'Articles of apparel and clothing accessories',
      '62': 'Articles of apparel and clothing accessories',
      '64': 'Footwear, gaiters and the like',
      '71': 'Natural or cultured pearls, precious or semi-precious stones'
    };

    return descriptionMap[hsnPrefix] || 'Other goods';
  }
}

module.exports = new GSTService();

