const jwt = require('jsonwebtoken');

const checkAuth = (req, res, next) => {
    const authToken = req.cookies.authToken;
    const refreshToken = req.cookies.refreshToken;

    if (!authToken || !refreshToken) {
        return res.status(401).json({ message: 'Authentication failed: No auth token or refresh token found.', ok: false });
    }

    jwt.verify(authToken, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            // The auth token has expired so we have to check if the refresh token is still valid
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (refreshErr, refreshDecoded) => {
                if (refreshErr) {
                    // Both tokens have expired, so issue error message and prompt user to login again
                    return res.status(401).json({ message: 'Authentication failed: Both tokens have expired.', ok: false });
                } else {
                    // Refresh token is still valid so generate new auth/refresh tokens
                    const newAuthToken = jwt.sign({ userId: refreshDecoded.userId }, process.env.JWT_SECRET_KEY, { expiresIn: '60m' });
                    const newRefreshToken = jwt.sign({ userId: refreshDecoded.userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '120m' });

                    // Save new set of auth/refresh tokens to cookies
                    res.cookie('authToken', newAuthToken, { httpOnly: true });
                    res.cookie('refreshToken', newRefreshToken, { httpOnly: true });

                    // Continue request with new auth token
                    req.userId = refreshDecoded.userId;
                    req.ok = true;
                    next(); 
                }
            });
        } else {
            // The auth token is still valid, so continue the user session (has not reached time limit yet)
            req.userId = decoded.userId;
            next();
        }
    });
}

module.exports = checkAuth;

