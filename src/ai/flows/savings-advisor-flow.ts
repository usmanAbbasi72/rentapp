'use server';
/**
 * @fileOverview AI Savings Advisor Flow
 *
 * This flow analyzes user financial records (transactions, debts, receivables)
 * and generates a personalized savings plan and advice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialRecordSchema = z.object({
  description: z.string(),
  amount: z.number(),
  type: z.string().optional(), // 'income' or 'expense'
  recordType: z.string(), // 'transaction', 'debt', 'receivable'
});

const SavingsAdvisorInputSchema = z.object({
  records: z.array(FinancialRecordSchema),
  currency: z.string().default('PKR'),
});
export type SavingsAdvisorInput = z.infer<typeof SavingsAdvisorInputSchema>;

const SavingsAdvisorOutputSchema = z.object({
  summary: z.string().describe('A brief overview of the user\'s current financial health.'),
  savingsPlan: z.string().describe('A step-by-step strategy for saving money.'),
  recommendedMonthlyGoal: z.number().describe('A recommended amount to save each month in the local currency.'),
  tips: z.array(z.string()).describe('Specific, actionable tips for the user.'),
});
export type SavingsAdvisorOutput = z.infer<typeof SavingsAdvisorOutputSchema>;

export async function getSavingsAdvice(input: SavingsAdvisorInput): Promise<SavingsAdvisorOutput> {
  return savingsAdvisorFlow(input);
}

const savingsAdvisorPrompt = ai.definePrompt({
  name: 'savingsAdvisorPrompt',
  input: { schema: SavingsAdvisorInputSchema },
  output: { schema: SavingsAdvisorOutputSchema },
  prompt: `You are an expert personal financial advisor. 
Analyze the following financial records for a user. The currency is {{{currency}}}.

Records:
{{#each records}}
- {{recordType}}: {{description}}, Amount: {{amount}}{{#if type}}, Type: {{type}}{{/if}}
{{/each}}

Based on this data:
1. Summarize their current financial situation (income vs expenses, debt burden).
2. Create a realistic savings plan.
3. Suggest a specific monthly savings goal in {{{currency}}}.
4. Provide 3-5 actionable tips to reduce expenses or manage debts better.

Be encouraging and professional.`,
});

const savingsAdvisorFlow = ai.defineFlow(
  {
    name: 'savingsAdvisorFlow',
    inputSchema: SavingsAdvisorInputSchema,
    outputSchema: SavingsAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await savingsAdvisorPrompt(input);
    if (!output) throw new Error('Failed to generate savings advice');
    return output;
  }
);
