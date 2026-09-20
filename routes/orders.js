const express = require("express");
const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create Order
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { product_id, requirements } = req.body;

        const { data, error } = await supabase
            .from("orders")
            .insert([
                {
                    user_id: req.user.id,
                    product_id,
                    requirements,
                    status: "Pending"
                }
            ])
            .select();

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(201).json({
            success: true,
            order: data[0]
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// User's Orders
router.get("/my", authMiddleware, async (req, res) => {
    try {

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            orders: data
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// All Orders (Admin)
router.get("/", async (req, res) => {
    try {

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            orders: data
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// Update Status
router.patch("/:id", async (req, res) => {
    try {

        const { status } = req.body;

        const { data, error } = await supabase
            .from("orders")
            .update({ status })
            .eq("id", req.params.id)
            .select();

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            order: data[0]
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

module.exports = router;