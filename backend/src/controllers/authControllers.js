import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { generateTokenAndCookie } from "../utils/generateTokenAndCookies.js";

function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return "Invalid username format.Username can only contain letters, numbers, and underscores and cannot have spaces.";
    }
    if (username.length < 3 || username.length > 20) {
        return "Username must be between 3 and 20 characters.";
    }
    return null;
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (typeof password !== "string" || password.length < 6 || !passwordRegex.test(password)) {
        return "Invalid password format:Password must be at least 6 characters long, contain at least one uppercase letter, one number, and one special character.";
    }
    return null;
}

export async function getUser(req, res) {
    try {
        // Check if user is authenticated
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).json(user);// Return user data without password
    } catch (error) {
        res.status(500).json({error:"Server Error"});
    }
}

// This function handles user signup
export async function userSignup(req, res) {
    try {
        // Destructure the request body
        const { username, fullname, email, password } = req.body;
        console.log(req.body);
        if (!username || !fullname || !email || !password) {
            return res.status(400).json({error:"All fields are required"});
        }
        const usernameError = validateUsername(username);
        if (usernameError) {
            return res.status(400).json({error: usernameError});
        }
        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({error:"Invalid email format"});
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({error: passwordError});
        }
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }]        
        })
        if (existingUser) {
            return res.status(400).json({error:"User already exists"});
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new user
        const newUser = new User({
            username,
            fullname,
            email,
            password: hashedPassword
        }); 
        await newUser.save();
        // Jwt token generation
        generateTokenAndCookie(newUser._id, res);
        // Send success response
        res.status(201).json({
            message: "User created successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                fullname: newUser.fullname,
                email: newUser.email
            }
        });
    } catch (error) {
        res.status(500).json({error:"Server Error"});
    }

}

// This function handles user login
export async function userLogin(req, res) {
    try {
        // Destructure the request body
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({error:"Username and password are required"});
        }
        // Find the user by username
        const user = await User.findOne({username});
        // Check if user exists and password is valid
        const isPasswordValid = user && await bcrypt.compare(password, user.password || "");
        // If user does not exist or password is invalid, return an error
        if (!user || !isPasswordValid) {
            return res.status(401).json({error:"Invalid username or password"});
        }
        // Generate JWT token and set cookie
        generateTokenAndCookie(user._id, res);
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                username: user.username,
                fullname: user.fullname,
                email: user.email
            }})
    } catch (error) {
        res.status(500).json({error:"Server Error"});
    }
}

// This function handles user logout
export async function userLogout(req, res) {
    try {
        // Clear the cookie by setting it to an empty value and a past expiration date
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 0 // Set maxAge to 0 to delete the cookie
        });     
        res.status(200).json({message:"Logout successful"});
    } catch (error) {
        res.status(500).json({error:"Server Error"});
    }
}

//This function delete account of user
export async function deleteUser(req, res) {
    const user = await User.findByIdAndDelete(req.user._id);
    try {
          // Clear the cookie by setting it to an empty value and a past expiration date
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 0 // Set maxAge to 0 to delete the cookie
        });     
        res.status(200).json({message:"User deleted successfully"});
    } catch (error) {
        res.status(500).json({error:"Server Error"});
    }
}

export async function updateProfile(req, res) {
    try {
        const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
        const fullname = typeof req.body?.fullname === "string" ? req.body.fullname.trim() : "";

        if (!username && !fullname) {
            return res.status(400).json({ error: "username or fullname is required" });
        }

        const update = {};

        if (username) {
            const usernameError = validateUsername(username);
            if (usernameError) return res.status(400).json({ error: usernameError });

            const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
            if (existing) return res.status(400).json({ error: "Username already exists" });
            update.username = username;
        }

        if (fullname) {
            update.fullname = fullname;
        }

        const updated = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
        return res.status(200).json({ user: updated });
    } catch (error) {
        return res.status(500).json({ error: error?.message || "Server Error" });
    }
}

export async function updatePassword(req, res) {
    try {
        const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
        const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "currentPassword and newPassword are required" });
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password || "");
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        return res.status(500).json({ error: error?.message || "Server Error" });
    }
}