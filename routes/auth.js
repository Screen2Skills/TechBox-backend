const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");

const router = express.Router();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        await supabase
            .from("otp_codes")
            .insert([
                {
                    email,
                    otp
                }
            ]);

        console.log("Generated OTP:", otp);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "TechBox Verification Code",
            html: `
                <h2>TechBox Email Verification</h2>
                <p>Your OTP is:</p>
                <h1>${otp}</h1>
                <p>This code is required to complete your signup.</p>
            `
        });

        res.json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/verify-otp", async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        if (!name || !email || !password || !otp) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const { data: otpRecord } = await supabase
            .from("otp_codes")
            .select("*")
            .eq("email", email)
            .eq("otp", otp)
            .single();
         
        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        const otpTime = new Date(otpRecord.created_at).getTime();
        const currentTime = Date.now();

        const diffMinutes = (currentTime - otpTime) / (1000 * 60);

        if (diffMinutes > 10) {
            await supabase
            .from("otp_codes")
            .delete()
            .eq("email", email);

            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: user, error: userError } = await supabase
            .from("users")
            .insert([
                {
                    name,
                    email,
                    password: hashedPassword
                }
            ])
            .select()
            .single();

        if (userError) {
            return res.status(400).json({
                success: false,
                message: userError.message
            });
        }

        await supabase
            .from("otp_codes")
            .delete()
            .eq("email", email);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            message: "User created successfully",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.get("/me", authMiddleware, async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

module.exports = router;