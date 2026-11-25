module.exports = async function sendMail(options) {
  console.log('[mailer] email skipped (dev mode):', options && options.subject);
};