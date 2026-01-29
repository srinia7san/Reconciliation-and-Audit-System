import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Register new user
router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({
            email,
            password: hashedPassword,
            name: name || email.split("@")[0],
            role: "analyst"
        });
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );
        
        res.json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login existing user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;