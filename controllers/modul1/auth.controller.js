const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET;
const jwt = require("jsonwebtoken");

const generateTokens = (user) => {
    const tokenPayload = {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1d" });
    const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "7d",
    });

    return { accessToken, refreshToken };
};

const setCookieOptions = (isProduction) => ({
    httpOnly: true,
    secure: isProduction === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProduction === "production" ? "Strict" : "Lax",
});

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let user = null;
        user = await prisma.peserta.findFirst({ where: { email } });
        if (!user) {
            user = await prisma.pegawai.findFirst({ where: { email } });
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie(
            "refreshToken",
            refreshToken,
            setCookieOptions(process.env.NODE_ENV)
        );
        res.json({
            message: "Login berhasil",
            accessToken,
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const logout = async (req, res) => {
    try {
        // Hapus refresh token dari cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });
        res.status(200).json({
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({
            error: "Error during logout",
            details: error.message || "An unexpected error occurred",
        });
    }
};

const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
    }

    try {
        jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
            if (err) {
                return res
                    .status(403)
                    .json({ error: "Invalid or expired refresh token" });
            }

            // Jika refresh token valid, buat access token baru
            const newAccessToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    nama: user.nama,
                    role: user.role,
                },
                JWT_SECRET,
                { expiresIn: "1d" } // Access token berlaku 1 jam
            );

            res.json({ accessToken: newAccessToken });
        });
    } catch (error) {
        console.error("Refresh Token Error:", error);
        res.status(500).json({
            error: "Error refreshing access token",
            details: error.message || "An unexpected error occurred",
        });
    }
};

module.exports = { login, logout, refreshAccessToken };
