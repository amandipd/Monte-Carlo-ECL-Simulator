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
**/

import { calculateAmortization } from "./amortization";
import { generateMarginalPDArray } from "./riskDecay";
import { generateDiscountFactors } from "./discounting";

export function calculateMonthlyECL(
    ead: number,
    marginalPD: number,
    lgd: number,
    discountFactor: number
): number {
    return ead * marginalPD * lgd * discountFactor;
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

    const ead = calculateAmortization(loanAmount, annualInterestRate, months);
    const marginalPDArray = generateMarginalPDArray(annualPD, months);
    const discountFactors = generateDiscountFactors(eir, months);

    const monthlyBreakdown: number[] = []

    for (let i = 0; i < months; i++) {
        const monthlyECL = calculateMonthlyECL(ead[i], marginalPDArray[i], lgd, discountFactors[i]);
        monthlyBreakdown.push(monthlyECL);
    }

    const totalECL = monthlyBreakdown.reduce((sum, ecl) => sum + ecl, 0);

    return { totalECL, monthlyBreakdown };

}
