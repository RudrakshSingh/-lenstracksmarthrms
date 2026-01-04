/**
 * Plan Details Utility
 * Calculates plan details based on plan name
 */

const PLAN_DETAILS = {
  'Trial': {
    name: 'Trial',
    price: 0,
    currency: 'INR',
    billing: 'Monthly',
    features: ['Basic Features', 'Email Support', 'Up to 10 Users'],
    maxUsers: 10,
    maxStorage: 10, // GB
    maxApiCalls: 10000
  },
  'Basic': {
    name: 'Basic',
    price: 10000,
    currency: 'INR',
    billing: 'Monthly',
    features: ['Up to 50 Users', 'Standard Analytics', 'Email Support', 'Basic Reports'],
    maxUsers: 50,
    maxStorage: 50, // GB
    maxApiCalls: 50000
  },
  'Professional': {
    name: 'Professional',
    price: 25000,
    currency: 'INR',
    billing: 'Monthly',
    features: ['Up to 100 Users', 'Advanced Analytics', 'Priority Support', 'Custom Reports', 'API Access'],
    maxUsers: 100,
    maxStorage: 100, // GB
    maxApiCalls: 100000
  },
  'Enterprise': {
    name: 'Enterprise',
    price: 50000,
    currency: 'INR',
    billing: 'Monthly',
    features: ['Unlimited Users', 'Advanced Analytics', 'Priority Support', 'Custom Integrations', 'Dedicated Account Manager'],
    maxUsers: -1, // Unlimited
    maxStorage: 500, // GB
    maxApiCalls: 500000
  },
  'Enterprise Plus': {
    name: 'Enterprise Plus',
    price: 100000,
    currency: 'INR',
    billing: 'Monthly',
    features: ['Unlimited Users', 'Advanced Analytics', '24/7 Priority Support', 'Custom Integrations', 'Dedicated Account Manager', 'SLA Guarantee'],
    maxUsers: -1, // Unlimited
    maxStorage: 1000, // GB
    maxApiCalls: 1000000
  }
};

/**
 * Get plan details
 * @param {string} planName - Plan name (Trial, Basic, Professional, Enterprise, Enterprise Plus)
 * @returns {object} Plan details
 */
function getPlanDetails(planName) {
  const normalizedPlan = planName?.charAt(0).toUpperCase() + planName?.slice(1).toLowerCase();
  return PLAN_DETAILS[normalizedPlan] || PLAN_DETAILS['Basic'];
}

/**
 * Calculate subscription dates
 * @param {string} planName - Plan name
 * @returns {object} Subscription dates
 */
function calculateSubscriptionDates(planName) {
  const startDate = new Date();
  let endDate = new Date();
  let renewalDate = new Date();

  // Trial plans expire in 30 days
  if (planName?.toLowerCase() === 'trial') {
    endDate.setDate(startDate.getDate() + 30);
    renewalDate = new Date(endDate);
  } else {
    // Monthly billing - 1 month
    endDate.setMonth(startDate.getMonth() + 1);
    renewalDate = new Date(endDate);
  }

  return {
    startDate,
    endDate,
    renewalDate
  };
}

/**
 * Get payment status based on plan
 * @param {string} planName - Plan name
 * @returns {string} Payment status
 */
function getPaymentStatus(planName) {
  if (planName?.toLowerCase() === 'trial') {
    return 'Free';
  }
  return 'Pending';
}

module.exports = {
  getPlanDetails,
  calculateSubscriptionDates,
  getPaymentStatus,
  PLAN_DETAILS
};

