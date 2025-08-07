const { google } = require("googleapis");

async function replyToAllComments(videoId, replyText, oauth2Client) {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // Paginate through comment threads on the video
  let nextPageToken = null;
  do {
    const response = await youtube.commentThreads.list({
      part: ["snippet"],
      videoId: videoId,
      maxResults: 100,
      pageToken: nextPageToken,
    });

    const commentThreads = response.data.items;
    if (!commentThreads) break;

    for (const thread of commentThreads) {
      const commentId = thread.snippet.topLevelComment.id;

      // Post reply to each comment
      await youtube.comments.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            parentId: commentId,
            textOriginal: replyText,
          },
        },
      });

      console.log(`Replied to comment ${commentId}`);
    }

    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);
}

// Note: oauth2Client must be authenticated with proper YouTube scope:
// https://www.googleapis.com/auth/youtube.force-ssl
