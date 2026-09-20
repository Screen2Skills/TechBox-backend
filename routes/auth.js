const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { Resend } = require("resend");

const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================
// SEND OTP (REGISTER)
// ==========================
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
            .insert([{ email, otp }]);
console.log("OTP generated");

console.log("Before Resend");

const { error: emailError } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "TechBox Verification Code",
    html: `
        <div style="font-family: Arial, sans-serif;">
            <h2>TechBox Verification</h2>
            <p>Your verification code is:</p>
            <h1>${otp}</h1>
            <p>This code expires in 10 minutes.</p>
        </div>
    `
});

if (emailError) {
    console.error(emailError);

    return res.status(500).json({
        success: false,
        message: "Failed to send OTP email"
    });
}

console.log("After Resend");
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

// ==========================
// VERIFY OTP + REGISTER
// ==========================
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

        const otpTime = new Date(
            otpRecord.created_at
        ).getTime();

        const diffMinutes =
            (Date.now() - otpTime) /
            (1000 * 60);

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

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const { data: user, error: userError } =
            await supabase
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

// ==========================
// LOGIN
// ==========================
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
        email: user.email,
        role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
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

// ==========================
// FORGOT PASSWORD SEND OTP
// ==========================
router.post("/forgot-password/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        await supabase
            .from("otp_codes")
            .insert([{ email, otp }]);

        const { error: emailError } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "TechBox Password Reset Code",
    html: `
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Valid for 10 minutes.</p>
    `
});

if (emailError) {
    console.error(emailError);

    return res.status(500).json({
        success: false,
        message: "Failed to send reset OTP"
    });
}

        res.json({
            success: true,
            message: "Reset OTP sent successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ==========================
// FORGOT PASSWORD VERIFY OTP
// ==========================
router.post("/forgot-password/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

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

        res.json({
            success: true,
            message: "OTP verified successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ==========================
// RESET PASSWORD
// ==========================
router.post("/forgot-password/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

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

        const hashedPassword =
            await bcrypt.hash(newPassword, 10);

        const { error } = await supabase
            .from("users")
            .update({
                password: hashedPassword
            })
            .eq("email", email);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        await supabase
            .from("otp_codes")
            .delete()
            .eq("email", email);

        res.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ==========================
// CURRENT USER
// ==========================
router.get("/me", authMiddleware, async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

module.exports = router;