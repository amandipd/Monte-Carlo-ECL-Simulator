/**
 * M2: Risk Decay Engine (Marginal PD - Probability of Default)
 * 
 * This module implements a Constant Hazard Rate Model to translate
 * Annual PD into Monthly Marginal PD.
 * 
 * Key Concepts:
 * - Annual PD: Probability of default over 12 months
 * - Monthly Marginal PD: Probability of default in a specific month
 * - Survival Probability: Probability of surviving until month T-1
**/

// Converts annual PD to monthlt marginal PD
export function calculateMonthlyMarginalPD(annualPD: number): number {
    return 1 - (1 - annualPD) ** (1/12)
}

// Calculate probability of surviving until month T - 1
export function calculateSurvivalProbability(annualPD: number, month: number): number {
    return (1 - calculateMonthlyMarginalPD(annualPD)) ** (month - 1)
}

// P(Default in month T) = P(Survive until T - 1) * P(Fail in T)
export function calculateDefaultProbability(annualPD: number, month: number): number {
    const survivalProb = calculateSurvivalProbability(annualPD, month);
    const monthlyPD = calculateMonthlyMarginalPD(annualPD);
    return survivalProb * monthlyPD;
}

// Array of marginal PDs
export function generateMarginalPDArray(annualPD: number, months: number): number[] {
    const result: number[] = [];
    for (let i = 1; i <= months; i++) {
        result.push(calculateDefaultProbability(annualPD, i));
    }
    return result;
}
