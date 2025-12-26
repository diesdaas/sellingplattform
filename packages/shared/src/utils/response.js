// Standardized response utilities for consistent API responses

export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res, error, statusCode = 500) => {
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }

  // Add validation errors if available
  if (error.errors) {
    response.errors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

export const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

export const sendNoContent = (res) => {
  return res.status(204).send();
};

export const sendPagination = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  });
};

// Helper for building pagination metadata
export const buildPagination = (page, limit, total) => {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
};
