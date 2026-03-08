export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const tiktokRegex = /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/;
  if (!tiktokRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid TikTok URL' });
  }

  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tikwm.com/',
      }
    });

    const data = await response.json();

    if (data.code !== 0 || !data.data) {
      return res.status(500).json({ error: 'Failed to fetch video. Please check the URL and try again.' });
    }

    const videoData = data.data;

    return res.status(200).json({
      success: true,
      video: {
        title: videoData.title || 'TikTok Video',
        author: videoData.author?.nickname || videoData.author?.unique_id || 'Unknown',
        authorUsername: videoData.author?.unique_id || '',
        avatar: videoData.author?.avatar || '',
        cover: videoData.cover || videoData.origin_cover || '',
        duration: videoData.duration || 0,
        plays: videoData.play_count || 0,
        likes: videoData.digg_count || 0,
        comments: videoData.comment_count || 0,
        shares: videoData.share_count || 0,
        downloadUrl: videoData.hdplay || videoData.play,
        music: videoData.music_info?.play || videoData.music || null,
        musicTitle: videoData.music_info?.title || '',
      }
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
}