const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const loader = document.getElementById('loader');
const errorBox = document.getElementById('errorBox');
const resultCard = document.getElementById('resultCard');
const progressBar = document.getElementById('progressBar');

let currentImages = [];
let currentUsername = 'unknown';

urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchVideo(); });
urlInput.addEventListener('input', updatePasteBtn);

function updatePasteBtn() {
  const btn = document.getElementById('pasteBtn');
  if (urlInput.value.trim()) {
    btn.textContent = 'Hapus';
    btn.onclick = clearURL;
  } else {
    btn.textContent = 'Tempel';
    btn.onclick = pasteURL;
  }
}

async function pasteURL() {
  try {
    const text = await navigator.clipboard.readText();
    urlInput.value = text;
    updatePasteBtn();
    urlInput.focus();
  } catch (e) {
    urlInput.focus();
    updatePasteBtn();
  }
}

function clearURL() {
  urlInput.value = '';
  updatePasteBtn();
  resetUI();
  urlInput.focus();
}

function showProgress() {
  progressBar.className = 'progress-bar loading';
}

function hideProgress() {
  progressBar.className = 'progress-bar done';
  setTimeout(() => { progressBar.className = 'progress-bar'; }, 700);
}

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatDuration(s) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function resetUI() {
  errorBox.classList.remove('active');
  resultCard.classList.remove('active');
  loader.classList.remove('active');
  currentImages = [];
}

// ─── Check apakah video bisa diputar (codec compatible) ───
async function isVideoPlayable(url) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';

    const timeout = setTimeout(() => {
      video.src = '';
      resolve(true); // timeout = asumsikan bisa, coba download biasa
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      // Jika ada video track dengan lebar > 0, codec didukung
      const hasVideo = video.videoWidth > 0;
      video.src = '';
      resolve(hasVideo);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      video.src = '';
      resolve(false); // codec tidak didukung
    };

    // Pakai proxy untuk cek
    video.src = '/api/proxy?url=' + encodeURIComponent(url);
  });
}

// ─── Download via proxy biasa ───
async function downloadViaProxy(url, filename) {
  const response = await fetch('/api/proxy?url=' + encodeURIComponent(url));
  if (!response.ok) throw new Error('Proxy fetch failed');
  const blob = await response.blob();
  triggerDownload(blob, filename);
}

// ─── Download via convert (FFmpeg re-encode) ───
async function downloadViaConvert(url, filename, btn) {
  // Update label to show converting status
  if (btn) btn.innerHTML = '<span class="spin"></span> Mengkonversi...';

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) throw new Error('Convert failed');
  const blob = await response.blob();
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

// ─── Main download handler dengan fallback ke convert ───
async function downloadFile(btn) {
  const url = btn.dataset.url;
  const filename = btn.dataset.filename || 'tiksave_download';
  const isVideo = filename.endsWith('.mp4');
  if (!url) return;

  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';
  showProgress();

  try {
    if (isVideo) {
      // Cek dulu apakah codec compatible
      const playable = await isVideoPlayable(url);

      if (!playable) {
        // BVC2 atau codec tidak dikenal → convert dulu
        await downloadViaConvert(url, filename, btn);
      } else {
        // Codec normal (H.264) → download langsung
        await downloadViaProxy(url, filename);
      }
    } else {
      // Audio/music → langsung proxy
      await downloadViaProxy(url, filename);
    }
  } catch (e) {
    console.error('Download error:', e);
    // Last resort: buka di tab baru
    window.open(url, '_blank');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
    hideProgress();
  }
}

async function downloadSingleImage(url, index) {
  showProgress();
  try {
    const response = await fetch('/api/proxy?url=' + encodeURIComponent(url));
    const blob = await response.blob();
    triggerDownload(blob, `${currentUsername}_image${index + 1}.jpg`);
  } catch (e) {
    window.open(url, '_blank');
  } finally {
    hideProgress();
  }
}

