'use server';

/**
 * @fileOverview A flow for generating personalized financial suggestions based on user records.
 *
 * - generateFinancialSuggestions - A function that generates financial suggestions.
 * - FinancialSuggestionsInput - The input type for the generateFinancialSuggestions function.
 * - FinancialSuggestionsOutput - The return type for the generateFinancialSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialSuggestionsInputSchema = z.object({
  financialRecords: z
    .string()
    .describe(
      'A string containing the user financial records including income, expenses, debts, and savings.'
    ),
});
export type FinancialSuggestionsInput = z.infer<typeof FinancialSuggestionsInputSchema>;

const FinancialSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('Personalized suggestions for better money management.'),
});
export type FinancialSuggestionsOutput = z.infer<typeof FinancialSuggestionsOutputSchema>;

export async function generateFinancialSuggestions(input: FinancialSuggestionsInput): Promise<FinancialSuggestionsOutput> {
  return generateFinancialSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialSuggestionsPrompt',
  input: {schema: FinancialSuggestionsInputSchema},
  output: {schema: FinancialSuggestionsOutputSchema},
  prompt: `You are an expert financial advisor. Analyze the following financial records and provide personalized suggestions for better money management.

Financial Records: {{{financialRecords}}}

Suggestions:`,
});

const generateFinancialSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateFinancialSuggestionsFlow',
    inputSchema: FinancialSuggestionsInputSchema,
    outputSchema: FinancialSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
