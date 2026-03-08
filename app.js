const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loader = document.getElementById('loader');
const errorBox = document.getElementById('errorBox');
const resultCard = document.getElementById('resultCard');
const dlStatus = document.getElementById('dlStatus');

let currentImages = [];
let currentUsername = 'unknown';

urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchVideo(); });
urlInput.addEventListener('input', updatePasteBtn);

function updatePasteBtn() {
  if (urlInput.value.trim()) {
    pasteBtn.textContent = '✕ Hapus';
    pasteBtn.onclick = clearURL;
  } else {
    pasteBtn.textContent = '📋 Tempel';
    pasteBtn.onclick = pasteURL;
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
  errorBox.style.display = 'none';
  resultCard.classList.remove('active');
  loader.classList.remove('active');
  currentImages = [];
}

function showStatus(msg, duration = 3000) {
  dlStatus.textContent = msg;
  dlStatus.classList.add('show');
  setTimeout(() => dlStatus.classList.remove('show'), duration);
}

async function downloadFile(btn) {
  const url = btn.dataset.url;
  const filename = btn.dataset.filename || 'tiksave_download';
  if (!url) return;

  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Mengunduh...';
  showStatus('⬇ Mengunduh file...', 8000);

  try {
    const response = await fetch('/api/proxy?url=' + encodeURIComponent(url));
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    showStatus('✅ Download berhasil!', 3000);
  } catch (e) {
    window.open(url, '_blank');
    showStatus('✅ File siap didownload', 3000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}

async function downloadSingleImage(url, index) {
  showStatus(`⬇ Mengunduh gambar ${index + 1}...`, 5000);
  try {
    const response = await fetch('/api/proxy?url=' + encodeURIComponent(url));
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${currentUsername}_image${index + 1}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    showStatus('✅ Gambar berhasil diunduh!', 3000);
  } catch (e) {
    window.open(url, '_blank');
  }
}

async function downloadAllImages() {
  if (!currentImages.length) return;
  showStatus(`⬇ Mengunduh ${currentImages.length} gambar...`, 15000);
  for (let i = 0; i < currentImages.length; i++) {
    await new Promise(r => setTimeout(r, 700));
    try {
      const response = await fetch('/api/proxy?url=' + encodeURIComponent(currentImages[i]));
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${currentUsername}_image${i + 1}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (e) {
      window.open(currentImages[i], '_blank');
    }
  }
  showStatus(`✅ Semua ${currentImages.length} gambar selesai diunduh!`, 4000);
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
      <img src="${imgUrl}" alt="Gambar ${i + 1}" loading="lazy" onerror="this.style.display='none'"/>
      <button class="img-dl-btn" onclick="downloadSingleImage('${imgUrl}', ${i})">⬇ Unduh</button>
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
  document.getElementById('btnIcon').innerHTML = '<span class="spin"></span>';
  document.getElementById('btnText').textContent = 'Memproses...';
  loader.classList.add('active');

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengambil video.');

    const v = data.video;

    document.getElementById('resCover').src = v.cover || '';
    document.getElementById('resAvatar').src = v.avatar || '';
    document.getElementById('resAuthor').textContent = v.author || 'Unknown';
    document.getElementById('resHandle').textContent = v.authorUsername ? `@${v.authorUsername}` : '';
    document.getElementById('resTitle').textContent = v.title || 'Video TikTok';
    document.getElementById('resDuration').textContent = formatDuration(v.duration);
    document.getElementById('resPlays').textContent = formatNum(v.plays);
    document.getElementById('resLikes').textContent = formatNum(v.likes);
    document.getElementById('resComments').textContent = formatNum(v.comments);

    const username = v.authorUsername || 'unknown';
    currentUsername = username;
    const timestamp = Date.now();

    const dlVideo = document.getElementById('dlVideoBtn');
    if (v.downloadUrl) {
      dlVideo.dataset.url = v.downloadUrl;
      dlVideo.dataset.filename = `${username}_${timestamp}.mp4`;
      dlVideo.style.display = 'flex';
    } else {
      dlVideo.style.display = 'none';
    }

    const dlMusic = document.getElementById('dlMusicBtn');
    if (v.music) {
      dlMusic.dataset.url = v.music;
      dlMusic.dataset.filename = `${username}_audio_${timestamp}.mp3`;
      dlMusic.innerHTML = `🎵 ${v.musicTitle ? v.musicTitle.substring(0, 22) + '...' : 'Download Audio'}`;
      dlMusic.style.display = 'flex';
    } else {
      dlMusic.style.display = 'none';
    }

    renderImages(v.images || []);

    resultCard.classList.add('active');

  } catch (err) {
    errorBox.classList.add('active');
    errorBox.style.display = 'flex';
    document.getElementById('errorText').textContent = err.message || 'Terjadi kesalahan. Coba lagi.';
  } finally {
    downloadBtn.disabled = false;
    document.getElementById('btnIcon').textContent = '⬇';
    document.getElementById('btnText').textContent = 'Download';
    loader.classList.remove('active');
  }
}