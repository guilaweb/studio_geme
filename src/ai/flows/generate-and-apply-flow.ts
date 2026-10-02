'use server';
/**
 * @fileOverview A flow that analyzes user prompts, generates app code, and applies the changes.
 *
 * - generateAndApply - A function that handles analyzing the app prompt and applying changes.
 * - GenerateAndApplyInput - The input type for the generateAndApply function.
 * - GenerateAndApplyOutput - The return type for the generateAndApply function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  writeFile,
  readFile,
  listFiles,
  generateImage,
} from '@/ai/tools/file-system-tools';

const GenerateAndApplyInputSchema = z.object({
  prompt: z
    .string()
    .describe(
      'The detailed description of the app to be generated or modified.'
    ),
  files: z
    .array(z.string())
    .describe('A list of all files in the project.'),
});
export type GenerateAndApplyInput = z.infer<typeof GenerateAndApplyInputSchema>;

const FileObjectSchema = z.object({
  path: z
    .string()
    .describe('The full path of the file to create, e.g., `src/app/page.tsx`.'),
  content: z.string().describe('The full code content for the file.'),
});

const GenerateAndApplyOutputSchema = z.object({
  summary: z
    .string()
    .describe('A brief summary of the changes made to the app.'),
  files: z
    .array(FileObjectSchema)
    .describe('A list of files that were generated or modified.'),
  entryPoint: z
    .string()
    .describe(
      'The main route of the generated app, e.g., /tasks or /dashboard. Must start with a slash (/).'
    ),
  message: z
    .string()
    .describe('A confirmation message that the changes have been applied.'),
});
export type GenerateAndApplyOutput = z.infer<typeof GenerateAndApplyOutputSchema>;

export const prompt = ai.definePrompt({
  name: 'generateAndApplyPrompt',
  input: {schema: GenerateAndApplyInputSchema},
  output: {schema: GenerateAndApplyOutputSchema},
  tools: [writeFile, readFile, listFiles, generateImage],
  prompt: `You are an expert software architect and Next.js app developer.
Your task is to analyze a user's app description and the current state of the codebase, then generate the necessary code changes to fulfill the user's request by using the provided tools.

- Analyze the user's prompt to understand their goal. Take into account the entire conversation history.
- Use the listFiles tool to see what files are in the project.
- Use the readFile tool to understand the current application state.
- If you need a new library, you can add it to the package.json file. Use the writeFile tool to modify package.json. Any packages added will be installed automatically.
- If the user asks for an image or an icon, use the generateImage tool. Save the result from the tool using the writeFile tool to a file in the /public folder and reference it in the code.
- To use Firestore, import { db } from '@/lib/firebase' and use functions like collection, getDocs, addDoc, doc, updateDoc, deleteDoc from 'firebase/firestore'.
- When implementing Firestore, remind the user to configure their Firestore security rules in the Firebase console.
- Whenever you create or modify a React component, you must also create or update a corresponding test file (e.g., component.test.tsx). Use Jest and React Testing Library for the tests. Inform the user that test files have been generated and they can run 'npm test' to verify them.
- Use the writeFile tool to apply the necessary changes. When modifying a file, you must provide the ENTIRE final content of the file. Do not use diffs or partial snippets.
- The app must use Next.js with App Router.
- Components should be styled with Tailwind CSS and use components from the shadcn/ui library where possible.
- The code must be TypeScript.
- Determine the application's entry point if it's a new creation or if it changes (e.g., '/tasks' for a to-do list app). If no specific entry point is created, default to '/'.
- Provide a concise summary of the changes and a confirmation message.

IMPORTANT: Respond with a valid JSON object that conforms to the output schema. Your entire response will be in a JSON code block.

Conversation History:
{{{prompt}}}

Project Files:
{{#each files}}
- {{{this}}}
{{/each}}
`,
});

export const generateAndApplyFlow = ai.defineFlow(
  {
    name: 'generateAndApplyFlow',
    inputSchema: GenerateAndApplyInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { stream } = (ai as any).generateStream({
      model: 'googleai/gemini-2.5-flash',
      prompt: {
        role: 'user',
        content: [
          { text: `You are an expert software architect and Next.js app developer.
Your task is to analyze a user's app description and the current state of the codebase, then generate the necessary code changes to fulfill the user's request by using the provided tools.

- Analyze the user's prompt to understand their goal. Take into account the entire conversation history.
- Use the listFiles tool to see what files are in the project.
- Use the readFile tool to understand the current application state.
- If you need a new library, you can add it to the package.json file. Use the writeFile tool to modify package.json. Any packages added will be installed automatically.
- If the user asks for an image or an icon, use the generateImage tool. Save the result from the tool using the writeFile tool to a file in the /public folder and reference it in the code.
- To use Firestore, import { db } from '@/lib/firebase' and use functions like collection, getDocs, addDoc, doc, updateDoc, deleteDoc from 'firebase/firestore'.
- When implementing Firestore, remind the user to configure their Firestore security rules in the Firebase console.
- Whenever you create or modify a React component, you must also create or update a corresponding test file (e.g., component.test.tsx). Use Jest and React Testing Library for the tests. Inform the user that test files have been generated and they can run 'npm test' to verify them.
- Use the writeFile tool to apply the necessary changes. When modifying a file, you must provide the ENTIRE final content of the file. Do not use diffs or partial snippets.
- The app must use Next.js with App Router.
- Components should be styled with Tailwind CSS and use components from the shadcn/ui library where possible.
- The code must be TypeScript.
- Determine the application's entry point if it's a new creation or if it changes (e.g., '/tasks' for a to-do list app). If no specific entry point is created, default to '/'.
- Provide a concise summary of the changes and a confirmation message.

IMPORTANT: Respond with a valid JSON object that conforms to the output schema. Your entire response will be in a JSON code block.

Conversation History:
${input.prompt}

Project Files:
${input.files.join('\n- ')}
`
          },
        ],
      },
      tools: [writeFile, readFile, listFiles, generateImage],
      output: {
        schema: GenerateAndApplyOutputSchema,
        format: 'json'
      }
    });

    let finalResponse = '';
    for await (const chunk of stream) {
      if (chunk.output) {
        finalResponse += JSON.stringify(chunk.output, null, 2);
      }
    }
    return finalResponse;
  }
);
