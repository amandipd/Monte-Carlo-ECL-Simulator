import pool from "../config/db";
import { calculateTotalECL } from "../modules/eclCalculator";
import { calculateAmortization } from "../modules/amortization";
import { generateMarginalPDArray } from "../modules/riskDecay";
import { generateDiscountFactors } from "../modules/discounting";

export async function calculateAndStoreECL(loanId: number) {
    if (!loanId) {
        throw new Error("Invalid ID provided");
    }
    try {
        const result = await pool.query("SELECT loan_amount, annual_interest_rate, term_months, annual_pd, lgd, eir FROM loans WHERE id = $1", [loanId]);

        if (result.rows.length === 0) {
            return null;
        }

        // Destructure the result into separate variables
        const {
            loan_amount,
            annual_interest_rate,
            term_months,
            annual_pd,
            lgd,
            eir
        } = result.rows[0];

        // Convert DECIMAL values from database (strings) to numbers
        const loanAmount = parseFloat(loan_amount);
        const annualInterestRate = parseFloat(annual_interest_rate);
        const termMonths = parseInt(term_months, 10);
        const annualPD = parseFloat(annual_pd);
        const lgdValue = parseFloat(lgd);
        const eirValue = parseFloat(eir);

        // Calculate ECL and get all necessary arrays for monthly projections
        const eclResult = calculateTotalECL(loanAmount, annualInterestRate, annualPD, lgdValue, eirValue, termMonths);
        
        // Get individual arrays needed for monthly projections table
        const eadArray = calculateAmortization(loanAmount, annualInterestRate, termMonths);
        const marginalPDArray = generateMarginalPDArray(annualPD, termMonths);
        const discountFactors = generateDiscountFactors(eirValue, termMonths);

        // Use a transaction to ensure both inserts succeed or fail together
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert into ecl_results table
            const eclResultInsert = await client.query(
                "INSERT INTO ecl_results (loan_id, total_ecl) VALUES ($1, $2) RETURNING id",
                [loanId, eclResult.totalECL]
            );
            const eclResultId = eclResultInsert.rows[0].id;

            // Insert monthly projections into ecl_monthly_projections table
            for (let i = 0; i < termMonths; i++) {
                await client.query(
                    "INSERT INTO ecl_monthly_projections (ecl_result_id, month, ead, marginal_pd, discount_factor, ecl) VALUES ($1, $2, $3, $4, $5, $6)",
                    [
                        eclResultId,
                        i + 1, // month number (1-indexed)
                        eadArray[i],
                        marginalPDArray[i],
                        discountFactors[i],
                        eclResult.monthlyBreakdown[i]
                    ]
                );
            }

            await client.query('COMMIT');

            // Return the ECL result with the ID
            return {
                id: eclResultId,
                loan_id: loanId,
                total_ecl: eclResult.totalECL,
                monthly_breakdown: eclResult.monthlyBreakdown
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`Error calculating and storing ECL for loan ${loanId}`, error);
        throw new Error("Internal Server Error");
    }
}

/**
 * Get ECL result for a loan, including monthly projections
 * @param loanId - Loan ID
 * @returns The ECL result with monthly projections, or null if not found
 */
export async function getECLResult(loanId: number) {
    if (!loanId || loanId <= 0) {
        throw new Error("Invalid loan ID provided");
    }

    try {
        // Get the ECL result for this loan
        const eclResultQuery = await pool.query(
            "SELECT id, loan_id, total_ecl, calculated_at, pd_benchmark_version, notes FROM ecl_results WHERE loan_id = $1",
            [loanId]
        );

        if (eclResultQuery.rows.length === 0) {
            return null;
        }

        const eclResult = eclResultQuery.rows[0];
        const eclResultId = eclResult.id;

        // Get all monthly projections for this ECL result
        const projectionsQuery = await pool.query(
            "SELECT month, ead, marginal_pd, discount_factor, ecl FROM ecl_monthly_projections WHERE ecl_result_id = $1 ORDER BY month ASC",
            [eclResultId]
        );

        // Convert DECIMAL values to numbers
        const monthlyProjections = projectionsQuery.rows.map((row) => ({
            month: parseInt(row.month, 10),
            ead: parseFloat(row.ead),
            marginal_pd: parseFloat(row.marginal_pd),
            discount_factor: parseFloat(row.discount_factor),
            ecl: parseFloat(row.ecl)
        }));

        return {
            id: eclResult.id,
            loan_id: parseInt(eclResult.loan_id, 10),
            total_ecl: parseFloat(eclResult.total_ecl),
            calculated_at: eclResult.calculated_at,
            pd_benchmark_version: eclResult.pd_benchmark_version ? parseInt(eclResult.pd_benchmark_version, 10) : null,
            notes: eclResult.notes,
            monthly_projections: monthlyProjections
        };
    } catch (error) {
        console.error(`Error fetching ECL result for loan ${loanId}`, error);
        throw new Error("Internal Server Error");
    }
}