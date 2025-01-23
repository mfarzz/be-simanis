const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

const auth = (roles = []) => {
    return async (req, res, next) => {
        try {
            const currentUrl = req.originalUrl || req.url;
            const redirectUrl = req.headers.referer;

            const token = req.headers.authorization?.startsWith("Bearer ")
                ? req.headers.authorization.split(" ")[1]
                : null;
            
            if (!token) {
                return res.status(401).json({ 
                    error: "Unauthorized - Token not provided",
                    redirect: currentUrl
                });
            }

            jwt.verify(token, JWT_SECRET, (err, user) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return res.status(401).json({ 
                            error: "Token expired",
                            redirect: currentUrl,
                            expired: true
                        });
                    }
                    return res.status(401).json({ 
                        error: "Invalid token",
                        redirect: currentUrl
                    });
                }

                // Convert roles to array if string is provided
                const allowedRoles = typeof roles === 'string' ? [roles] : roles;

                // Check roles if specified
                if (allowedRoles.length && !allowedRoles.includes(user.role)) {
                    return res.status(403).json({ 
                        error: "Forbidden - Insufficient permissions",
                        redirect: redirectUrl,
                        userRole: user.role
                    });
                }
                
                req.user = user;
                next();
            });
        } catch (error) {
            console.error("Auth Middleware Error:", error);
            return res.status(500).json({ 
                error: "Authentication error",
                redirect: req.originalUrl || req.url
            });
        }
    };
};

module.exports = { auth };