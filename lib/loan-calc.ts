export interface LoanCalcConfig {
  processingFee: number
  insuranceRate: number
  interestRate: number
  defaultNoOfWeeks: number
}

export interface LoanBreakdown {
  insuranceAmount: number
  processingFee: number
  interestAmount: number
  disbursementAmount: number
  weeklyRepayment: number
  totalRepayment: number
  principalOutstanding: number
  noOfWeeks: number
}

export function computeLoanBreakdown(loanAmount: number, noOfWeeks: number, config: LoanCalcConfig): LoanBreakdown {
  const insuranceAmount = Math.round((loanAmount * config.insuranceRate) / 100)
  const processingFee = config.processingFee
  const interestAmount = Math.round((loanAmount * config.interestRate) / 100)
  // Option 2: processing fee & insurance collected separately in cash at disbursement, NOT included in EMI
  const total = loanAmount + interestAmount
  const weeklyRepayment = Math.ceil(total / noOfWeeks)

  return {
    insuranceAmount,
    processingFee,
    interestAmount,
    disbursementAmount: loanAmount,
    weeklyRepayment,
    totalRepayment: weeklyRepayment * noOfWeeks,
    principalOutstanding: loanAmount,
    noOfWeeks,
  }
}
