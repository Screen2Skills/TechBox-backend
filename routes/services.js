const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

router.get("/", async (req, res) => {
    try {

        const { data, error } =
            await supabase
                .from("services")
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
            services: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
});
router.post("/", async (req, res) => {

    const {
        title,
        description,
        price,
        billing_type,
        image
    } = req.body;

    const { data, error } =
        await supabase
            .from("services")
            .insert([{
                title,
                description,
                price,
                billing_type,
                image
            }])
            .select();

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    res.status(201).json({
        success: true,
        service: data[0]
    });
});

router.put("/:id", async (req, res) => {

    const {
        title,
        description,
        price,
        billing_type,
        image
    } = req.body;

    const { data, error } =
        await supabase
            .from("services")
            .update({
                title,
                description,
                price,
                billing_type,
                image
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
        service: data[0]
    });
});

router.delete("/:id", async (req, res) => {

    const { error } =
        await supabase
            .from("services")
            .delete()
            .eq("id", req.params.id);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    res.json({
        success: true
    });
});
module.exports = router;