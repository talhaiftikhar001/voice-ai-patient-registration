require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { z } = require("zod");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_API_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Warning: Supabase URL or Key is missing from environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Zod Validation Schema for Patient Data
const patientSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),

    date_of_birth: z.string().refine(
        (date) => {
            const dob = new Date(date);
            const today = new Date();
            return !isNaN(dob.getTime()) && dob <= today;
        },
        {
            message: "Date of birth cannot be in the future"
        }
    ),

    sex: z.string().optional(),

    phone_number: z.string().regex(
        /^\d{10,11}$/,
        "Phone number must contain 10 or 11 digits"
    ),

    email: z.string().email("Invalid email address").optional().or(z.literal("")),

    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),

    state: z.string().regex(
        /^[A-Za-z]{2}$/,
        "State must be a 2-letter US state code"
    ),

    zip_code: z.string().regex(
        /^\d{5}(-\d{4})?$/,
        "ZIP must be 5 digits or ZIP+4"
    ),

    insurance_provider: z.string().optional(),
    insurance_member_id: z.string().optional(),
    preferred_language: z.string().optional(),
    emergency_contact_name: z.string().optional(),

    emergency_contact_phone: z.string().regex(
        /^\d{10,11}$/,
        "Emergency contact phone must contain 10 or 11 digits"
    )
});

// ==========================================
// TEST ROUTES
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Voice AI Patient Registration API is running"
    });
});

app.get("/test-supabase", async (req, res) => {
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }

    res.json({
        success: true,
        message: "Supabase connected successfully",
        data: data
    });
});

// ==========================================
// 1. GET ALL PATIENTS (Supabase)
// GET /patients
// ==========================================

app.get("/patients", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching patients from Supabase:", error);
            return res.status(500).json({
                error: "Failed to retrieve patients",
                details: error.message
            });
        }

        res.json(data || []);
    } catch (err) {
        console.error("Server error fetching patients:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// 2. GET ONE PATIENT (Supabase)
// GET /patients/:id
// ==========================================

app.get("/patients/:id", async (req, res) => {
    try {
        const patientId = req.params.id;

        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("patient_id", patientId)
            .is("deleted_at", null)
            .maybeSingle();

        if (error) {
            console.error("Error fetching patient from Supabase:", error);
            return res.status(500).json({
                error: "Failed to retrieve patient",
                details: error.message
            });
        }

        if (!data) {
            return res.status(404).json({ error: "Patient not found" });
        }

        res.json(data);
    } catch (err) {
        console.error("Server error fetching patient:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// 3. CREATE PATIENT (Supabase)
// POST /patients
// ==========================================

app.post("/patients", async (req, res) => {
    try {
        // Validate request data using Zod
        const result = patientSchema.safeParse(req.body);

        // If validation fails
        if (!result.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: result.error.issues
            });
        }

        const patientData = {
            ...result.data,
            city: result.data.city || "Wah Cantt"
        };

        const { data, error } = await supabase
            .from("patients")
            .insert([patientData])
            .select()
            .single();

        if (error) {
            console.error("Error creating patient in Supabase:", error);
            return res.status(500).json({
                error: "Failed to create patient",
                details: error.message
            });
        }

        res.status(201).json({
            message: "Patient created successfully",
            patient: data,
            patient_id: data.patient_id
        });
    } catch (err) {
        console.error("Server error creating patient:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// 4. UPDATE PATIENT (Supabase)
// PUT /patients/:id
// ==========================================

app.put("/patients/:id", async (req, res) => {
    try {
        const patientId = req.params.id;

        // Check if patient exists and is not soft-deleted
        const { data: existing, error: findError } = await supabase
            .from("patients")
            .select("patient_id")
            .eq("patient_id", patientId)
            .is("deleted_at", null)
            .maybeSingle();

        if (findError) {
            console.error("Error checking patient in Supabase:", findError);
            return res.status(500).json({
                error: "Failed to update patient",
                details: findError.message
            });
        }

        if (!existing) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Validate incoming payload
        const result = patientSchema.partial().safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: result.error.issues
            });
        }

        const updatePayload = {
            ...result.data,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("patients")
            .update(updatePayload)
            .eq("patient_id", patientId)
            .select()
            .single();

        if (error) {
            console.error("Error updating patient in Supabase:", error);
            return res.status(500).json({
                error: "Failed to update patient",
                details: error.message
            });
        }

        res.json({
            message: "Patient updated successfully",
            patient: data
        });
    } catch (err) {
        console.error("Server error updating patient:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// 5. DELETE PATIENT - SOFT DELETE (Supabase)
// DELETE /patients/:id
// ==========================================

app.delete("/patients/:id", async (req, res) => {
    try {
        const patientId = req.params.id;

        // Check if patient exists and is not soft-deleted
        const { data: existing, error: findError } = await supabase
            .from("patients")
            .select("patient_id")
            .eq("patient_id", patientId)
            .is("deleted_at", null)
            .maybeSingle();

        if (findError) {
            console.error("Error checking patient in Supabase:", findError);
            return res.status(500).json({
                error: "Failed to delete patient",
                details: findError.message
            });
        }

        if (!existing) {
            return res.status(404).json({ error: "Patient not found" });
        }

        const now = new Date().toISOString();
        const { error } = await supabase
            .from("patients")
            .update({
                deleted_at: now,
                updated_at: now
            })
            .eq("patient_id", patientId);

        if (error) {
            console.error("Error soft-deleting patient in Supabase:", error);
            return res.status(500).json({
                error: "Failed to delete patient",
                details: error.message
            });
        }

        res.json({ message: "Patient deleted successfully" });
    } catch (err) {
        console.error("Server error deleting patient:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// START SERVER & EXPORT FOR VERCEL
// ==========================================

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;