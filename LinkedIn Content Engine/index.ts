import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import Groq from "groq-sdk";

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function generateLinkedInPost(
  params: {
    topics: string[];
    audienceType: string;
    tone: string;
    goal: string;
  }
): Promise<{
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  fullPost: string;
  sourcesUsed: number;
  timestamp: string;
}> {
  const { topics, audienceType, tone, goal } = params;
  const timestamp = new Date().toISOString();
  const topicQuery = topics.join(" OR ");
  const serpApiKey = process.env.SERP_API_KEY || "";

  let latestArticles: Array<{ title: string }> = [];

  try {
    const newsResp = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google_news",
        q: topicQuery,
        gl: "us",
        hl: "en",
        num: 5,
        tbs: "qdr:d",
        api_key: serpApiKey,
      },
    });
    latestArticles = newsResp.data.news_results || [];
  } catch {}

  const newsSummary = latestArticles.map(a => `- ${a.title}`).join("\n");

  const systemPrompt = `
You are an expert LinkedIn content strategist. 
Write a compelling LinkedIn post based ONLY on these real-time sources.

Topics: ${topics.join(", ")}
Audience: ${audienceType}
Tone: ${tone}
Goal: ${goal}

Recent Google News:
${newsSummary}

Return JSON with:
IMPORTANT: Respond with ONLY a valid JSON object and nothing else. Do not add extra text.

- hook: captivating start
- body: detailed insights incorporating recent events
- cta: call to action
- hashtags: array of trending relevant hashtags
- fullPost: complete post combining all elements
- sourcesUsed: number of unique sources referenced
`;

  const completion = await groqClient.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: systemPrompt }],
    temperature: 0.5,
  });

  let postObject: {
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    fullPost: string;
    sourcesUsed: number;
  };

  try {
    let raw = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Groq did not return valid JSON");
    postObject = JSON.parse(match[0]);
  } catch {
    throw new Error("Groq did not return valid JSON");
  }

  return {
    ...postObject,
    timestamp,
  };
}
