/**
 * Core authentication middleware.
 * Blocks any request without a valid, logged-in session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "You must be logged in to access this resource." });
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware generator.
 * Restricts access to specific authorized user roles.
 * * @param {string[]} allowedRoles - Array of roles permitted to access the route (e.g., ['ADMIN', 'DOCTOR'])
 */
function authorizeRoles(allowedRoles) {
  return (req, res, next) => {
    // First, ensure they are authenticated
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "You must be logged in to access this resource." });
    }

    // Next, check if their session role matches the allowed criteria
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ 
        error: "Access denied. You do not have the required permissions to perform this action." 
      });
    }

    next();
  };
}

module.exports = { 
  requireAuth,
  authorizeRoles
};