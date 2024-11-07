const jwt = require('jsonwebtoken');

const checkAdminToken = (req, res, next) => {
    const adminAuthToken = req.cookies.adminAuthToken;

    if (!adminAuthToken) {
        return res.status(401).json({ message: 'Admin authentication failed: No admin auth token found.', ok: false });
    }

    jwt.verify(adminAuthToken, process.env.JWT_ADMIN_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Admin authentication failed: Admin auth token has expired.', ok: false });
        } else {
            req.adminId = decoded.adminId;
            next();
        }
    });
}

module.exports = checkAdminToken;