export function parseError(err: any) {
    if (!err) return "An unknown error occurred.";
    const msg = typeof err === "string" ? err : err.message || JSON.stringify(err);

    // Postgres / Supabase constraints
    if (msg.includes("tournaments_cut_size_check")) {
        return "Invalid Cut Size. Please adhere to the allowed values (4, 8, 16, 32, 64).";
    }
    if (msg.includes("tournaments_status_check")) {
        return "Database Error: Invalid Status. The 'pending' status is not allowed by the database constraint.";
    }
    if (msg.includes("violates not-null constraint")) {
        return "Please fill out all required fields.";
    }
    if (msg.includes("duplicate key")) {
        return "This name is likely already in use. Please try another.";
    }
    if (msg.includes("foreign key constraint")) {
        return "Referenced record not found (Constraint Violation).";
    }

    // Generic
    return msg;
}
