/**
 * Type definitions for the Credit Risk & ECL Engine
 */

export interface Loan {
    id?: number;
    loanAmount: number;
    annualInterestRate: number;
    annualPD: number; // Probability of Default (annual)
    lgd: number; // Loss Given Default (0-1, e.g., 0.45 = 45%)
    eir: number; // Effective Interest Rate (annual)
    months: number; // Loan term in months
    fico?: number; // FICO score (optional)
    collateralId?: number; // Reference to collateral type
    stage?: 1 | 2 | 3; // IFRS 9 stage
}

export interface ECLResult {
    totalECL: number;
    monthlyBreakdown: number[];
    ead: number[];
    marginalPD: number[];
    discountFactors: number[];
}

export interface MonthlyProjection {
    month: number;
    ead: number; // Exposure at Default
    marginalPD: number; // Probability of Default
    lgd: number; // Loss Given Default
    discountFactor: number;
    ecl: number; // Expected Credit Loss
}
