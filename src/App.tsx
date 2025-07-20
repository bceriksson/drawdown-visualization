import React, { useState, useEffect, useRef } from 'react';
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
  FormControlLabel,
  Button,
  Tabs,
  Tab,
  TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

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
  const [garchSimulationData, setGarchSimulationData] = useState<number[]>([]);

  // Constants
  const LOAN_TERM_YEARS = 30;
  const PROPERTY_TAX_RATE = 0.009; // 0.9% annual property tax
  const INSURANCE_RATE = 0.002; // 0.2% annual insurance
  const STARTING_LIQUID = 1000000; // 1M starting liquid value
  const MONTHLY_INCOME = 1000000 / 12; // 1M annual income divided by 12
  const OTHER_DEBT = 10500; // 10.5k other monthly debt
  const PROJECTION_YEARS = 15;
  const MONTHLY_CONTRIBUTION = 200000 / 12; // 200k annual contribution divided by 12

  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [calculatorTabValue, setCalculatorTabValue] = useState(0);
  const [drawdownAccountInput, setDrawdownAccountInput] = useState<string>('1000000');
  const [desiredDrawdownInput, setDesiredDrawdownInput] = useState<string>('5000');
  const [calculatorResults, setCalculatorResults] = useState<{
    principalGreaterThanZero: number;
    principalSameOrGreater: number;
    principalGreaterThanZero80: number;
    principalSameOrGreater80: number;
    histogramData: Array<{ range: string; count: number; cumulativePercentage: string }>;
  } | null>(null);
  const [reverseCalculatorResults, setReverseCalculatorResults] = useState<{
    principalForPositiveEnd: number;
    principalForMaintainedValue: number;
    principalForPositiveEnd80: number;
    principalForMaintainedValue80: number;
  } | null>(null);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCalculatorTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCalculatorTabValue(newValue);
  };

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

  // Generate GARCH simulation data
  useEffect(() => {
    const generateGarchData = () => {
      // GARCH(1,1) simulation calibrated to match S&P 500 characteristics
      const NUM_SIMULATIONS = 10000;
      const garchData: number[] = [];
      
      // Optimized GARCH parameters from Python optimization
      const omega = 0.0002;   // Constant
      const alpha = 0.15;     // ARCH parameter
      const beta = 0.80;      // GARCH parameter
      const drift = 0.010;    // Monthly drift term (~1.0% monthly return)
      const volatilityScale = 0.52; // Volatility scaling factor to match historical std
      
      // Initial variance calibrated to match S&P 500 monthly volatility
      let variance = 0.003;   // Initial variance
      
      for (let i = 0; i < NUM_SIMULATIONS; i++) {
        // Generate random shock using Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        
        // Apply volatility scaling to control the overall volatility
        const shock = z0 * volatilityScale;
        
        // Calculate return with drift term
        const return_val = drift + shock * Math.sqrt(variance);
        garchData.push(return_val);
        
        // Update variance for next period (GARCH(1,1) equation)
        // Use only the shock component, not the total return
        variance = omega + alpha * Math.pow(shock, 2) + beta * variance;
        
        // Ensure variance doesn't explode or collapse
        variance = Math.max(0.0001, Math.min(0.01, variance));
      }
      
      setGarchSimulationData(garchData);
      console.log('GARCH simulation data generated:', garchData.length, 'data points');
      
      // Log GARCH statistics for comparison
      const mean = garchData.reduce((a, b) => a + b, 0) / garchData.length;
      const sorted = [...garchData].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      const p10 = sorted[Math.floor(sorted.length * 0.1)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p05 = sorted[Math.floor(sorted.length * 0.05)];
      
      console.log('GARCH Simulation Statistics:');
      console.log('Mean monthly return:', (mean * 100).toFixed(2) + '%');
      console.log('Median monthly return:', (median * 100).toFixed(2) + '%');
      console.log('5th percentile:', (p05 * 100).toFixed(2) + '%');
      console.log('10th percentile:', (p10 * 100).toFixed(2) + '%');
      console.log('90th percentile:', (p90 * 100).toFixed(2) + '%');
      console.log('95th percentile:', (p95 * 100).toFixed(2) + '%');
    };
    
    generateGarchData();
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
      
      console.log('=== MAIN PROJECTION USING GARCH SIMULATION ===');
      console.log(`Market allocation: ${MARKET_ALLOCATION * 100}% GARCH, ${BOND_ALLOCATION * 100}% bonds`);
      
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
            // Get GARCH simulated return for market portion
            const marketReturn = generateGarchReturn();
            
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
    return `${(value * 100).toFixed(2)}%`;
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
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
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

  const calculateDrawdownAmounts = () => {
    if (historicalReturns.length === 0) return;

    const accountValue = parseFloat(drawdownAccountInput);
    if (isNaN(accountValue) || accountValue <= 0) return;

    const NUM_REALIZATIONS = 1000;
    const PROJECTION_YEARS = 15;
    const MONTHLY_DRAWDOWN = 5000; // Use a fixed amount for histogram

    console.log('=== DRAWDOWN CALCULATOR START ===');
    console.log(`Starting account value: ${formatCurrency(accountValue)}`);
    console.log(`Using GARCH simulation for monthly returns`);
    console.log(`Running ${NUM_REALIZATIONS} simulations for each test amount`);
    
    // Create test amounts for different confidence levels
    const testAmounts95 = Array.from({ length: 100 }, (_, i) => 1000 + i * 500); // $1,000 to $50,500
    const testAmounts80 = Array.from({ length: 100 }, (_, i) => 1000 + i * 1000); // $1,000 to $100,000 (wider range for 80%)
    
    let principalGreaterThanZero = 0;
    let principalSameOrGreater = 0;
    let principalGreaterThanZero80 = 0;
    let principalSameOrGreater80 = 0;
    
    console.log('\n=== CALCULATING PRINCIPAL > 0 THRESHOLD (95%) ===');
    // Find the highest monthly drawdown that succeeds in 95% of simulations for principal > 0
    let initialEstimate95 = 0;
    for (const monthlyDrawdown of testAmounts95) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        initialEstimate95 = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
        break;
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH (95%) around ${formatCurrency(initialEstimate95)} ===`);
    const fineRange95 = Array.from({ length: 21 }, (_, i) => initialEstimate95 - 1000 + i * 100);
    for (const monthlyDrawdown of fineRange95) {
      if (monthlyDrawdown <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        principalGreaterThanZero = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
        break;
      }
    }
    
    console.log('\n=== CALCULATING PRINCIPAL > 0 THRESHOLD (80%) ===');
    // Find the highest monthly drawdown that succeeds in 80% of simulations for principal > 0
    let initialEstimate80 = 0;
    for (const monthlyDrawdown of testAmounts80) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        initialEstimate80 = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
        break;
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH (80%) around ${formatCurrency(initialEstimate80)} ===`);
    const fineRange80 = Array.from({ length: 21 }, (_, i) => initialEstimate80 - 1000 + i * 100);
    for (const monthlyDrawdown of fineRange80) {
      if (monthlyDrawdown <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        principalGreaterThanZero80 = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
        break;
      }
    }
    
    console.log(`\n=== CALCULATING PRINCIPAL >= STARTING VALUE THRESHOLD (95%) ===`);
    // Find the highest monthly drawdown that succeeds in 95% of simulations for principal >= starting value
    let initialEstimateMaintained95 = 0;
    for (const monthlyDrawdown of testAmounts95) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue >= accountValue) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        initialEstimateMaintained95 = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
        break;
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH MAINTAINED VALUE (95%) around ${formatCurrency(initialEstimateMaintained95)} ===`);
    const fineRangeMaintained95 = Array.from({ length: 21 }, (_, i) => initialEstimateMaintained95 - 1000 + i * 100);
    for (const monthlyDrawdown of fineRangeMaintained95) {
      if (monthlyDrawdown <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue >= accountValue) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        principalSameOrGreater = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
        break;
      }
    }
    
    console.log(`\n=== CALCULATING PRINCIPAL >= STARTING VALUE THRESHOLD (80%) ===`);
    // Find the highest monthly drawdown that succeeds in 80% of simulations for principal >= starting value
    let initialEstimateMaintained80 = 0;
    for (const monthlyDrawdown of testAmounts80) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue >= accountValue) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        initialEstimateMaintained80 = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
        break;
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH MAINTAINED VALUE (80%) around ${formatCurrency(initialEstimateMaintained80)} ===`);
    const fineRangeMaintained80 = Array.from({ length: 21 }, (_, i) => initialEstimateMaintained80 - 1000 + i * 100);
    for (const monthlyDrawdown of fineRangeMaintained80) {
      if (monthlyDrawdown <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = accountValue;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - monthlyDrawdown;
          }
        }
        
        if (currentValue >= accountValue) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        principalSameOrGreater80 = monthlyDrawdown;
        console.log(`✓ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(monthlyDrawdown)}/month: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
      }
    }
    
    console.log('\n=== GENERATING HISTOGRAM DATA ===');
    const histogramDrawdown = principalGreaterThanZero; // Use the calculated 95% confidence withdrawal amount
    console.log(`Using ${formatCurrency(histogramDrawdown)}/month for histogram distribution (95% confidence)`);
    
    // Generate histogram data for the calculated 95% confidence withdrawal amount
    const finalValues: number[] = [];
    for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
      let currentValue = accountValue;
      
      // Simulate 15 years of monthly returns
      for (let year = 0; year < PROJECTION_YEARS; year++) {
        for (let month = 0; month < 12; month++) {
          // Get GARCH simulated return (100% stocks)
          const monthlyReturn = generateGarchReturn();
          
          // Apply return and subtract drawdown
          currentValue = currentValue * (1 + monthlyReturn) - histogramDrawdown;
        }
      }
      
      finalValues.push(currentValue);
    }
    
    // Create histogram bins with 100k intervals
    const minValue = Math.min(...finalValues);
    const maxValue = Math.max(...finalValues);
    
    console.log(`Histogram range: ${formatCurrency(minValue)} to ${formatCurrency(maxValue)}`);
    
    // Round down to nearest 100k for start, round up to nearest 100k for end
    const binStart = Math.floor(minValue / 100000) * 100000;
    const binEnd = Math.ceil(maxValue / 100000) * 100000;
    const binCount = Math.ceil((binEnd - binStart) / 100000);
    
    console.log(`Creating ${binCount} bins from ${formatCurrency(binStart)} to ${formatCurrency(binEnd)}`);
    
    const histogramData = Array.from({ length: binCount }, (_, i) => {
      const rangeStart = binStart + i * 100000;
      const rangeEnd = binStart + (i + 1) * 100000;
      const count = finalValues.filter(value => value >= rangeStart && value < rangeEnd).length;
      
      return {
        range: `${formatCurrency(rangeStart)} - ${formatCurrency(rangeEnd)}`,
        count,
        rangeStart,
        rangeEnd
      };
    });
    
    // Calculate cumulative distribution
    const totalSimulations = finalValues.length;
    let cumulativeCount = 0;
    const histogramDataWithCumulative = histogramData.map(bin => {
      cumulativeCount += bin.count;
      const cumulativePercentage = ((totalSimulations - cumulativeCount + bin.count) / totalSimulations * 100).toFixed(1);
      return {
        ...bin,
        cumulativePercentage
      };
    });
    
    console.log('\n=== FINAL RESULTS ===');
    console.log(`Principal > 0 (95% confidence): ${formatCurrency(principalGreaterThanZero)}/month (${formatCurrency(principalGreaterThanZero * 12)}/year)`);
    console.log(`Principal > 0 (80% confidence): ${formatCurrency(principalGreaterThanZero80)}/month (${formatCurrency(principalGreaterThanZero80 * 12)}/year)`);
    console.log(`Principal >= starting value (95% confidence): ${formatCurrency(principalSameOrGreater)}/month (${formatCurrency(principalSameOrGreater * 12)}/year)`);
    console.log(`Principal >= starting value (80% confidence): ${formatCurrency(principalSameOrGreater80)}/month (${formatCurrency(principalSameOrGreater80 * 12)}/year)`);
    
    setCalculatorResults({
      principalGreaterThanZero,
      principalGreaterThanZero80,
      principalSameOrGreater,
      principalSameOrGreater80,
      histogramData: histogramDataWithCumulative
    });
  };

  const calculateRequiredPrincipal = () => {
    if (historicalReturns.length === 0) return;

    const desiredMonthlyDrawdown = parseFloat(desiredDrawdownInput);
    if (isNaN(desiredMonthlyDrawdown) || desiredMonthlyDrawdown <= 0) return;

    const NUM_REALIZATIONS = 1000;
    const PROJECTION_YEARS = 15;

    console.log('=== REVERSE CALCULATOR START ===');
    console.log(`Desired monthly drawdown: ${formatCurrency(desiredMonthlyDrawdown)}`);
    console.log(`Using GARCH simulation for monthly returns`);
    console.log(`Running ${NUM_REALIZATIONS} simulations for each test principal amount`);
    
    // Test different starting principal amounts for different confidence levels
    const testAmounts95 = Array.from({ length: 50 }, (_, i) => 200000 + i * 200000); // $200k to $10M in 200k increments
    const testAmounts80 = Array.from({ length: 50 }, (_, i) => 100000 + i * 200000); // $100k to $10M in 200k increments (lower starting point for 80%)
    
    let principalForPositiveEnd = 0;
    let principalForMaintainedValue = 0;
    let principalForPositiveEnd80 = 0;
    let principalForMaintainedValue80 = 0;
    
    console.log('\n=== CALCULATING PRINCIPAL FOR POSITIVE END VALUE (95%) ===');
    // Find the minimum principal that succeeds in 95% of simulations for ending > 0
    let initialEstimatePositive95 = 0;
    for (const startingPrincipal of testAmounts95) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        initialEstimatePositive95 = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
        break;
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH POSITIVE END (95%) around ${formatCurrency(initialEstimatePositive95)} ===`);
    const fineRangePositive95 = Array.from({ length: 21 }, (_, i) => initialEstimatePositive95 - 100000 + i * 10000);
    for (const startingPrincipal of fineRangePositive95) {
      if (startingPrincipal <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        principalForPositiveEnd = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
      }
    }
    
    console.log('\n=== CALCULATING PRINCIPAL FOR POSITIVE END VALUE (80%) ===');
    // Find the minimum principal that succeeds in 80% of simulations for ending > 0
    let initialEstimatePositive80 = 0;
    for (const startingPrincipal of testAmounts80) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        initialEstimatePositive80 = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
        break;
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH POSITIVE END (80%) around ${formatCurrency(initialEstimatePositive80)} ===`);
    const fineRangePositive80 = Array.from({ length: 21 }, (_, i) => initialEstimatePositive80 - 100000 + i * 10000);
    for (const startingPrincipal of fineRangePositive80) {
      if (startingPrincipal <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue > 0) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        principalForPositiveEnd80 = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
      }
    }
    
    console.log('\n=== CALCULATING PRINCIPAL FOR MAINTAINED VALUE (95%) ===');
    // Find the minimum principal that succeeds in 95% of simulations for ending >= starting value
    let initialEstimateMaintained95 = 0;
    for (const startingPrincipal of testAmounts95) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue >= startingPrincipal) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        initialEstimateMaintained95 = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
        break;
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH MAINTAINED VALUE (95%) around ${formatCurrency(initialEstimateMaintained95)} ===`);
    const fineRangeMaintained95 = Array.from({ length: 21 }, (_, i) => initialEstimateMaintained95 - 100000 + i * 10000);
    for (const startingPrincipal of fineRangeMaintained95) {
      if (startingPrincipal <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue >= startingPrincipal) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.95) {
        principalForMaintainedValue = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 95% THRESHOLD`);
      }
    }
    
    console.log('\n=== CALCULATING PRINCIPAL FOR MAINTAINED VALUE (80%) ===');
    // Find the minimum principal that succeeds in 80% of simulations for ending >= starting value
    let initialEstimateMaintained80 = 0;
    for (const startingPrincipal of testAmounts80) {
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue >= startingPrincipal) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        initialEstimateMaintained80 = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
        break;
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
      }
    }
    
    // Fine-grained search around the initial estimate
    console.log(`\n=== FINE-GRAINED SEARCH MAINTAINED VALUE (80%) around ${formatCurrency(initialEstimateMaintained80)} ===`);
    const fineRangeMaintained80 = Array.from({ length: 21 }, (_, i) => initialEstimateMaintained80 - 100000 + i * 10000);
    for (const startingPrincipal of fineRangeMaintained80) {
      if (startingPrincipal <= 0) continue;
      
      let successCount = 0;
      
      for (let realization = 0; realization < NUM_REALIZATIONS; realization++) {
        let currentValue = startingPrincipal;
        
        // Simulate 15 years of monthly returns
        for (let year = 0; year < PROJECTION_YEARS; year++) {
          for (let month = 0; month < 12; month++) {
            // Get GARCH simulated return (100% stocks)
            const monthlyReturn = generateGarchReturn();
            
            // Apply return and subtract drawdown
            currentValue = currentValue * (1 + monthlyReturn) - desiredMonthlyDrawdown;
          }
        }
        
        if (currentValue >= startingPrincipal) {
          successCount++;
        }
      }
      
      const successRate = successCount / NUM_REALIZATIONS;
      if (successRate >= 0.80) {
        principalForMaintainedValue80 = startingPrincipal;
        console.log(`✓ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations)`);
      } else {
        console.log(`✗ ${formatCurrency(startingPrincipal)} starting principal: ${(successRate * 100).toFixed(1)}% success rate (${successCount}/${NUM_REALIZATIONS} simulations) - BELOW 80% THRESHOLD`);
      }
    }
    
    console.log('\n=== FINAL RESULTS ===');
    console.log(`Principal needed for positive end value (95% confidence): ${formatCurrency(principalForPositiveEnd)}`);
    console.log(`Principal needed for positive end value (80% confidence): ${formatCurrency(principalForPositiveEnd80)}`);
    console.log(`Principal needed to maintain starting value (95% confidence): ${formatCurrency(principalForMaintainedValue)}`);
    console.log(`Principal needed to maintain starting value (80% confidence): ${formatCurrency(principalForMaintainedValue80)}`);
    
    setReverseCalculatorResults({
      principalForPositiveEnd,
      principalForPositiveEnd80,
      principalForMaintainedValue,
      principalForMaintainedValue80
    });
  };

  // GARCH variance state for persistent variance across calls
  const garchVarianceRef = useRef(0.003);

  // Helper function to generate GARCH returns on-demand
  const generateGarchReturn = () => {
    // Optimized GARCH parameters from Python optimization
    const omega = 0.0002;   // Constant
    const alpha = 0.15;     // ARCH parameter
    const beta = 0.80;      // GARCH parameter
    const drift = 0.010;    // Monthly drift term (~1.0% monthly return)
    const volatilityScale = 0.52; // Volatility scaling factor to match historical std
    
    // Generate random shock using Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Apply volatility scaling to control the overall volatility
    const shock = z0 * volatilityScale;
    
    // Calculate return with drift term
    const return_val = drift + shock * Math.sqrt(garchVarianceRef.current);
    
    // Update variance for next period (GARCH(1,1) equation)
    garchVarianceRef.current = omega + alpha * Math.pow(shock, 2) + beta * garchVarianceRef.current;
    
    // Ensure variance doesn't explode or collapse
    garchVarianceRef.current = Math.max(0.0001, Math.min(0.01, garchVarianceRef.current));
    
    return return_val;
  };

  // Helper functions for Diagnostics tab
  const generateHistogramData = (data: number[], title: string, sharedRange?: { min: number; max: number }) => {
    if (data.length === 0) return [];
    
    const minValue = sharedRange ? sharedRange.min : Math.min(...data);
    const maxValue = sharedRange ? sharedRange.max : Math.max(...data);
    
    // Create bins with appropriate intervals based on data range
    const range = maxValue - minValue;
    const binCount = Math.min(20, Math.max(10, Math.floor(data.length / 50)));
    const binSize = range / binCount;
    
    const histogramData = Array.from({ length: binCount }, (_, i) => {
      const rangeStart = minValue + i * binSize;
      const rangeEnd = minValue + (i + 1) * binSize;
      const count = data.filter(value => value >= rangeStart && value < rangeEnd).length;
      
      return {
        range: `${(rangeStart * 100).toFixed(1)}% - ${(rangeEnd * 100).toFixed(1)}%`,
        count,
        rangeStart,
        rangeEnd
      };
    });
    
    return histogramData;
  };

  // Generate shared histogram data for both datasets
  const generateSharedHistogramData = () => {
    if (historicalReturns.length === 0 || garchSimulationData.length === 0) {
      return { historical: [], garch: [], sharedRange: null };
    }
    
    // Calculate shared range across both datasets
    const allData = [...historicalReturns, ...garchSimulationData];
    const minValue = Math.min(...allData);
    const maxValue = Math.max(...allData);
    const sharedRange = { min: minValue, max: maxValue };
    
    const historicalData = generateHistogramData(historicalReturns, 'Historical Returns', sharedRange);
    const garchData = generateHistogramData(garchSimulationData, 'GARCH Simulation', sharedRange);
    
    return { historical: historicalData, garch: garchData, sharedRange };
  };

  const calculateMean = (data: number[]) => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  };

  const calculateMedian = (data: number[]) => {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  };

  const calculatePercentile = (data: number[], percentile: number) => {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (percentile / 100));
    return sorted[index];
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Mortgage Drawdown Calculator
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="calculator tabs">
            <Tab label="Main" />
            <Tab label="Calculator" />
            <Tab label="Diagnostics" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
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

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/heatmap')}
            >
              View Heatmap Analysis
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={calculatorTabValue} onChange={handleCalculatorTabChange} aria-label="calculator sub-tabs">
              <Tab label="Safe Withdrawal" />
              <Tab label="Required Principal" />
            </Tabs>
          </Box>

          {calculatorTabValue === 0 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Safe Withdrawal Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Calculate safe monthly drawdown amounts using 100% stock allocation and historical S&P 500 returns.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  label="How much is in the drawdown account?"
                  type="number"
                  value={drawdownAccountInput}
                  onChange={(e) => setDrawdownAccountInput(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>
                  }}
                />
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={calculateDrawdownAmounts}
                  disabled={historicalReturns.length === 0}
                >
                  Calculate Safe Drawdown Amounts
                </Button>
              </Box>

              {calculatorResults && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Results
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    <Paper elevation={1} sx={{ p: 2, backgroundColor: 'success.light' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Principal ends greater than zero:
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'success.dark' }}>
                        95% confidence: {formatCurrency(calculatorResults.principalGreaterThanZero)} per month
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'success.dark' }}>
                        {formatCurrency(calculatorResults.principalGreaterThanZero * 12)} per year ({((calculatorResults.principalGreaterThanZero * 12 / parseFloat(drawdownAccountInput)) * 100).toFixed(1)}% of principal)
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'success.dark', mt: 1 }}>
                        80% confidence: {formatCurrency(calculatorResults.principalGreaterThanZero80)} per month
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'success.dark' }}>
                        {formatCurrency(calculatorResults.principalGreaterThanZero80 * 12)} per year ({((calculatorResults.principalGreaterThanZero80 * 12 / parseFloat(drawdownAccountInput)) * 100).toFixed(1)}% of principal)
                      </Typography>
                    </Paper>
                    
                    <Paper elevation={1} sx={{ p: 2, backgroundColor: 'info.light' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Principal same or greater than starting value:
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'info.dark' }}>
                        95% confidence: {formatCurrency(calculatorResults.principalSameOrGreater)} per month
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'info.dark' }}>
                        {formatCurrency(calculatorResults.principalSameOrGreater * 12)} per year ({((calculatorResults.principalSameOrGreater * 12 / parseFloat(drawdownAccountInput)) * 100).toFixed(1)}% of principal)
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'info.dark', mt: 1 }}>
                        80% confidence: {formatCurrency(calculatorResults.principalSameOrGreater80)} per month
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'info.dark' }}>
                        {formatCurrency(calculatorResults.principalSameOrGreater80 * 12)} per year ({((calculatorResults.principalSameOrGreater80 * 12 / parseFloat(drawdownAccountInput)) * 100).toFixed(1)}% of principal)
                      </Typography>
                    </Paper>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Distribution of Final Values ({formatCurrency(calculatorResults.principalGreaterThanZero)} monthly drawdown - 95% confidence)
                  </Typography>
                  <Box sx={{ height: 400, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calculatorResults.histogramData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="range" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={Math.max(0, Math.floor(calculatorResults.histogramData.length / 20) - 1)}
                        />
                        <YAxis />
                        <Tooltip 
                          content={({ payload, label }) => {
                            const data = payload?.[0]?.payload;
                            if (!data) return null;
                            return (
                              <Box sx={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{label}</Typography>
                                <Typography variant="body2">Count: {data.count}</Typography>
                                <Typography variant="body2">Cumulative Percentage: {data.cumulativePercentage}%</Typography>
                              </Box>
                            );
                          }}
                        />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Based on 1,000 simulations using GARCH simulation over 15 years.
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {calculatorTabValue === 1 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Required Principal Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Calculate the minimum starting principal needed to support a desired monthly drawdown using 100% stock allocation with GARCH simulation.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  label="Desired monthly drawdown amount?"
                  type="number"
                  value={desiredDrawdownInput}
                  onChange={(e) => setDesiredDrawdownInput(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>
                  }}
                />
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={calculateRequiredPrincipal}
                  disabled={historicalReturns.length === 0}
                >
                  Calculate Required Principal
                </Button>
              </Box>

              {reverseCalculatorResults && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Results
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Paper elevation={1} sx={{ p: 2, backgroundColor: 'success.light' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Principal needed for positive end value:
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'success.dark' }}>
                        95% confidence: {formatCurrency(reverseCalculatorResults.principalForPositiveEnd)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'success.dark' }}>
                        Withdrawal rate: {((parseFloat(desiredDrawdownInput) * 12 / reverseCalculatorResults.principalForPositiveEnd) * 100).toFixed(1)}% of principal
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'success.dark', mt: 1 }}>
                        80% confidence: {formatCurrency(reverseCalculatorResults.principalForPositiveEnd80)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'success.dark' }}>
                        Withdrawal rate: {((parseFloat(desiredDrawdownInput) * 12 / reverseCalculatorResults.principalForPositiveEnd80) * 100).toFixed(1)}% of principal
                      </Typography>
                    </Paper>
                    
                    <Paper elevation={1} sx={{ p: 2, backgroundColor: 'info.light' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Principal needed to maintain starting value:
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'info.dark' }}>
                        95% confidence: {formatCurrency(reverseCalculatorResults.principalForMaintainedValue)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'info.dark' }}>
                        Withdrawal rate: {((parseFloat(desiredDrawdownInput) * 12 / reverseCalculatorResults.principalForMaintainedValue) * 100).toFixed(1)}% of principal
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'info.dark', mt: 1 }}>
                        80% confidence: {formatCurrency(reverseCalculatorResults.principalForMaintainedValue80)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'info.dark' }}>
                        Withdrawal rate: {((parseFloat(desiredDrawdownInput) * 12 / reverseCalculatorResults.principalForMaintainedValue80) * 100).toFixed(1)}% of principal
                      </Typography>
                    </Paper>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Based on 1,000 simulations using GARCH simulation over 15 years.
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Market Data Diagnostics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Analysis of historical S&P 500 monthly returns and GARCH simulation data.
            </Typography>
            
            {(() => {
              const sharedData = generateSharedHistogramData();
              const tickInterval = Math.max(0, Math.floor(sharedData.historical.length / 8) - 1);
              return (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  {/* Historical Returns */}
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Historical S&P 500 Returns
                    </Typography>
                    <Box sx={{ height: 300, mb: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sharedData.historical}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="range" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            interval={tickInterval}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <Typography variant="body2">Mean: {formatPercentage(calculateMean(historicalReturns))}</Typography>
                      <Typography variant="body2">Median: {formatPercentage(calculateMedian(historicalReturns))}</Typography>
                      <Typography variant="body2">P05: {formatPercentage(calculatePercentile(historicalReturns, 5))}</Typography>
                      <Typography variant="body2">P10: {formatPercentage(calculatePercentile(historicalReturns, 10))}</Typography>
                      <Typography variant="body2">P90: {formatPercentage(calculatePercentile(historicalReturns, 90))}</Typography>
                      <Typography variant="body2">P95: {formatPercentage(calculatePercentile(historicalReturns, 95))}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Data points: {historicalReturns.length}
                    </Typography>
                  </Paper>

                  {/* GARCH Simulation Data */}
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      GARCH Simulation Data
                    </Typography>
                    <Box sx={{ height: 300, mb: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sharedData.garch}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="range" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            interval={tickInterval}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <Typography variant="body2">Mean: {formatPercentage(calculateMean(garchSimulationData))}</Typography>
                      <Typography variant="body2">Median: {formatPercentage(calculateMedian(garchSimulationData))}</Typography>
                      <Typography variant="body2">P05: {formatPercentage(calculatePercentile(garchSimulationData, 5))}</Typography>
                      <Typography variant="body2">P10: {formatPercentage(calculatePercentile(garchSimulationData, 10))}</Typography>
                      <Typography variant="body2">P90: {formatPercentage(calculatePercentile(garchSimulationData, 90))}</Typography>
                      <Typography variant="body2">P95: {formatPercentage(calculatePercentile(garchSimulationData, 95))}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Data points: {garchSimulationData.length}
                    </Typography>
                  </Paper>
                </Box>
              );
            })()}
          </Paper>
        </TabPanel>
      </Box>
    </Container>
  );
}

export default App;
