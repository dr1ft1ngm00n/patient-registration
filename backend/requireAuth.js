// Middleware that blocks any request without a valid, logged-in session.
// Apply this to any route that shouldn't be reachable by an anonymous caller.

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "You must be logged in to access this resource." });
  }
  next();
}

module.exports = { requireAuth };