const { z } = require('zod');

/**
 * 🏥 Patient Data Schema Validation Gateway
 * Validates inbound textual data values before they touch relational schema layers.
 */
const patientSchema = z.object({
    firstName: z.string().trim().min(1, { message: "First name is a required field." }),
    lastName: z.string().trim().min(1, { message: "Last name is a required field." }),
    dateOfBirth: z.string().min(1, { message: "Valid date of birth is required." }),
    
    // 🔄 Intercepts incoming textual descriptive words from the selector list
    gender: z.string().trim().toLowerCase().min(1, { 
        message: "Please select a valid categorical gender assignment option." 
    }),
    
    email: z.string().trim().email({ message: "Please provide a valid medical contact email address." }),
    phone: z.string().trim().min(5, { message: "A complete telephone contact number is required." }),
    addressLine1: z.string().trim().min(1, { message: "Primary street address cannot be left blank." }),
    addressLine2: z.string().trim().optional().nullable().transform(val => val === "" ? null : val),
    city: z.string().trim().min(1, { message: "City registration is required." }),
    state: z.string().trim().min(1, { message: "State territory designation is required." }),
    postalCode: z.string().trim().min(1, { message: "Postal tracking / ZIP code is required." }),
    country: z.string().trim().min(1, { message: "Country destination field is required." }),
    insuranceProvider: z.string().trim().min(1, { message: "Insurance Provider title is required." }),
    insuranceMemberId: z.string().trim().min(1, { message: "Insurance Policy Member Identification ID is required." })
});

module.exports = {
    patientSchema
};