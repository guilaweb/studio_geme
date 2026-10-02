
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { writeFile, readFile, listFiles, generateImage } from '@/ai/tools/file-system-tools';
import { streamText, type Message } from 'ai';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { HOBBY_PLAN_DAILY_LIMIT } from '@/lib/config';


// Initialize Firebase Admin SDK
const adminApp = getAdminApp();
let adminAuth: admin.auth.Auth | undefined;
let adminDb: admin.firestore.Firestore | undefined;

if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
}

const GenerateAndApplyInputSchema = z.object({
  prompt: z.string(),
  files: z.array(z.string()).optional(),
});

const FileObjectSchema = z.object({
  path: z.string(),
  content: z.string(),
});

const GenerateAndApplyOutputSchema = z.object({
  summary: z.string(),
  files: z.array(FileObjectSchema),
  entryPoint: z.string(),
  message: z.string(),
});

// Function to format the conversation history
const formatHistory = (messages: Message[]) => {
  // We don't need the last message, as it's the current prompt.
  // We also dont want to include the initial assistant message card.
  const history = messages.slice(1, messages.length - 1);
  
  return history.map(m => {
    if (m.role === 'user') {
      return `User: ${m.content}`;
    }
    // For assistant messages, check if it's a JSON response.
    // If so, just extract the summary for a concise history.
    const jsonMatch = m.content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        const summary = jsonData.summary;
        if (summary) {
          return `Assistant: ${summary}`;
        }
      } catch (e) {
        // Fallback to full content if JSON parsing fails
      }
    }
    // Fallback for non-JSON or initial assistant message
    return `Assistant: I'm ready to help you build.`;
  }).join('\n');
};

async function handleRequest(req: Request) {
  if (!adminAuth || !adminDb) {
    const errorJson = {
      summary: "Erro de Configuração",
      files: [],
      entryPoint: "/",
      message: 'A configuração do Firebase Admin não está completa. Por favor, verifique as variáveis de ambiente do servidor.'
    };
    return new Response(JSON.stringify(errorJson), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const errorJson = {
      summary: "Erro de Autenticação",
      files: [],
      entryPoint: "/",
      message: 'Não autorizado. Token de autenticação não fornecido.'
    };
    return new Response(JSON.stringify(errorJson), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const idToken = authHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying token:', error);
    const errorJson = {
      summary: "Sessão Inválida",
      files: [],
      entryPoint: "/",
      message: 'Sessão inválida. Por favor, faça login novamente.'
    };
    return new Response(JSON.stringify(errorJson), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const uid = decodedToken.uid;
  const userDocRef = adminDb.collection('users').doc(uid);
  
  const userDoc = await userDocRef.get();
  if (!userDoc.exists) {
      const errorJson = {
        summary: "Usuário Não Encontrado",
        files: [],
        entryPoint: "/",
        message: 'Usuário não encontrado no banco de dados.'
      };
      return new Response(JSON.stringify(errorJson), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  
  const userData = userDoc.data()!;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Reset daily count if it's a new day
  if (userData.lastRequestDate !== today) {
      await userDocRef.update({
        requestsToday: 0,
        lastRequestDate: today
      });
      userData.requestsToday = 0;
  }
  
  // Handle rate limiting for hobby plan
  if (userData.plan === 'hobby' && userData.requestsToday >= HOBBY_PLAN_DAILY_LIMIT) {
      const errorJson = {
        summary: "Limite Diário Atingido",
        files: [],
        entryPoint: "/",
        message: `Você atingiu o limite de ${HOBBY_PLAN_DAILY_LIMIT} solicitações diárias para o plano Hobby. Faça upgrade para o plano Pro para mais solicitações.`
      };
      const responseContent = `\`\`\`json\n${JSON.stringify(errorJson, null, 2)}\n\`\`\``;
      return new Response(responseContent, { headers: { 'Content-Type': 'text/plain' } });
  }


  // If all checks pass, increment request count for hobby plan and proceed
  if (userData.plan === 'hobby') {
    await userDocRef.update({
        requestsToday: admin.firestore.FieldValue.increment(1),
        lastRequestDate: today
    });
  }

  const { messages } = await req.json();
  const lastUserMessage = messages[messages.length - 1];
  const promptText = lastUserMessage.content;
  const historyText = formatHistory(messages);

  // In a real app, you'd implement a function to get file content.
  const projectFiles: string[] = [];
  
  const result = await streamText({
      model: (ai as any).model?.('googleai/gemini-2.5-flash') || ('googleai/gemini-2.5-flash' as any),
      tools: { writeFile, readFile, listFiles, generateImage } as any,
      system: `You are an expert software architect and Next.js app developer.
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

IMPORTANT: Respond with a valid JSON object that conforms to the output schema, enclosed in a markdown JSON code block.
`,
      prompt: `
Conversation History:
${historyText}

User: ${promptText}

Project Files:
${projectFiles.join('\n- ')}
`,
      // @ts-ignore - The AI SDK and Genkit tool types are slightly mismatched.
      toolChoice: 'auto',
  });

  return result.toAIStreamResponse();
}

export async function POST(req: Request) {
    return await handleRequest(req);
}
