const express = require("express");
const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Stats
router.get("/stats", async (req, res) => {

    const { count: users } =
        await supabase
            .from("users")
            .select("*", { count: "exact", head: true });

    const { count: services } =
        await supabase
            .from("services")
            .select("*", { count: "exact", head: true });

    const { count: orders } =
        await supabase
            .from("orders")
            .select("*", { count: "exact", head: true });

    const { count: premiumUsers } =
        await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("is_premium", true);

    res.json({
        success: true,
        users,
        services,
        orders,
        premiumUsers
    });
});

// Users
router.get("/users", async (req, res) => {

    const { data, error } =
        await supabase
            .from("users")
            .select("*");

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    res.json({
        success: true,
        users: data
    });
});

// Orders
router.get("/orders", async (req, res) => {

    const { data, error } =
        await supabase
            .from("orders")
            .select("*")
            .order("created_at", {
                ascending: false
            });

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
});

// Update Order
router.patch("/orders/:id", async (req, res) => {

    const { status } = req.body;

    const { data, error } =
        await supabase
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
});

// Update User
router.patch("/users/:id", async (req, res) => {

    const { role, is_premium } = req.body;

    const { data, error } =
        await supabase
            .from("users")
            .update({
                role,
                is_premium
            })
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
        user: data[0]
    });
});

module.exports = router;