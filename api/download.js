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
    const result = await fetchTikwm(url);
    return res.status(200).json(result);
  } catch (e1) {
    try {
      const result = await fetchSSSTik(url);
      return res.status(200).json(result);
    } catch (e2) {
      return res.status(500).json({ error: 'Gagal mengambil video. Coba lagi.' });
    }
  }
}

async function fetchTikwm(url) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.tikwm.com/',
    }
  });

  const data = await response.json();
  if (data.code !== 0 || !data.data) throw new Error('Tikwm failed');

  const v = data.data;

  const images = (v.images && v.images.length > 0) ? v.images : [];
  const livePhotos = (v.live_images && v.live_images.length > 0) ? v.live_images : [];

  const downloadUrl = v.play || v.hdplay || '';

  return {
    success: true,
    video: {
      title: v.title || 'TikTok Video',
      author: v.author?.nickname || 'Unknown',
      authorUsername: v.author?.unique_id || '',
      avatar: v.author?.avatar || '',
      cover: v.origin_cover || v.cover || '',
      duration: v.duration || 0,
      plays: v.play_count || 0,
      likes: v.digg_count || 0,
      comments: v.comment_count || 0,
      downloadUrl,
      music: v.music_info?.play || null,
      musicTitle: v.music_info?.title || '',
      timestamp: v.create_time || null,
      images: images.filter(Boolean),
      livePhotos: livePhotos.filter(Boolean),
    }
  };
}

async function fetchSSSTik(url) {
  const formData = new URLSearchParams();
  formData.append('id', url);
  formData.append('locale', 'id');
  formData.append('tt', '');

  const r = await fetch('https://ssstik.io/abc?url=dl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://ssstik.io/',
      'Origin': 'https://ssstik.io',
      'HX-Request': 'true',
      'HX-Target': 'target',
      'HX-Current-URL': 'https://ssstik.io/',
    },
    body: formData.toString()
  });

  if (!r.ok) throw new Error('SSSTik failed');
  const html = await r.text();

  const noWatermarkMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>.*?Without watermark/s);
  const withWatermarkMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>.*?With watermark/s);
  const downloadUrl = noWatermarkMatch?.[1] || withWatermarkMatch?.[1] || '';

  const titleMatch = html.match(/<p[^>]*class="[^"]*maintext[^"]*"[^>]*>(.*?)<\/p>/s);
  const authorMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/s);
  const coverMatch = html.match(/<img[^>]*src="(https:\/\/[^"]+)"[^>]*class="[^"]*result_thumbnail[^"]*"/);
  const musicMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>.*?Download Audio/s);

  if (!downloadUrl) throw new Error('No download URL found');

  return {
    success: true,
    video: {
      title: titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || 'TikTok Video',
      author: authorMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || 'Unknown',
      authorUsername: '',
      avatar: '',
      cover: coverMatch?.[1] || '',
      duration: 0,
      plays: 0,
      likes: 0,
      comments: 0,
      downloadUrl,
      music: musicMatch?.[1] || null,
      musicTitle: 'Audio',
      timestamp: null,
      images: [],
      livePhotos: [],
    }
  };
}