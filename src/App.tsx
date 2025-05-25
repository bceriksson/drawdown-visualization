import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Slider, 
  Box, 
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel
} from '@mui/material';

function App() {
  const [housePrice, setHousePrice] = useState<number>(3000000);
  const [drawdownAccount, setDrawdownAccount] = useState<number>(1000000);
  const [monthlyDrawdown, setMonthlyDrawdown] = useState<number>(5000);
  const [interestRate, setInterestRate] = useState<number>(0.0625); // 6.25% default
  const [limitDTI, setLimitDTI] = useState<boolean>(true);
  const [additionalDownpayment, setAdditionalDownpayment] = useState<number>(0);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [paydownMonthlyPayment, setPaydownMonthlyPayment] = useState<number>(0);
  const [remainingLiquid, setRemainingLiquid] = useState<number>(0);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState({
    principal: 0,
    interest: 0,
    propertyTax: 0,
    insurance: 0
  });
  const [historicalReturns, setHistoricalReturns] = useState<number[]>([]);
  const [projection, setProjection] = useState<{
    year: number,
    p10: number,
    p25: number,
    p50: number,
    p75: number,
    p90: number
  }[]>([]);
  const [liquidProjection, setLiquidProjection] = useState<{
    year: number,
    p10: number,
    p25: number,
    p50: number,
    p75: number,
    p90: number
  }[]>([]);
  const [totalProjection, setTotalProjection] = useState<{
    year: number,
    p10: number,
    p25: number,
    p50: number,
    p75: number,
    p90: number
  }[]>([]);

  // Constants
  const LOAN_TERM_YEARS = 30;
  const PROPERTY_TAX_RATE = 0.009; // 0.9% annual property tax
  const INSURANCE_RATE = 0.002; // 0.2% annual insurance
  const STARTING_LIQUID = 1000000; // 1M starting liquid value
  const MONTHLY_INCOME = 1000000 / 12; // 1M annual income divided by 12
  const OTHER_DEBT = 10500; // 10.5k other monthly debt
  const PROJECTION_YEARS = 15;
  const MONTHLY_CONTRIBUTION = 200000 / 12; // 200k annual contribution divided by 12

  // Load historical S&P 500 data
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        const response = await fetch('/data/sp500_returns.json');
        const data = await response.json();
        setHistoricalReturns(data.returns);

        // Calculate and log statistics
        const returns = data.returns;
        const mean = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
        const sorted = [...returns].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];

        console.log('Market Returns Analysis:');
        console.log('Mean monthly return:', (mean * 100).toFixed(2) + '%');
        console.log('Median monthly return:', (median * 100).toFixed(2) + '%');
        console.log('90th percentile monthly return:', (p90 * 100).toFixed(2) + '%');
        console.log('Number of data points:', returns.length);
        console.log('Date range:', data.date_range);
      } catch (error) {
        console.error('Error loading historical data:', error);
        // Fallback to a reasonable default if fetch fails
        setHistoricalReturns([
          0.0108, -0.0089, 0.0123, -0.0067, 0.0098, -0.0045, 0.0112, -0.0034, 0.0089, -0.0056,
          0.0101, -0.0078, 0.0092, -0.0045, 0.0115, -0.0032, 0.0098, -0.0056, 0.0107, -0.0067,
          0.0112, -0.0045, 0.0098, -0.0034, 0.0105, -0.0056, 0.0118, -0.0045, 0.0092, -0.0067,
          0.0101, -0.0034, 0.0115, -0.0056, 0.0098, -0.0045, 0.0107, -0.0067, 0.0112, -0.0034,
          0.0098, -0.0056, 0.0105, -0.0045, 0.0118, -0.0067, 0.0092, -0.0034, 0.0101, -0.0056
        ]);
      }
    };

    loadHistoricalData();
  }, []);

  // Calculate projection when drawdown account or monthly drawdown changes
  useEffect(() => {
    const calculateProjection = () => {
      if (historicalReturns.length === 0) return;

      const NUM_REALIZATIONS = 20;
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
      const yearlyStats = allRealizations.map((yearValues, index) => {
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
      
      setProjection(yearlyStats);
    };

    calculateProjection();
  }, [drawdownAccount, monthlyDrawdown, historicalReturns]);

  const calculateMonthlyPayment = () => {
    // Calculate initial loan amount (80% of house price)
    const initialLoanAmount = housePrice * 0.8;
    
    // Calculate monthly interest rate
    const monthlyInterestRate = interestRate / 12;
    
    // Calculate number of payments
    const numberOfPayments = LOAN_TERM_YEARS * 12;
    
    // Calculate monthly property tax and insurance (these don't change with loan amount)
    const monthlyPropertyTax = (housePrice * PROPERTY_TAX_RATE) / 12;
    const monthlyInsurance = (housePrice * INSURANCE_RATE) / 12;
    
    let loanAmount = initialLoanAmount;
    let additionalDownpaymentNeeded = 0;
    
    // If DTI limit is enabled, calculate the maximum allowed loan amount
    if (limitDTI) {
      // Calculate maximum allowed monthly payment for 30% DTI
      const maxAllowedTotalPayment = (0.30 * MONTHLY_INCOME) - OTHER_DEBT;
      const maxAllowedMortgagePayment = maxAllowedTotalPayment - monthlyPropertyTax - monthlyInsurance;
      
      // Calculate the maximum loan amount that would result in this payment
      const maxLoanAmount = maxAllowedMortgagePayment * 
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) / 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments));
      
      // If the initial loan amount is too high, calculate additional downpayment needed
      if (maxLoanAmount < initialLoanAmount) {
        additionalDownpaymentNeeded = initialLoanAmount - maxLoanAmount;
        loanAmount = maxLoanAmount;
      }
    }
    
    // Update the additional downpayment state
    setAdditionalDownpayment(additionalDownpaymentNeeded);
    
    // Calculate monthly mortgage payment with the adjusted loan amount
    const monthlyMortgagePayment = loanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    // Calculate principal and interest components
    const monthlyInterest = loanAmount * monthlyInterestRate;
    const monthlyPrincipal = monthlyMortgagePayment - monthlyInterest;
    
    // Total monthly payment
    const totalMonthlyPayment = monthlyMortgagePayment + monthlyPropertyTax + monthlyInsurance;
    
    // Calculate true DTI
    const trueDTI = (totalMonthlyPayment + OTHER_DEBT) / MONTHLY_INCOME;
    
    // Calculate paydown scenario
    const paydownLoanAmount = Math.max(0, loanAmount - drawdownAccount);
    const paydownMonthlyMortgagePayment = paydownLoanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    const paydownTotalMonthlyPayment = paydownMonthlyMortgagePayment + monthlyPropertyTax + monthlyInsurance;
    
    setMonthlyPayment(totalMonthlyPayment);
    setPaydownMonthlyPayment(paydownTotalMonthlyPayment);
    setMonthlyBreakdown({
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      propertyTax: monthlyPropertyTax,
      insurance: monthlyInsurance
    });

    // Calculate remaining liquid value after down payment
    const downPayment = housePrice * 0.2;
    setRemainingLiquid(STARTING_LIQUID - downPayment);
    
    // Adjust drawdown account if it's at default value and additional downpayment is needed
    if (limitDTI && drawdownAccount === 1000000 && additionalDownpaymentNeeded > 0) {
      setDrawdownAccount(1000000 - additionalDownpaymentNeeded);
    }
  };

  useEffect(() => {
    calculateMonthlyPayment();
  }, [housePrice, drawdownAccount, interestRate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Calculate effective monthly payment (after drawdown)
  const effectiveMonthlyPayment = monthlyPayment - monthlyDrawdown;

  // Calculate effective DTI
  const effectiveDTI = (effectiveMonthlyPayment + OTHER_DEBT) / MONTHLY_INCOME;

  // Calculate liquid projection when relevant values change
  useEffect(() => {
    const calculateLiquidProjection = () => {
      const NUM_REALIZATIONS = 20;
      const allRealizations: number[][] = [];
      
      // Initialize arrays for each year
      for (let year = 0; year < PROJECTION_YEARS; year++) {
        allRealizations[year] = [];
      }
      
      // Run multiple realizations
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = remainingLiquid;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get random historical return
            const randomIndex = Math.floor(Math.random() * historicalReturns.length);
            const monthlyReturn = historicalReturns[randomIndex];
            
            // Apply return and add contribution minus payment
            currentValue = currentValue * (1 + monthlyReturn) + (MONTHLY_CONTRIBUTION - effectiveMonthlyPayment);
          }
          
          // Store the year-end value for this realization
          allRealizations[year].push(currentValue);
        }
      }
      
      // Calculate percentiles for each year
      const yearlyStats = allRealizations.map((yearValues, index) => {
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
      
      setLiquidProjection(yearlyStats);
    };

    calculateLiquidProjection();
  }, [remainingLiquid, effectiveMonthlyPayment, historicalReturns]);

  // Calculate total projection when either projection changes
  useEffect(() => {
    const calculateTotalProjection = () => {
      const yearlyStats = projection.map((drawdownRow, index) => {
        const liquidRow = liquidProjection[index];
        if (!liquidRow) return {
          year: index + 1,
          p10: 0,
          p25: 0,
          p50: 0,
          p75: 0,
          p90: 0
        };

        return {
          year: index + 1,
          p10: drawdownRow.p10 + liquidRow.p10,
          p25: drawdownRow.p25 + liquidRow.p25,
          p50: drawdownRow.p50 + liquidRow.p50,
          p75: drawdownRow.p75 + liquidRow.p75,
          p90: drawdownRow.p90 + liquidRow.p90
        };
      });
      
      setTotalProjection(yearlyStats);
    };

    calculateTotalProjection();
  }, [projection, liquidProjection]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Mortgage Drawdown Calculator
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography gutterBottom>
                House Price: {formatCurrency(housePrice)}
              </Typography>
              <Slider
                value={housePrice}
                onChange={(_, value) => {
                  setHousePrice(value as number);
                  // Reset drawdown account to default when house price changes and DTI limit is enabled
                  if (limitDTI) {
                    setDrawdownAccount(1000000);
                  }
                }}
                min={2000000}
                max={4000000}
                step={100000}
                marks={[
                  { value: 2000000, label: '2M' },
                  { value: 3000000, label: '3M' },
                  { value: 4000000, label: '4M' }
                ]}
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Drawdown Account: {formatCurrency(drawdownAccount)}
              </Typography>
              <Slider
                value={drawdownAccount}
                onChange={(_, value) => {
                  setDrawdownAccount(value as number);
                  // Disable DTI limit when user manually adjusts drawdown account
                  setLimitDTI(false);
                }}
                min={100000}
                max={1500000}
                step={100000}
                marks={[
                  { value: 100000, label: '100K' },
                  { value: 800000, label: '800K' },
                  { value: 1500000, label: '1.5M' }
                ]}
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Monthly Drawdown: {formatCurrency(monthlyDrawdown)}
              </Typography>
              <Slider
                value={monthlyDrawdown}
                onChange={(_, value) => setMonthlyDrawdown(value as number)}
                min={1000}
                max={13000}
                step={500}
                marks={[
                  { value: 1000, label: '1K' },
                  { value: 5000, label: '5K' },
                  { value: 10000, label: '10K' },
                  { value: 13000, label: '13K' }
                ]}
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Interest Rate: {formatPercentage(interestRate)}
              </Typography>
              <Slider
                value={interestRate}
                onChange={(_, value) => setInterestRate(value as number)}
                min={0.02}
                max={0.08}
                step={0.0025}
                marks={[
                  { value: 0.02, label: '2%' },
                  { value: 0.04, label: '4%' },
                  { value: 0.06, label: '6%' },
                  { value: 0.08, label: '8%' }
                ]}
              />
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={limitDTI}
                    onChange={(_, checked) => {
                      setLimitDTI(checked);
                      if (checked) {
                        // Reset drawdown account to default when enabling DTI limit
                        setDrawdownAccount(1000000);
                        // Trigger recalculation
                        calculateMonthlyPayment();
                      }
                    }}
                    color="primary"
                  />
                }
                label="Limit DTI to 30%"
              />
              {limitDTI && additionalDownpayment > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                  Additional downpayment needed: {formatCurrency(additionalDownpayment)}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Monthly Payment Details
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Principal:</Typography>
              <Typography variant="body1">{formatCurrency(monthlyBreakdown.principal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Interest:</Typography>
              <Typography variant="body1">{formatCurrency(monthlyBreakdown.interest)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Property Tax:</Typography>
              <Typography variant="body1">{formatCurrency(monthlyBreakdown.propertyTax)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Insurance:</Typography>
              <Typography variant="body1">{formatCurrency(monthlyBreakdown.insurance)}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">Total Monthly Payment:</Typography>
              <Typography variant="h6">{formatCurrency(monthlyPayment)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">True DTI Ratio:</Typography>
              <Typography variant="body1">{formatPercentage((monthlyPayment + OTHER_DEBT) / MONTHLY_INCOME)}</Typography>
            </Box>
            {((monthlyPayment + OTHER_DEBT) / MONTHLY_INCOME) > 0.22 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Required Income for 22% DTI:</Typography>
                  <Typography variant="body1">{formatCurrency((monthlyPayment + OTHER_DEBT) / 0.22 * 12)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Required Yearly Growth Rate:</Typography>
                  <Typography variant="body1">{formatPercentage(Math.pow((monthlyPayment + OTHER_DEBT) / (0.22 * MONTHLY_INCOME), 1/8) - 1)}</Typography>
                </Box>
              </>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Paydown DTI Ratio:</Typography>
              <Typography variant="body1">{formatPercentage((paydownMonthlyPayment + OTHER_DEBT) / MONTHLY_INCOME)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Monthly Drawdown:</Typography>
              <Typography variant="body1">-{formatCurrency(monthlyDrawdown)}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">Effective Monthly Payment:</Typography>
              <Typography variant="h6">{formatCurrency(effectiveMonthlyPayment)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Other Monthly Debt:</Typography>
              <Typography variant="body1">{formatCurrency(OTHER_DEBT)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Monthly Income:</Typography>
              <Typography variant="body1">{formatCurrency(MONTHLY_INCOME)}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Effective DTI Ratio:</Typography>
              <Typography variant="h6">{formatPercentage(effectiveDTI)}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Yearly Financial Metrics
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Yearly Liquid Savings:</Typography>
              <Typography variant="body1">{formatCurrency(150000 - 12 * (effectiveMonthlyPayment - 4500))}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Yearly Additional Savings:</Typography>
              <Typography variant="body1">{formatCurrency(136000)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Yearly Home Equity:</Typography>
              <Typography variant="body1">{formatCurrency(monthlyBreakdown.principal * 12 + 24000)}</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total Yearly Savings:</Typography>
              <Typography variant="h6">{formatCurrency(
                (150000 - 12 * (effectiveMonthlyPayment - 4500)) + 
                136000 + 
                (monthlyBreakdown.principal * 12 + 24000)
              )}</Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Based on 80% LTV, {formatPercentage(interestRate)} interest rate, {LOAN_TERM_YEARS}-year term
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Liquid Value Details
          </Typography>
          <Typography variant="body1">
            Starting Liquid Value: {formatCurrency(STARTING_LIQUID)}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Down Payment (20%): {formatCurrency(housePrice * 0.2)}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Remaining Liquid Value: {formatCurrency(remainingLiquid)}
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Drawdown Account Projection (15 Years)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Based on 20 realizations using historical S&P 500 monthly returns from the past 50 years
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Year</TableCell>
                  <TableCell align="right">10th Percentile</TableCell>
                  <TableCell align="right">25th Percentile</TableCell>
                  <TableCell align="right">Median (50th)</TableCell>
                  <TableCell align="right">75th Percentile</TableCell>
                  <TableCell align="right">90th Percentile</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projection.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell align="right" sx={{ color: row.p10 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p10)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p25 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p25)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p50 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p50)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p75 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p75)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p90 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p90)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Shows the distribution of possible outcomes across 20 different realizations
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Overall Liquid Account Projection (15 Years)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Based on 20 realizations using historical S&P 500 monthly returns from the past 50 years.
            Starting with remaining liquid value, adding monthly contribution of {formatCurrency(MONTHLY_CONTRIBUTION)} minus effective monthly payment.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Year</TableCell>
                  <TableCell align="right">10th Percentile</TableCell>
                  <TableCell align="right">25th Percentile</TableCell>
                  <TableCell align="right">Median (50th)</TableCell>
                  <TableCell align="right">75th Percentile</TableCell>
                  <TableCell align="right">90th Percentile</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liquidProjection.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell align="right" sx={{ color: row.p10 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p10)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p25 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p25)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p50 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p50)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p75 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p75)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p90 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p90)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Shows the distribution of possible outcomes across 20 different realizations
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Total Liquid Projection (15 Years)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Combined projection of Drawdown Account and Overall Liquid Account
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Year</TableCell>
                  <TableCell align="right">10th Percentile</TableCell>
                  <TableCell align="right">25th Percentile</TableCell>
                  <TableCell align="right">Median (50th)</TableCell>
                  <TableCell align="right">75th Percentile</TableCell>
                  <TableCell align="right">90th Percentile</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {totalProjection.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell align="right" sx={{ color: row.p10 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p10)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p25 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p25)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p50 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p50)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p75 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p75)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: row.p90 < 0 ? 'error.main' : 'inherit' }}>
                      {formatCurrency(row.p90)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Shows the combined distribution of possible outcomes across 20 different realizations
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
