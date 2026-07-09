const { z } = require("zod");

// Validates that the input is a valid ISO/date string without converting it to an object prematurely
const dateOfBirthField = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: "Invalid date format" })
  .refine((val) => {
    const date = new Date(val);
    return date < new Date();
  }, { message: "Date of birth must be in the past" })
  .refine((val) => {
    const date = new Date(val);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 130);
    return date > cutoff;
  }, { message: "Date of birth is implausibly old" });

const safeTextField = (max) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .max(max, "Too long")
    .refine((val) => !/[<>]/.test(val), { message: "Invalid characters in input" });

const patientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100)
    .regex(/^[A-Za-z' -]+$/, "Only letters, spaces, hyphens, and apostrophes allowed"),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100)
    .regex(/^[A-Za-z' -]+$/, "Only letters, spaces, hyphens, and apostrophes allowed"),

  dateOfBirth: dateOfBirthField,

  gender: safeTextField(50).optional().or(z.literal("")),
  
  // Added to perfectly align with your relational database schema mapping
  genderId: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
    .optional(),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),

  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number"),

  addressLine1: safeTextField(200),
  addressLine2: safeTextField(200).optional().or(z.literal("")),
  city: safeTextField(100),
  state: safeTextField(50),
  postalCode: z
    .string()
    .trim()
    .min(3)
    .max(12)
    .regex(/^[A-Za-z0-9 -]+$/, "Enter a valid postal/ZIP code"),
  country: safeTextField(56),

  insuranceProvider: safeTextField(150),
  insuranceMemberId: z
    .string()
    .trim()
    .min(1, "Required")
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/, "Insurance member ID looks invalid"),
});

module.exports = { patientSchema };