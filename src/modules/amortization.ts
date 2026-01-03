/**
 * M1: Amortization Engine (EAD - Exposure at Default)
 * 
 * This module calculates the remaining principal balance for each month
 * of a loan's term, which represents the Exposure at Default (EAD).
 * 
 * Formula: Fixed-payment annuity amortization
 */

export function calculateAmortization(
    loanAmount: number,
    annualInterestRate: number,
    months: number
): number[] {
    const monthIntRate = annualInterestRate / 12;
    let currBal = loanAmount;

    // Monthly Payment (Fixed-payment annuity formula)
    const pmt = loanAmount * (
        (monthIntRate * (1 + monthIntRate) ** months) / 
        ((1 + monthIntRate) ** months - 1)
    );

    const ead: number[] = [];
    
    for (let i = 1; i <= months; i++) {
        const bankProfit = currBal * monthIntRate;
        const principal = pmt - bankProfit;
        currBal = currBal - principal;
        ead.push(Number(currBal.toFixed(2)));
    }
    
    return ead;
}
