const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/database.sqlite");

const sql = `
    INSERT INTO patients (
        first_name,
        last_name,
        date_of_birth,
        sex,
        phone_number,
        email,
        address_line_1,
        city,
        state,
        zip_code,
        insurance_provider,
        insurance_member_id,
        preferred_language,
        emergency_contact_name,
        emergency_contact_phone
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const patient = [
    "Ali",
    "Khan",
    "1995-08-14",
    "Male",
    "03001234567",
    "ali.khan@example.pk",
    "House 12, Street 34, Sector F-8/4",
    "Islamabad",
    "ICT", // Islamabad Capital Territory
    "44000",
    "State Life Insurance",
    "SLI-987654",
    "Urdu",
    "Ayesha Khan",
    "03339876543"
];

db.run(sql, patient, function (err) {
    if (err) {
        console.error("Error:", err.message);
    } else {
        console.log("Patient added. ID:", this.lastID);
    }

    db.close();
});