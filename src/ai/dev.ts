
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-and-apply-flow.ts';
import '@/ai/flows/risk-analyzer-flow.ts';
import '@/ai/flows/daily-report-summary-flow.ts';
import '@/ai/flows/safety-analysis-flow.ts';
import '@/ai/flows/automation-flow.ts';
import '@/ai/flows/generate-wbs-flow.ts';
import '@/ai/flows/resource-suggester-flow.ts';
import '@/ai/flows/equipment-suggester-flow.ts';
