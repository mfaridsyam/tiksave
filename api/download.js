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
    return res.status(400).json({ error: 'URL TikTok tidak valid' });
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
      return res.status(500).json({ error: 'Gagal mengambil video. Pastikan link benar dan coba lagi.' });
    }

    const v = data.data;

    return res.status(200).json({
      success: true,
      video: {
        title: v.title || 'TikTok Video',
        author: v.author?.nickname || v.author?.unique_id || 'Unknown',
        authorUsername: v.author?.unique_id || '',
        avatar: v.author?.avatar || '',
        cover: v.cover || v.origin_cover || '',
        duration: v.duration || 0,
        plays: v.play_count || 0,
        likes: v.digg_count || 0,
        comments: v.comment_count || 0,
        downloadUrl: v.hdplay || v.play || '',
        music: v.music_info?.play || v.music || null,
        musicTitle: v.music_info?.title || '',
      }
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Server error. Coba lagi nanti.' });
  }
}