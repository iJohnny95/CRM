import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const PROMPT_TYPES = {
    briefing: "Provide a comprehensive briefing for this lead. Highlight potential strengths and weaknesses of their business.",
    call_prep: "Prepare me for my first phone call with this lead. Give me a script/outline and key questions to ask.",
    follow_up: "I've already contacted this lead. Help me prepare a follow-up strategy to keep their interest and move them through the pipeline.",
    closing: "Prepare a strategy to close the deal with this lead. What are the likely objections and how should I handle them?",
    custom: ""
};

const LANGUAGE_INSTRUCTION = "CRITICAL: You must respond in professional English. Ensure clear, concise, and helpful communication specialized for B2B sales development.";

export const getLeadAiInsight = async (lead, type = 'briefing', customQuery = '') => {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
        throw new Error("Gemini API key is not configured. Please add it to your .env file.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const context = `
CONTEXT: You are a Sales Expert and Lead Strategist for a high-end Digital Agency.
LEAD INFORMATION:
- Business Name: ${lead.business_name}
- Business Type: ${lead.business_type}
- Phone: ${lead.phone || 'N/A'}
- Address: ${lead.address || 'N/A'}
- Website: ${lead.website || 'No website'}
- Rating: ${lead.rating} (${lead.review_count} reviews)
- Contact Person: ${lead.contact_name || 'N/A'} (${lead.contact_role || 'N/A'})
- Email: ${lead.email || 'N/A'}
- Alternative Phone: ${lead.secondary_phone || 'N/A'}
- Pipeline Stage: ${lead.stage}
- Priority: ${lead.priority}
- Estimated Deal Value: €${lead.deal_value || 0}
- Added to CRM: ${lead.created_at}
- Source: ${lead.lead_source || 'Manual/Automation'}

NOTES:
${lead.notes?.map(n => `- [${n.created_at}]: ${n.content}`).join('\n') || 'No notes yet.'}

RECENT ACTIVITY:
${lead.activities?.map(a => `- [${a.created_at}] ${a.type}: ${a.description}`).join('\n') || 'No activity recorded.'}

FILES:
${lead.files?.map(f => `- ${f.name} (${f.type})`).join('\n') || 'No files uploaded.'}

YOUR TASK:
${PROMPT_TYPES[type] || customQuery}

${LANGUAGE_INSTRUCTION}

Please provide your response in Markdown format. Be professional, strategic, and practical.
`;

    try {
        const result = await model.generateContent(context);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini AI Error:", error);
        throw error;
    }
};

export const researchLead = async (lead) => {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
        throw new Error("Gemini API key is not configured. Please add it to your .env file.");
    }

    // Using gemini-3-flash-preview for speed and intelligence
    // We pass the googleSearchRetrieval tool to allow the model to search online
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        tools: [{ google_search: {} }]
    });

    const prompt = `
Task: Research the following business online and verify its details.
Business Name: ${lead.business_name}
Location: ${lead.address || 'N/A'}
Current Type: ${lead.business_type}
Current Phone: ${lead.phone || 'N/A'}
Current Website: ${lead.website || 'N/A'}
Current Email: ${lead.email || 'N/A'}

Your goal is to find the most accurate and up-to-date information for this business.
Compare your findings with the "Current" information provided.

Return ONLY a JSON object with the following structure:
{
  "summary": "Short summary of your findings (e.g., 'Found updated contact info and a different business category.')",
  "discrepancies": [
    {
      "field": "business_name", // or business_type, phone, address, website, email
      "current": "current_value",
      "suggested": "new_found_value",
      "reason": "Why this change is suggested (e.g., 'Official company website lists this number.')"
    }
  ]
}

If no discrepancies are found, return empty "discrepancies" array.
Do not include any other text besides the JSON.

${LANGUAGE_INSTRUCTION} - The 'summary' and 'reason' fields MUST be in English.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON - handle potential markdown code blocks
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Could not parse AI response as JSON");
    } catch (error) {
        console.error("Gemini Research Error:", error);
        throw error;
    }
};
