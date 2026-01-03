import { calculateAmortization } from './src/modules/amortization';
import { calculateMonthlyMarginalPD, generateMarginalPDArray} from './src/modules/riskDecay';
import { calculateDiscountFactor } from './src/modules/discounting';
import { calculateTotalECL } from './src/modules/eclCalculator';

// Test M1: Amortization Engine (EAD)
console.log('=== Testing M1: Amortization Engine ===');
const ead = calculateAmortization(10000, 0.06, 12);
console.log('EAD (Exposure at Default) for each month:');
ead.forEach((balance, index) => {
    console.log(`Month ${index + 1}: $${balance.toFixed(2)}`);
});
console.log('');

// Test M2: Risk Decay Engine
console.log('=== Testing M2: Risk Decay Engine ===');
const annualPD = 0.05; // 5% annual PD
const monthlyPD = calculateMonthlyMarginalPD(annualPD);
console.log(`Monthly Marginal PD: ${monthlyPD}`);

const pdArray = generateMarginalPDArray(annualPD, 12);
console.log('Marginal PD for each month:');
pdArray.forEach((pd, index) => {
    console.log(`Month ${index + 1}: ${pd.toFixed(6)}`);
});

// Test M3: Discounting Engine
console.log('=== Testing M3: Discounting Engine ===');
const eir = 0.06; // 6% annual
const df = calculateDiscountFactor(eir, 12);
console.log(`Discount Factor (month 12): ${df}`);

console.log('=== Testing Full ECL Calculation ===');
const result = calculateTotalECL(
     10000,  // loan amount
     0.06,   // interest rate
    0.05,   // annual PD
    0.45,   // LGD (45%)
     0.06,   // EIR
     12      // months
 );
console.log(`Total ECL: $${result.totalECL.toFixed(2)}`);
