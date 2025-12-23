const logger = require('../utils/logger');

// Load balancing strategies
const STRATEGIES = {
  ROUND_ROBIN: 'round_robin',
  LEAST_CONNECTIONS: 'least_connections',
  RANDOM: 'random',
  WEIGHTED_ROUND_ROBIN: 'weighted_round_robin'
};

// Service instance registry
const serviceInstances = new Map();
const instanceMetrics = new Map();

// Load balancer configuration per service
const loadBalancerConfig = {
  'auth-service': { strategy: STRATEGIES.LEAST_CONNECTIONS, maxConnections: 100 },
  'hr-service': { strategy: STRATEGIES.ROUND_ROBIN, maxConnections: 50 },
  'attendance-service': { strategy: STRATEGIES.ROUND_ROBIN, maxConnections: 30 },
  'default': { strategy: STRATEGIES.ROUND_ROBIN, maxConnections: 25 }
};

// Round-robin index tracking
const roundRobinIndex = new Map();

// Register service instances (for future use with service discovery)
function registerServiceInstance(serviceName, instanceUrl, weight = 1) {
  if (!serviceInstances.has(serviceName)) {
    serviceInstances.set(serviceName, []);
  }

  const instances = serviceInstances.get(serviceName);
  const existingIndex = instances.findIndex(inst => inst.url === instanceUrl);

  if (existingIndex >= 0) {
    // Update existing instance
    instances[existingIndex] = { url: instanceUrl, weight, connections: 0, lastUsed: Date.now() };
  } else {
    // Add new instance
    instances.push({ url: instanceUrl, weight, connections: 0, lastUsed: Date.now() });
  }

  logger.info(`Registered service instance: ${serviceName} -> ${instanceUrl}`, {
    service: serviceName,
    instance: instanceUrl,
    totalInstances: instances.length
  });
}

// Unregister service instance
function unregisterServiceInstance(serviceName, instanceUrl) {
  const instances = serviceInstances.get(serviceName);
  if (instances) {
    const filtered = instances.filter(inst => inst.url !== instanceUrl);
    serviceInstances.set(serviceName, filtered);
    logger.info(`Unregistered service instance: ${serviceName} -> ${instanceUrl}`);
  }
}

// Get next instance using load balancing strategy
function getNextInstance(serviceName) {
  const instances = serviceInstances.get(serviceName);

  // If no instances registered, return null (fallback to original URL)
  if (!instances || instances.length === 0) {
    return null;
  }

  // If only one instance, return it
  if (instances.length === 1) {
    instances[0].lastUsed = Date.now();
    return instances[0].url;
  }

  const config = loadBalancerConfig[serviceName] || loadBalancerConfig.default;

  let selectedInstance;

  switch (config.strategy) {
    case STRATEGIES.LEAST_CONNECTIONS:
      selectedInstance = getLeastConnectionsInstance(instances);
      break;
    case STRATEGIES.RANDOM:
      selectedInstance = getRandomInstance(instances);
      break;
    case STRATEGIES.WEIGHTED_ROUND_ROBIN:
      selectedInstance = getWeightedRoundRobinInstance(serviceName, instances);
      break;
    case STRATEGIES.ROUND_ROBIN:
    default:
      selectedInstance = getRoundRobinInstance(serviceName, instances);
      break;
  }

  if (selectedInstance) {
    selectedInstance.connections = (selectedInstance.connections || 0) + 1;
    selectedInstance.lastUsed = Date.now();

    logger.debug(`Load balanced ${serviceName} -> ${selectedInstance.url}`, {
      service: serviceName,
      strategy: config.strategy,
      instance: selectedInstance.url,
      connections: selectedInstance.connections
    });
  }

  return selectedInstance ? selectedInstance.url : null;
}

// Round-robin strategy
function getRoundRobinInstance(serviceName, instances) {
  const currentIndex = roundRobinIndex.get(serviceName) || 0;
  const instance = instances[currentIndex];
  roundRobinIndex.set(serviceName, (currentIndex + 1) % instances.length);
  return instance;
}

// Least connections strategy
function getLeastConnectionsInstance(instances) {
  return instances.reduce((min, current) =>
    (current.connections || 0) < (min.connections || 0) ? current : min
  );
}

// Random strategy
function getRandomInstance(instances) {
  const randomIndex = Math.floor(Math.random() * instances.length);
  return instances[randomIndex];
}

// Weighted round-robin strategy
function getWeightedRoundRobinInstance(serviceName, instances) {
  const totalWeight = instances.reduce((sum, inst) => sum + (inst.weight || 1), 0);
  const currentWeight = roundRobinIndex.get(`${serviceName}_weight`) || 0;

  let cumulativeWeight = 0;
  for (const instance of instances) {
    cumulativeWeight += instance.weight || 1;
    if (currentWeight < cumulativeWeight) {
      roundRobinIndex.set(`${serviceName}_weight`, (currentWeight + 1) % totalWeight);
      return instance;
    }
  }

  // Fallback to first instance
  roundRobinIndex.set(`${serviceName}_weight`, 1);
  return instances[0];
}

// Track connection completion (decrement connection count)
function completeConnection(serviceName, instanceUrl) {
  const instances = serviceInstances.get(serviceName);
  if (instances) {
    const instance = instances.find(inst => inst.url === instanceUrl);
    if (instance && instance.connections > 0) {
      instance.connections--;
    }
  }
}

// Get service health metrics
function getLoadBalancerMetrics() {
  const metrics = {};

  for (const [serviceName, instances] of serviceInstances) {
    metrics[serviceName] = {
      instances: instances.length,
      totalConnections: instances.reduce((sum, inst) => sum + (inst.connections || 0), 0),
      strategy: (loadBalancerConfig[serviceName] || loadBalancerConfig.default).strategy,
      instanceDetails: instances.map(inst => ({
        url: inst.url,
        connections: inst.connections || 0,
        weight: inst.weight || 1,
        lastUsed: inst.lastUsed
      }))
    };
  }

  return metrics;
}

// Initialize with current services (for backward compatibility)
function initializeWithCurrentServices(servicesConfig) {
  const services = servicesConfig.getAllServices();

  for (const [serviceName, service] of Object.entries(services)) {
    if (!service.isWebSocket) {
      registerServiceInstance(serviceName, service.url);
    }
  }

  logger.info('Initialized load balancer with current services', {
    servicesCount: Object.keys(services).length
  });
}

module.exports = {
  registerServiceInstance,
  unregisterServiceInstance,
  getNextInstance,
  completeConnection,
  getLoadBalancerMetrics,
  initializeWithCurrentServices,
  STRATEGIES
};
