import jwt from "jsonwebtoken";

export const generateTokenAndCookie = (userId, res) => {
    // Generate JWT token 
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    })
    // Set the token in a cookie
    res.cookie('token', token, {
        httpOnly: true,// Prevents client-side JavaScript from accessing the cookie
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    })
    // Return the token for further use if needed
    return token;
    }
