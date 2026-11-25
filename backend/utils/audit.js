const db = require('../config/db');

// Writes one audit log row. Never throws, so a logging problem cannot break a request.
// userOverride is used for events where req.user is not set yet (register, login).
module.exports = async function audit(req, action, entity = null, entityId = null, details = null, userOverride = null) {
  try {
    const u = userOverride || req.user || {};
    await db.query(
      'INSERT INTO audit_logs (user_id,user_name,role,action,entity,entity_id,details,ip_address) VALUES (?,?,?,?,?,?,?,?)',
      [u.id || null, u.name || null, u.role || null, action, entity, entityId,
        details ? JSON.stringify(details) : null, req.ip || null]
    );
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
};
