function errorHandler(err, req, res, next) {
  // Always log the full operational details on the server side for system tracking
  console.error("[ERROR]", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // 1. Determine status code: default to 500 if not explicitly set elsewhere
  const statusCode = err.status || err.statusCode || 500;

  // 2. Build response payload
  const errorResponse = {
    error: statusCode === 500 
      ? "Something went wrong on our end. Please try again later." 
      : err.message,
  };

  // 3. Exclude call stacks in production to avoid leaking structural internals
  if (process.env.NODE_ENV === "development") {
    errorResponse.details = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = { errorHandler };