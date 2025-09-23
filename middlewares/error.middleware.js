/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Default error status code and message
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    
    // Handle specific types of errors
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = err.message;
    } else if (err.name === "UnauthorizedError" || err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Authentication error";
    } else if (err.name === "ForbiddenError") {
      statusCode = 403;
      message = "Access forbidden";
    } else if (err.name === "NotFoundError") {
      statusCode = 404;
      message = "Resource not found";
    }
  
    // Send response
    res.status(statusCode).json({
      message: message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
  };
  
  // Custom error types
  class NotFoundError extends Error {
    constructor(message = "Resource not found") {
      super(message);
      this.name = "NotFoundError";
      this.statusCode = 404;
    }
  }
  
  class ValidationError extends Error {
    constructor(message = "Validation error") {
      super(message);
      this.name = "ValidationError";
      this.statusCode = 400;
    }
  }
  
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required") {
      super(message);
      this.name = "UnauthorizedError";
      this.statusCode = 401;
    }
  }
  
  class ForbiddenError extends Error {
    constructor(message = "Access forbidden") {
      super(message);
      this.name = "ForbiddenError";
      this.statusCode = 403;
    }
  }
  
  module.exports = {
    errorHandler,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError
};