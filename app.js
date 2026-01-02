function amortization(loanAmnt, annIntRate, months) {
    const monthIntRate = annIntRate / 12;
    let currBal = loanAmnt;

    // Monthly Payment
    const pmt = loanAmnt * ((monthIntRate * (1 + monthIntRate) ** months) / ((1 + monthIntRate) ** months - 1));
    //console.log(pmt.toFixed(2));

    const ead = [];
    for (let i = 1; i <= months; i++) {
        const bankProfit = currBal * monthIntRate;
        const principal = pmt - bankProfit;
        currBal = currBal - principal;
        ead.push(Number(currBal.toFixed(2)));
    }

    
    for (const val of ead) {
        console.log(val);
    }
    
}

amortization(10000, 0.06, 12)