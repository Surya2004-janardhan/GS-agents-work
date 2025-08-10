require("dotenv").config();
const axios = require("axios");
const Groq = require("groq-sdk");

const groqClient = new Groq({
  apiKey: "",
});

async function generateLinkedInPost({ topics, audienceType, tone, goal }) {
  const timestamp = new Date().toISOString();
  const topicQuery = topics.join(" OR ");
  const serpApiKey = process.env.SERP_API_KEY;

  let latestArticles = [];
  let redditPosts = [];

  // 1. Fetch latest Google News via SerpAPI
  try {
    const newsResp = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google_news",
        q: topicQuery,
        gl: "us",
        hl: "en",
        num: 5,
        tbs: "qdr:w", // filter for news in the past 24 hours

        api_key: serpApiKey,
      },
    });
    console.log(newsResp.data.news_results);
    latestArticles = newsResp.data.news_results || [];
  } catch (err) {
    console.error("Google News API error:", err.message);
  }

  // 2. Fetch latest Reddit posts via SerpAPI - corrected parameters

  // 3. Summarize sources for Groq
  const newsSummary = latestArticles.map((a) => `- ${a.title}`).join("\n");
  console.log(newsSummary);
  // const redditSummary = redditPosts.map((r) => `- ${r.title}`).join("\n");

  // 4. Strong prompt for Groq
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

  // 5. Call Groq
  const completion = await groqClient.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: systemPrompt }],
    temperature: 0.5,
  });

  let postObject = {};
  try {
    let raw = completion.choices[0].message.content.trim();

    // Extract only JSON block
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Groq did not return valid JSON");

    try {
      postObject = JSON.parse(match[0]);
    } catch (err) {
      console.error("JSON parse failed. Raw output:", raw);
      throw new Error("Groq did not return valid JSON");
    }
  } catch {
    throw new Error("Groq did not return valid JSON");
  }

  return {
    ...postObject,
    timestamp,
  };
}

// Example run
if (require.main === module) {
  (async () => {
    try {
      const postData = await generateLinkedInPost({
        topics: ["artificial intelligence", "machine learning"],
        audienceType: "tech_professionals",
        tone: "thought_leadership",
        goal: "educate",
      });
      console.log(postData);
    } catch (err) {
      console.error("Error generating post:", err);
    }
  })();
}
