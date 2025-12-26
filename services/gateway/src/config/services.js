// Service discovery configuration
export const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: 30000,
    retries: 3
  },
  payment: {
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
    timeout: 30000,
    retries: 3
  },
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:5000',
    timeout: 30000,
    retries: 3
  }
};

// Health check endpoints
export const healthEndpoints = {
  auth: '/health',
  payment: '/health',
  backend: '/health'
};

// Service status cache
let serviceStatus = {};
const CACHE_TTL = 30000; // 30 seconds

export const getServiceStatus = async (serviceName) => {
  const now = Date.now();
  const cached = serviceStatus[serviceName];

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.status;
  }

  try {
    const service = services[serviceName];
    if (!service) return { healthy: false, error: 'Service not configured' };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${service.url}${healthEndpoints[serviceName]}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });

    clearTimeout(timeoutId);

    const healthy = response.ok;
    serviceStatus[serviceName] = {
      healthy,
      timestamp: now,
      responseTime: Date.now() - now
    };

    return serviceStatus[serviceName];

  } catch (error) {
    serviceStatus[serviceName] = {
      healthy: false,
      timestamp: now,
      error: error.message
    };

    return serviceStatus[serviceName];
  }
};

export const getAllServiceStatus = async () => {
  const status = {};
  for (const serviceName of Object.keys(services)) {
    status[serviceName] = await getServiceStatus(serviceName);
  }
  return status;
};
