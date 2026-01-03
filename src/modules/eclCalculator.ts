/**
 * ECL Calculator - Combines all three modules to calculate Expected Credit Loss
 * 
 * Formula: ECL = PD × EAD × LGD
 * 
 * Where:
 * - PD: Probability of Default (from Risk Decay Engine)
 * - EAD: Exposure at Default (from Amortization Engine)
 * - LGD: Loss Given Default (percentage, e.g., 0.45 for 45%)
 * 
 * This module combines:
 * - M1: Amortization Engine (EAD)
 * - M2: Risk Decay Engine (Marginal PD)
 * - M3: Discounting Engine (NPV)
 * 
 * TODO: Implement the following functions:
 * 
 * 1. calculateMonthlyECL(
 *      ead: number,           // Exposure at default for this month
 *      marginalPD: number,    // Probability of default this month
 *      lgd: number,           // Loss given default (0-1)
 *      discountFactor: number // Discount factor for NPV
 *    ): number
 *    - Calculate ECL for a single month
 *    - Formula: (EAD × PD × LGD) × discountFactor
 * 
 * 2. calculateTotalECL(
 *      loanAmount: number,
 *      annualInterestRate: number,
 *      annualPD: number,
 *      lgd: number,
 *      eir: number,
 *      months: number
 *    ): { totalECL: number, monthlyBreakdown: number[] }
 *    - Calculate total ECL for entire loan term
 *    - Uses all three modules
 *    - Returns total ECL and monthly breakdown
 */

import { calculateAmortization } from './amortization';
// TODO: Import functions from riskDecay and discounting modules

export function calculateMonthlyECL(
    ead: number,
    marginalPD: number,
    lgd: number,
    discountFactor: number
): number {
    // TODO: Implement this function
    // ECL = (EAD × PD × LGD) × discountFactor
    throw new Error("Not implemented yet");
}

export function calculateTotalECL(
    loanAmount: number,
    annualInterestRate: number,
    annualPD: number,
    lgd: number,
    eir: number,
    months: number
): { totalECL: number; monthlyBreakdown: number[] } {
    // TODO: Implement this function
    // 1. Get EAD array from amortization module
    // 2. Get marginal PD array from risk decay module
    // 3. Get discount factors from discounting module
    // 4. For each month, calculate: ECL = (EAD × PD × LGD) × discountFactor
    // 5. Sum all monthly ECLs for total
    // 6. Return total and monthly breakdown
    
    throw new Error("Not implemented yet");
}
