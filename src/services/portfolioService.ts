import pool from "../config/db";

/**
 * Create a new portfolio
 * @param name - Portfolio name (required)
 * @param description - Portfolio description (optional)
 * @returns The created portfolio with its ID
 */
// async tells TS that function will take time to complete, allows program to keep running other tasks in the background
export async function createPortfolio(name: string, description?: string) {
    if (!name || name.trim().length === 0) {
        throw new Error("Portfolio name is required");
    }

    try {
        const result = await pool.query(
            "INSERT INTO portfolios (name, description) VALUES ($1, $2) RETURNING *",
            [name.trim(), description?.trim() || null]
        );
        
        return result.rows[0];
    } catch (error: any) {
        // Handle duplicate name constraint (if unique constraint exists)
        if (error.code === '23505') { // PostgreSQL unique violation
            throw new Error(`Portfolio with name "${name}" already exists`);
        } else {
            console.error(`Error creating portfolio "${name}"`, error);
            throw new Error("Internal Server Error");
        }
    }
}

/**
 * Get a portfolio by ID
 * @param id - Portfolio ID
 * @returns The portfolio object or null if not found
 */
export async function getPortfolioById(id: number) {
    if (!id || id <= 0) {
        throw new Error("Invalid ID provided");
    }

    try {
        // Prevents against SQL injections
        // Select all fields to return complete portfolio object
        const result = await pool.query("SELECT * FROM portfolios WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    } catch (error) {
        console.error(`Error fetching portfolio ${id}`, error);
        throw new Error("Internal Server Error");
    }
}

/**
 * Get all portfolios 
 * @returns Array of all portfolios, or empty if none exist
 */
export async function getAllPortfolios() {
    try {
        const result = await pool.query("SELECT * FROM portfolios ORDER BY created_at DESC");
        return result.rows;
    } catch (error) {
        console.error("Error fetching all portfolios", error);
        throw new Error("Internal Server Error");
    }
}




