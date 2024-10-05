import axios from 'axios';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type');
  const eventType = searchParams.get('eventType');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (type === 'video' && eventType === 'live') {
      url += '&sp=EgJAAQ%253D%253D'; // This filter ensures only live content is returned
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const ytInitialData = extractYtInitialData(response.data);

    if (!ytInitialData) {
      throw new Error('Failed to extract YouTube data');
    }

    const items = extractVideoItems(ytInitialData);

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('YouTube search error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred while fetching YouTube data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function extractYtInitialData(html) {
  const ytInitialDataRegex = /var ytInitialData = (.+?);<\/script>/;
  const match = html.match(ytInitialDataRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (parseError) {
      console.error('Error parsing ytInitialData:', parseError);
    }
  }
  return null;
}

function extractVideoItems(ytInitialData) {
  const contents = ytInitialData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  if (!contents) return [];

  const videoRenderer = contents.flatMap(content => 
    content.itemSectionRenderer?.contents || []
  );

  return videoRenderer
    .filter(item => item.videoRenderer)
    .map(item => {
      const { videoRenderer } = item;
      const isLive = videoRenderer.badges?.some(badge => badge.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW") || false;
      return {
        id: videoRenderer.videoId,
        title: videoRenderer.title.runs[0].text,
        thumbnail: videoRenderer.thumbnail.thumbnails[0].url,
        views: isLive ? null : (videoRenderer.viewCountText?.simpleText || 'N/A'),
        duration: isLive ? 'LIVE' : (videoRenderer.lengthText?.simpleText || 'N/A'),
        uploadedAt: isLive ? null : (videoRenderer.publishedTimeText?.simpleText || 'N/A'),
        channelName: videoRenderer.ownerText?.runs[0]?.text || 'N/A',
        isLive: isLive,
      };
    });
}