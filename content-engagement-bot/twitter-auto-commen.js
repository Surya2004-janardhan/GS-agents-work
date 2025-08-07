const { TwitterApi } = require('twitter-api-v2');

async function replyToAllReplies(tweetId, replyText, client) {
  // Fetch all replies to the tweet via conversation ID filtering
  // This example fetches recent replies (pagination can be added)

  const userResponse = await client.v2.me();
  const myUserId = userResponse.data.id;

  const query = `conversation_id:${tweetId} to:${myUserId}`;
  let nextToken = null;

  do {
    const searchParams = {
      'query': query,
      'tweet.fields': 'author_id,conversation_id',
      max_results: 100,
      next_token: nextToken,
    };

    const searchResult = await client.v2.get('tweets/search/recent', searchParams);
    const tweets = searchResult.data || [];

    for (const tweet of tweets) {
      // Reply to each reply
      await client.v2.reply(replyText, tweet.id);
      console.log(`Replied to tweet ${tweet.id}`);
    }

    nextToken = searchResult.meta?.next_token;
  } while (nextToken);
}

// Setup client with user auth credentials (OAuth 2.0 user context)
// Required scopes: tweet.read, tweet.write, users.read