async function downloadAllImages() {
  if (!currentImages.length) return;

  const btn = document.querySelector('.btn-dl-all');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Menyiapkan...'; btn.disabled = true; }
  showProgress();

  try {
    const response = await fetch('/api/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: currentImages, username: currentUsername })
    });

    if (!response.ok) throw new Error('Gagal membuat ZIP');

    const blob = await response.blob();
    triggerDownload(blob, `${currentUsername}_images.zip`);
  } catch (e) {
    for (let i = 0; i < currentImages.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      try {
        const r = await fetch('/api/proxy?url=' + encodeURIComponent(currentImages[i]));
        const bl = await r.blob();
        triggerDownload(bl, `${currentUsername}_image${i + 1}.jpg`);
      } catch (err) {
        window.open(currentImages[i], '_blank');
      }
    }
  } finally {
    if (btn) { btn.textContent = origText; btn.disabled = false; }
    hideProgress();
  }
}

function renderImages(images) {
  const section = document.getElementById('imagesSection');
  const grid = document.getElementById('imagesGrid');
  if (!images || images.length === 0) { section.style.display = 'none'; return; }
  currentImages = images;
  grid.innerHTML = '';
  images.forEach((imgUrl, i) => {
    const item = document.createElement('div');
    item.className = 'img-item';
    item.innerHTML = `
      <img src="${imgUrl}" alt="Foto ${i + 1}" loading="lazy" onerror="this.style.display='none'"/>
      <button class="img-dl-btn" onclick="downloadSingleImage('${imgUrl}', ${i})"><span>Unduh</span></button>
    `;
    grid.appendChild(item);
  });
  section.style.display = 'block';
}

async function fetchVideo() {
  const url = urlInput.value.trim();
  if (!url) { urlInput.focus(); return; }

  resetUI();
  downloadBtn.disabled = true;
  document.getElementById('btnText').innerHTML = '<span class="spin"></span>';
  loader.classList.add('active');
  showProgress();

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil video.');

    const v = data.video;
    currentUsername = v.authorUsername || 'unknown';
    const ts = Date.now();

    document.getElementById('resCover').src = v.cover || '';
    document.getElementById('resAvatar').src = v.avatar || '';
    document.getElementById('resAuthor').textContent = v.author || '';
    document.getElementById('resHandle').textContent = v.authorUsername ? `@${v.authorUsername}` : '';
    document.getElementById('resTitle').textContent = v.title || '';
    document.getElementById('resDuration').textContent = formatDuration(v.duration);
    document.getElementById('resPlays').textContent = formatNum(v.plays) + ' tayang';
    document.getElementById('resLikes').textContent = formatNum(v.likes) + ' suka';
    document.getElementById('resComments').textContent = formatNum(v.comments) + ' komentar';

    const dlVideo = document.getElementById('dlVideoBtn');
    if (v.downloadUrl) {
      dlVideo.dataset.url = v.downloadUrl;
      dlVideo.dataset.filename = `${currentUsername}_${ts}.mp4`;
      dlVideo.style.display = 'flex';
    } else {
      dlVideo.style.display = 'none';
    }

    const dlMusic = document.getElementById('dlMusicBtn');
    if (v.music) {
      dlMusic.dataset.url = v.music;
      dlMusic.dataset.filename = `${currentUsername}_audio_${ts}.mp3`;
      dlMusic.textContent = v.musicTitle ? v.musicTitle.substring(0, 28) : 'Audio';
      dlMusic.style.display = 'flex';
    } else {
      dlMusic.style.display = 'none';
    }

    renderImages(v.images || []);
    resultCard.classList.add('active');

  } catch (err) {
    errorBox.classList.add('active');
    document.getElementById('errorText').textContent = err.message || 'Terjadi kesalahan. Coba lagi.';
  } finally {
    downloadBtn.disabled = false;
    document.getElementById('btnText').textContent = 'Unduh';
    loader.classList.remove('active');
    hideProgress();
  }
}