// Constants
export const LOAN_TERM_YEARS = 30;
export const PROPERTY_TAX_RATE = 0.009; // 0.9% annual property tax
export const INSURANCE_RATE = 0.002; // 0.2% annual insurance
export const STARTING_LIQUID = 1000000; // 1M starting liquid value
export const MONTHLY_INCOME = 1000000 / 12; // 1M annual income divided by 12
export const OTHER_DEBT = 10500; // 10.5k other monthly debt
export const PROJECTION_YEARS = 15;
export const MONTHLY_CONTRIBUTION = 200000 / 12; // 200k annual contribution divided by 12

export interface ProjectionResult {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export function calculateProjection(
  housePrice: number,
  drawdownAccount: number,
  monthlyDrawdown: number,
  interestRate: number,
  historicalReturns: number[]
): ProjectionResult[] {
  if (historicalReturns.length === 0) return [];

  const NUM_REALIZATIONS = 100;
  const allRealizations: number[][] = [];
  
  // Portfolio allocation constants
  const MARKET_ALLOCATION = 0.8; // 80% in market
  const BOND_ALLOCATION = 0.2;   // 20% in bonds
  const RISK_FREE_RATE = 0.03;   // 3% annual risk-free rate
  const MONTHLY_RISK_FREE = Math.pow(1 + RISK_FREE_RATE, 1/12) - 1; // Convert annual to monthly
  
  // Initialize arrays for each year
  for (let year = 0; year < PROJECTION_YEARS; year++) {
    allRealizations[year] = [];
  }
  
  // Run multiple realizations
  for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
    let currentValue = drawdownAccount;
    
    // Simulate 15 years of monthly returns
    for (let year = 0; year < PROJECTION_YEARS; year++) {
      for (let month = 0; month < 12; month++) {
        // Get random historical return for market portion
        const randomIndex = Math.floor(Math.random() * historicalReturns.length);
        const marketReturn = historicalReturns[randomIndex];
        
        // Calculate combined return based on portfolio allocation
        const combinedReturn = (MARKET_ALLOCATION * marketReturn) + (BOND_ALLOCATION * MONTHLY_RISK_FREE);
        
        // Apply return and subtract drawdown
        currentValue = currentValue * (1 + combinedReturn) - monthlyDrawdown;
      }
      
      // Store the year-end value for this realization
      allRealizations[year].push(currentValue);
    }
  }
  
  // Calculate percentiles for each year
  return allRealizations.map((yearValues, index) => {
    if (yearValues.length === 0) {
      console.error(`No values for year ${index + 1}`);
      return {
        year: index + 1,
        p10: 0,
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0
      };
    }

    // Sort values for percentile calculation
    const sortedValues = [...yearValues].sort((a, b) => a - b);
    
    // Calculate indices for percentiles
    const p10Index = Math.floor(sortedValues.length * 0.10);
    const p25Index = Math.floor(sortedValues.length * 0.25);
    const p50Index = Math.floor(sortedValues.length * 0.50);
    const p75Index = Math.floor(sortedValues.length * 0.75);
    const p90Index = Math.floor(sortedValues.length * 0.90);
    
    return {
      year: index + 1,
      p10: sortedValues[p10Index],
      p25: sortedValues[p25Index],
      p50: sortedValues[p50Index],
      p75: sortedValues[p75Index],
      p90: sortedValues[p90Index]
    };
  });
}

export function calculateMonthlyPayment(
  housePrice: number,
  interestRate: number
): {
  monthlyPayment: number;
  monthlyBreakdown: {
    principal: number;
    interest: number;
    propertyTax: number;
    insurance: number;
  };
} {
  // Calculate loan amount (80% of house price)
  const loanAmount = housePrice * 0.8;
  
  // Calculate monthly interest rate
  const monthlyInterestRate = interestRate / 12;
  
  // Calculate number of payments
  const numberOfPayments = LOAN_TERM_YEARS * 12;
  
  // Calculate monthly mortgage payment
  const monthlyMortgagePayment = loanAmount * 
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  
  // Calculate monthly property tax and insurance
  const monthlyPropertyTax = (housePrice * PROPERTY_TAX_RATE) / 12;
  const monthlyInsurance = (housePrice * INSURANCE_RATE) / 12;
  
  // Calculate principal and interest components
  const monthlyInterest = loanAmount * monthlyInterestRate;
  const monthlyPrincipal = monthlyMortgagePayment - monthlyInterest;
  
  return {
    monthlyPayment: monthlyMortgagePayment + monthlyPropertyTax + monthlyInsurance,
    monthlyBreakdown: {
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      propertyTax: monthlyPropertyTax,
      insurance: monthlyInsurance
    }
  };
} 