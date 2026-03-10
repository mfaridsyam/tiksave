const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const errorBox = document.getElementById('errorBox');
const resultCard = document.getElementById('resultCard');
const progressBar = document.getElementById('progressBar');

let currentImages = [];
let currentLivePhotos = [];
let currentUsername = 'unknown';

urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchVideo(); });
urlInput.addEventListener('input', updatePasteBtn);

function updatePasteBtn() {
  const btn = document.getElementById('pasteBtn');
  if (urlInput.value.trim()) {
    btn.textContent = 'Clear';
    btn.onclick = clearURL;
  } else {
    btn.textContent = 'Paste';
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
  }
}

function clearURL() {
  urlInput.value = '';
  updatePasteBtn();
  resetUI();
  urlInput.focus();
}

function showProgress() { progressBar.className = 'progress-bar loading'; }
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
  currentImages = [];
  currentLivePhotos = [];
}

function saveBlobAsFile(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
}

function proxyUrl(url, filename) {
  return '/api/proxy?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename);
}

async function downloadVideo(btn) {
  const url = btn.dataset.url;
  const filename = btn.dataset.filename || 'tiksave_video.mp4';
  if (!url) return;

  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Downloading...';
  showProgress();

  try {
    const response = await fetch(proxyUrl(url, filename));
    if (!response.ok) throw new Error('Failed to download video.');
    const blob = await response.blob();
    saveBlobAsFile(blob, filename);
  } catch (e) {
    window.open(proxyUrl(url, filename), '_blank');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
    hideProgress();
  }
}

async function downloadAudio(btn) {
  const url = btn.dataset.url;
  const filename = btn.dataset.filename || 'tiksave_audio.mp3';
  if (!url) return;

  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';
  showProgress();

  try {
    const response = await fetch(proxyUrl(url, filename));
    if (!response.ok) throw new Error('Failed to download audio.');
    const blob = await response.blob();
    saveBlobAsFile(blob, filename);
  } catch (e) {
    window.open(proxyUrl(url, filename), '_blank');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
    hideProgress();
  }
}

async function downloadSingleImage(url, index) {
  const baseName = `${currentUsername}_image${index + 1}`;
  const jpgFilename = `${baseName}.jpg`;
  const motionUrl = currentLivePhotos[index] || null;

  showProgress();
  try {
    const response = await fetch(proxyUrl(url, jpgFilename));
    const blob = await response.blob();
    saveBlobAsFile(blob, jpgFilename);

    if (motionUrl) {
      const movFilename = `${baseName}.mov`;
      await new Promise(r => setTimeout(r, 400));
      try {
        const motionRes = await fetch(proxyUrl(motionUrl, movFilename));
        if (motionRes.ok) {
          const motionBlob = await motionRes.blob();
          saveBlobAsFile(motionBlob, movFilename);
        }
      } catch {
        window.open(proxyUrl(motionUrl, movFilename), '_blank');
      }
    }
  } catch (e) {
    window.open(proxyUrl(url, jpgFilename), '_blank');
  } finally {
    hideProgress();
  }
}

async function downloadAllImages() {
  if (!currentImages.length) return;

  const btn = document.querySelector('.btn-dl-all');
  const orig = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true; }
  showProgress();

  try {
    const response = await fetch('/api/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: currentImages,
        livePhotos: currentLivePhotos,
        username: currentUsername
      })
    });
    if (!response.ok) throw new Error('Failed to create ZIP');
    const blob = await response.blob();
    saveBlobAsFile(blob, `${currentUsername}_images.zip`);
  } catch (e) {
    for (let i = 0; i < currentImages.length; i++) {
      await new Promise(r => setTimeout(r, 500));
      await downloadSingleImage(currentImages[i], i);
    }
  } finally {
    if (btn) { btn.textContent = orig; btn.disabled = false; }
    hideProgress();
  }
}

function renderImages(images, livePhotos) {
  const section = document.getElementById('imagesSection');
  const grid = document.getElementById('imagesGrid');
  if (!images || images.length === 0) { section.style.display = 'none'; return; }

  currentImages = images;
  currentLivePhotos = livePhotos && livePhotos.length > 0 ? livePhotos : [];

  const hasLive = currentLivePhotos.length > 0;

  const allBtn = section.querySelector('.btn-dl-all');
  if (allBtn) allBtn.textContent = hasLive ? 'Download All (Live Photo)' : 'Download All';

  grid.innerHTML = '';
  images.forEach((imgUrl, i) => {
    const isLive = !!(currentLivePhotos[i]);
    const item = document.createElement('div');
    item.className = 'img-item';
    item.innerHTML = `
      <img src="${imgUrl}" alt="Foto ${i + 1}" loading="lazy" onerror="this.style.display='none'"/>
      ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
      <button class="img-overlay" onclick="downloadSingleImage('${imgUrl}', ${i})">
        <span>${isLive ? '⬇ Live' : 'Save'}</span>
      </button>
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
  showProgress();

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch video.');

    const v = data.video;
    currentUsername = v.authorUsername || 'unknown';
    const ts = Date.now();

    document.getElementById('resCover').src = v.cover || '';
    document.getElementById('resAvatar').src = v.avatar || '';
    document.getElementById('resAuthor').textContent = v.author || '';
    document.getElementById('resHandle').textContent = v.authorUsername ? `@${v.authorUsername}` : '';
    document.getElementById('resTitle').textContent = v.title || '';
    document.getElementById('resDuration').textContent = formatDuration(v.duration);
    document.getElementById('resPlays').textContent = formatNum(v.plays) + ' plays';
    document.getElementById('resLikes').textContent = formatNum(v.likes) + ' likes';
    document.getElementById('resComments').textContent = formatNum(v.comments) + ' comments';

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
      dlMusic.textContent = v.musicTitle ? v.musicTitle.substring(0, 26) : 'Audio';
      dlMusic.style.display = 'flex';
    } else {
      dlMusic.style.display = 'none';
    }

    renderImages(v.images || [], v.livePhotos || []);
    resultCard.classList.add('active');

  } catch (err) {
    errorBox.classList.add('active');
    document.getElementById('errorText').textContent = err.message || 'Something went wrong. Try again.';
  } finally {
    downloadBtn.disabled = false;
    document.getElementById('btnText').textContent = 'Download';
    hideProgress();
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}