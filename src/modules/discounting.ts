/**
 * M3: Discounting Engine (NPV - Net Present Value)
 * 
 * This module applies Net Present Value logic to discount future cash flows
 * using the loan's Effective Interest Rate (EIR).
 * 
 * Key Concepts:
 * - NPV: Present value of future cash flows discounted at a specific rate
 * - EIR (Effective Interest Rate): The actual interest rate on the loan
 * - Discount Factor: Factor by which future value is reduced to present value
 * 
 * Formula:
 * NPV = Future_Value / (1 + EIR)^n
 * where n = number of periods (months)
 * 
 * For monthly discounting:
 * Discount Factor = 1 / (1 + monthlyEIR)^month
 * 
 * TODO: Implement the following functions:
 * 
 * 1. calculateDiscountFactor(eir: number, month: number): number
 *    - Calculate discount factor for a specific month
 *    - EIR should be annual, convert to monthly: monthlyEIR = EIR / 12
 *    - Formula: 1 / (1 + monthlyEIR)^month
 * 
 * 2. calculateNPV(futureValue: number, eir: number, month: number): number
 *    - Calculate Net Present Value of a future cash flow
 *    - Formula: futureValue × discountFactor
 * 
 * 3. generateDiscountFactors(eir: number, months: number): number[]
 *    - Generate array of discount factors for each month
 *    - Returns: [DF_month1, DF_month2, ..., DF_monthN]
 * 
 * 4. discountCashFlows(cashFlows: number[], eir: number): number[]
 *    - Discount an array of future cash flows to present value
 *    - Each cash flow is discounted by its corresponding month
 */

// Calculates discount factor for a specific month
export function calculateDiscountFactor(eir: number, month: number): number {
    const monthlyEIR = eir / 12
    return 1 / (1 + monthlyEIR) ** month
}

// Calculates the present value of future money (money worth today is worth more than money tomorrow)
export function calculateNPV(futureValue: number, eir: number, month: number): number {
    return calculateDiscountFactor(eir, month) * futureValue
}

// Generate array of discount factors for each month
export function generateDiscountFactors(eir: number, months: number): number[] {
    const discountFactors: number[] = []; 
    for (let i = 1; i <= months; i++) {
        let currDiscountFactor = calculateDiscountFactor(eir, i);
        discountFactors.push(currDiscountFactor);
    }
    return discountFactors;
}

// Discount an array of future cash flows to present value
export function discountCashFlows(cashFlows: number[], eir: number): number[] {
    const discountFlows: number[] = []
    const discountFactors = generateDiscountFactors(eir, cashFlows.length);

    for (let i = 0; i < discountFactors.length; i++) {
        discountFlows[i] = discountFactors[i] * cashFlows[i]
    }

    return discountFlows;
}
