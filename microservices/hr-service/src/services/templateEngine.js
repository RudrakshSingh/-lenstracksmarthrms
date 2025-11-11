/**
 * Simple template engine for HR Letters
 * Supports {{variable}} syntax
 */

const render = (template, data = {}) => {
  if (!template || typeof template !== 'string') {
    return '';
  }

  // Replace {{variable}} with data values
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    const value = getNestedValue(data, key);
    return value !== undefined && value !== null ? String(value) : match;
  });
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot notation path (e.g., 'employee.name')
 * @returns {*} Value or undefined
 */
const getNestedValue = (obj, path) => {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }
  
  return value;
};

/**
 * Format date for templates
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'DD/MM/YYYY')
 * @returns {string} Formatted date
 */
const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('YY', String(year).slice(-2));
};

/**
 * Format currency for templates
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'INR')
 * @returns {string} Formatted currency
 */
const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

module.exports = {
  render,
  formatDate,
  formatCurrency,
  getNestedValue
};

