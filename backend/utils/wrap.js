// Lets async route handlers throw; errors go to the error handler in server.js
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
