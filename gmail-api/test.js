require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");

const app = express();
const PORT = 3000;

// Replace with your OAuth2 credentials or load from secure storage
const oAuth2Client = new google.auth.OAuth2(
  
);
// SCOPES for Gmail read access
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// Redirect user to Google's OAuth consent screen
app.get("/login", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // gets a refresh token
    scope: SCOPES,
    prompt: "consent", // always ask user
  });
  res.redirect(authUrl);
});

// Handle OAuth callback and save tokens
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided.");

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    // Here, you would save tokens to database/session in production
    oAuth2Client.setCredentials(tokens);

    // Demo: Fetch last 5 unread emails right away
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["UNREAD"],
      maxResults: 5,
    });

    const messages = listRes.data.messages || [];
    if (!messages.length) {
      return res.send("No unread messages found.");
    }

    // Get full message details
    const emails = [];
    for (const msg of messages) {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const payload = msgRes.data.payload;
      const headers = payload.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "";
      const from = headers.find((h) => h.name === "From")?.value || "";
      let body = "";
      if (payload.parts && payload.parts.length) {
        const part = payload.parts.find((p) => p.mimeType === "text/plain");
        if (part && part.body && part.body.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      } else if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, "base64").toString("utf-8");
      }
      emails.push({ id: msg.id, from, subject, body });
    }
    console.log("mails", emails);
    res.json(emails);
  } catch (err) {
    console.error(err);
    res.status(500).send("Authentication failed or API error.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
