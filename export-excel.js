const sqlite3 = require("sqlite3").verbose();
const ExcelJS = require("exceljs");

const db = new sqlite3.Database("./database/database.sqlite");

db.all(
    "SELECT * FROM patients WHERE deleted_at IS NULL",
    async (err, patients) => {
        if (err) {
            console.error("Database error:", err.message);
            db.close();
            return;
        }

        const workbook = new ExcelJS.Workbook();

        const worksheet = workbook.addWorksheet("Patients");

        worksheet.columns = [
            { header: "Patient ID", key: "patient_id", width: 12 },
            { header: "First Name", key: "first_name", width: 15 },
            { header: "Last Name", key: "last_name", width: 15 },
            { header: "Date of Birth", key: "date_of_birth", width: 15 },
            { header: "Sex", key: "sex", width: 10 },
            { header: "Phone Number", key: "phone_number", width: 18 },
            { header: "Email", key: "email", width: 25 },
            { header: "Address Line 1", key: "address_line_1", width: 25 },
            { header: "Address Line 2", key: "address_line_2", width: 25 },
            { header: "City", key: "city", width: 15 },
            { header: "State", key: "state", width: 15 },
            { header: "ZIP Code", key: "zip_code", width: 12 },
            { header: "Insurance Provider", key: "insurance_provider", width: 22 },
            { header: "Insurance Member ID", key: "insurance_member_id", width: 22 },
            { header: "Preferred Language", key: "preferred_language", width: 20 },
            { header: "Emergency Contact Name", key: "emergency_contact_name", width: 25 },
            { header: "Emergency Contact Phone", key: "emergency_contact_phone", width: 25 },
            { header: "Created At", key: "created_at", width: 22 },
            { header: "Updated At", key: "updated_at", width: 22 },
            { header: "Deleted At", key: "deleted_at", width: 22 }
        ];

        patients.forEach((patient) => {
            worksheet.addRow(patient);
        });

        await workbook.xlsx.writeFile("patients.xlsx");

        console.log("Excel file created successfully!");

        db.close();
    }
);