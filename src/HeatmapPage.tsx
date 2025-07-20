import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  calculateProjection, 
  calculateMonthlyPayment, 
  STARTING_LIQUID, 
  PROJECTION_YEARS, 
  MONTHLY_CONTRIBUTION,
  MONTHLY_INCOME,
  OTHER_DEBT
} from './calculations';

// Constants for the table
const HOUSE_PRICE_STEPS = [2000000, 2100000, 2200000, 2300000, 2400000, 2500000, 2600000, 2700000, 2800000, 2900000, 3000000, 3100000, 3200000, 3300000, 3400000, 3500000, 3600000, 3700000, 3800000, 3900000, 4000000];
const MONTHLY_DRAWDOWN_STEPS = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 12500, 13000];

function HeatmapPage() {
  const navigate = useNavigate();
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [minValue, setMinValue] = useState<number>(0);
  const [maxValue, setMaxValue] = useState<number>(0);
  const [historicalReturns, setHistoricalReturns] = useState<number[]>([]);
  const [limitDTI, setLimitDTI] = useState<boolean>(true);

  // Load historical S&P 500 data
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        const response = await fetch('/data/sp500_returns.json');
        const data = await response.json();
        setHistoricalReturns(data.returns);
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

  useEffect(() => {
    if (historicalReturns.length === 0) return;

    // Calculate heatmap data
    const data: number[][] = [];
    let min = Infinity;
    let max = -Infinity;

    MONTHLY_DRAWDOWN_STEPS.forEach(drawdown => {
      const row: number[] = [];
      HOUSE_PRICE_STEPS.forEach(price => {
        // Calculate p50 value for this combination
        const p50Value = calculateP50Value(price, drawdown);
        row.push(p50Value);
        min = Math.min(min, p50Value);
        max = Math.max(max, p50Value);
      });
      data.push(row);
    });

    setHeatmapData(data);
    setMinValue(min);
    setMaxValue(max);
  }, [historicalReturns, limitDTI]);

  const calculateP50Value = (housePrice: number, monthlyDrawdown: number): number => {
    // Calculate monthly payment
    const { monthlyPayment } = calculateMonthlyPayment(housePrice, 0.0625); // Using 6.25% interest rate
    
    // Calculate drawdown account based on DTI limit
    let drawdownAccount: number;
    let remainingLiquid: number;
    
    if (limitDTI) {
      // Calculate maximum allowed monthly payment for 30% DTI
      const maxAllowedTotalPayment = (0.30 * MONTHLY_INCOME) - OTHER_DEBT;
      const monthlyPropertyTax = (housePrice * 0.009) / 12;
      const monthlyInsurance = (housePrice * 0.002) / 12;
      const maxAllowedMortgagePayment = maxAllowedTotalPayment - monthlyPropertyTax - monthlyInsurance;
      
      // Calculate the maximum loan amount that would result in this payment
      const monthlyInterestRate = 0.0625 / 12;
      const numberOfPayments = 30 * 12;
      const maxLoanAmount = maxAllowedMortgagePayment * 
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) / 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments));
      
      // Calculate additional downpayment needed
      const initialLoanAmount = housePrice * 0.8;
      const additionalDownpayment = Math.max(0, initialLoanAmount - maxLoanAmount);
      
      // Calculate final drawdown account
      const downPayment = housePrice * 0.2 + additionalDownpayment;
      drawdownAccount = STARTING_LIQUID - downPayment;
      remainingLiquid = STARTING_LIQUID - downPayment;
    } else {
      // Use fixed 1M drawdown account
      const downPayment = housePrice * 0.2;
      drawdownAccount = STARTING_LIQUID - downPayment;
      remainingLiquid = STARTING_LIQUID - downPayment;
    }
    
    // Calculate effective monthly payment (after drawdown)
    const effectiveMonthlyPayment = monthlyPayment - monthlyDrawdown;
    
    // Calculate drawdown account projection
    const drawdownProjection = calculateProjection(
      housePrice,
      drawdownAccount,
      monthlyDrawdown,
      0.0625, // Using 6.25% interest rate
      historicalReturns
    );
    
    // Calculate liquid account projection
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
      let currentValue = remainingLiquid;
      
      // Simulate 15 years of monthly returns
      for (let year = 0; year < PROJECTION_YEARS; year++) {
        for (let month = 0; month < 12; month++) {
          // Get random historical return for market portion
          const randomIndex = Math.floor(Math.random() * historicalReturns.length);
          const marketReturn = historicalReturns[randomIndex];
          
          // Calculate combined return based on portfolio allocation
          const combinedReturn = (MARKET_ALLOCATION * marketReturn) + (BOND_ALLOCATION * MONTHLY_RISK_FREE);
          
          // Apply return and add contribution minus payment
          currentValue = currentValue * (1 + combinedReturn) + (MONTHLY_CONTRIBUTION - effectiveMonthlyPayment);
        }
        
        // Store the year-end value for this realization
        allRealizations[year].push(currentValue);
      }
    }
    
    // Calculate percentiles for each year for liquid account
    const liquidProjection = allRealizations.map((yearValues, index) => {
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
    
    // Calculate total projection by adding both projections for each year
    const totalProjection = drawdownProjection.map((drawdownRow, index) => {
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
    
    // Return the p50 value from the last year of total projection
    return totalProjection[totalProjection.length - 1]?.p50 || 0;
  };

  const getCellColor = (value: number) => {
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const hue = normalizedValue * 120; // 120 is green, 0 is red
    return `hsl(${hue}, 70%, 50%)`;
  };

  const formatCurrency = (value: number) => {
    // Convert to millions and format with 2 decimal places
    const valueInMillions = value / 1000000;
    return `$${valueInMillions.toFixed(2)}M`;
  };

  const formatMonthlyDrawdown = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Heatmap Analysis
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              P50 Total Liquid Value by House Price and Monthly Drawdown
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={limitDTI}
                  onChange={(_, checked) => setLimitDTI(checked)}
                  color="primary"
                />
              }
              label="Limit DTI to 30%"
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                    Monthly Drawdown
                  </TableCell>
                  {HOUSE_PRICE_STEPS.map(price => (
                    <TableCell key={price} align="right">
                      {formatCurrency(price)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {heatmapData.map((row, rowIndex) => (
                  <TableRow key={MONTHLY_DRAWDOWN_STEPS[rowIndex]}>
                    <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                      {formatMonthlyDrawdown(MONTHLY_DRAWDOWN_STEPS[rowIndex])}
                    </TableCell>
                    {row.map((value, colIndex) => (
                      <TableCell 
                        key={colIndex} 
                        align="right"
                        sx={{ 
                          backgroundColor: getCellColor(value),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      >
                        {formatCurrency(value)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/')}
          >
            Back to Calculator
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default HeatmapPage; 