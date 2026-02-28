/**
 * player.js — YouTube Player Logic
 *
 * Handles:
 *   - YouTube IFrame API initialization
 *   - Single video & playlist modes
 *   - Playlist sidebar rendering with checkmarks
 *   - Progress tracking via LocalStorage
 *   - Timestamp saving every 5 seconds
 *   - Auto-advance to next video on completion
 *   - Resume from saved position
 *   - Keyboard shortcuts (Space, ←, →)
 *   - Mark Complete / Restart Course actions
 */

// ============================================================
// STATE
// ============================================================

let player = null;                // YouTube player instance
let mode = 'video';               // 'video' or 'playlist'
let videoId = null;               // Single video ID
let playlistId = null;            // Playlist ID
let playlistVideos = [];          // Array of video titles (fetched from API)
let currentIndex = 0;             // Current video index in playlist
let timestampInterval = null;     // Interval ID for saving timestamps
let isPlayerReady = false;

// ============================================================
// URL PARAMS — parse from hash first, fallback to query string
// ============================================================

// Hash format: player.html#list=PLAYLIST_ID or player.html#v=VIDEO_ID
// Query format (fallback): player.html?list=PLAYLIST_ID or player.html?v=VIDEO_ID
const hashParams = new URLSearchParams(window.location.hash.slice(1));
const queryParams = new URLSearchParams(window.location.search);

videoId = hashParams.get('v') || queryParams.get('v');
playlistId = hashParams.get('list') || queryParams.get('list');

if (playlistId) {
    mode = 'playlist';
} else if (videoId) {
    mode = 'video';
} else {
    // No valid params — redirect home
    window.location.href = 'index.html';
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

function getCoursesProgress() {
    try {
        return JSON.parse(localStorage.getItem('courses_progress')) || {};
    } catch {
        return {};
    }
}

function saveCoursesProgress(data) {
    localStorage.setItem('courses_progress', JSON.stringify(data));
}

function getCourseData() {
    const all = getCoursesProgress();
    return all[playlistId] || null;
}

function saveCourseData(data) {
    const all = getCoursesProgress();
    all[playlistId] = data;
    saveCoursesProgress(all);
}

// ============================================================
// DOM REFS
// ============================================================

const courseTitle = document.getElementById('courseTitle');
const videoProgressText = document.getElementById('videoProgressText');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const progressSection = document.getElementById('progressSection');
const playlistSidebar = document.getElementById('playlistSidebar');
const playlistItems = document.getElementById('playlistItems');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarCount = document.getElementById('sidebarCount');
const markCompleteBtn = document.getElementById('markCompleteBtn');
const restartCourseBtn = document.getElementById('restartCourseBtn');

// ============================================================
// YOUTUBE IFRAME API CALLBACK
// ============================================================

// This function is called by the YouTube IFrame API script once it's ready
function onYouTubeIframeAPIReady() {
    if (mode === 'playlist') {
        initPlaylistPlayer();
    } else {
        initVideoPlayer();
    }
}

// ============================================================
// SINGLE VIDEO MODE
// ============================================================

function initVideoPlayer() {
    // Hide playlist elements
    playlistSidebar.classList.add('hidden');
    progressSection.classList.add('hidden');
    markCompleteBtn.classList.add('hidden');
    restartCourseBtn.classList.add('hidden');
    videoProgressText.textContent = '';
    courseTitle.textContent = 'Focus Mode';

    player = new YT.Player('ytPlayer', {
        videoId: videoId,
        playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            autoplay: 1,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
        },
    });
}

// ============================================================
// PLAYLIST MODE
// ============================================================

function initPlaylistPlayer() {
    // Check for saved progress
    const saved = getCourseData();
    if (saved && saved.current_video_index !== undefined) {
        currentIndex = saved.current_video_index;
    }

    player = new YT.Player('ytPlayer', {
        playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            autoplay: 1,
            listType: 'playlist',
            list: playlistId,
            index: currentIndex,
        },
        events: {
            onReady: onPlaylistPlayerReady,
            onStateChange: onPlaylistStateChange,
        },
    });
}

function onPlaylistPlayerReady(event) {
    isPlayerReady = true;

    // Resume from saved timestamp
    const saved = getCourseData();
    if (saved && saved.timestamp && saved.timestamp > 0) {
        player.seekTo(saved.timestamp, true);
    }

    // Start timestamp saving interval
    startTimestampSaving();

    // Wait briefly for playlist data to become available, then render sidebar
    setTimeout(() => {
        buildPlaylistSidebar();
        updateUI();
    }, 1500);
}

function onPlaylistStateChange(event) {
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
        // Update current index from the player
        const idx = player.getPlaylistIndex();
        if (idx !== -1 && idx !== currentIndex) {
            currentIndex = idx;
            saveCurrentState();
            updateUI();
            renderSidebarHighlight();
        }
    }

    if (state === YT.PlayerState.ENDED) {
        markCurrentVideoComplete();
        // The YT player auto-advances in playlist mode, so just update index
        setTimeout(() => {
            const newIdx = player.getPlaylistIndex();
            if (newIdx !== -1) {
                currentIndex = newIdx;
                saveCurrentState();
                updateUI();
                renderSidebarHighlight();
            }
        }, 500);
    }

    if (state === YT.PlayerState.PAUSED) {
        saveCurrentState();
    }
}

// ============================================================
// SINGLE VIDEO CALLBACKS
// ============================================================

function onPlayerReady(event) {
    isPlayerReady = true;

    // Try to set the title from the video data
    try {
        const videoData = player.getVideoData();
        if (videoData && videoData.title) {
            courseTitle.textContent = videoData.title;
            document.title = `FocusTube — ${videoData.title}`;
        }
    } catch (e) { }
}

function onPlayerStateChange(event) {
    // For single videos we just update the title when playing
    if (event.data === YT.PlayerState.PLAYING) {
        try {
            const videoData = player.getVideoData();
            if (videoData && videoData.title) {
                courseTitle.textContent = videoData.title;
                document.title = `FocusTube — ${videoData.title}`;
            }
        } catch (e) { }
    }
}

// ============================================================
// PLAYLIST SIDEBAR
// ============================================================

function buildPlaylistSidebar() {
    if (!player || typeof player.getPlaylist !== 'function') return;

    const playlist = player.getPlaylist(); // array of video IDs
    if (!playlist || playlist.length === 0) return;

    const totalVideos = playlist.length;

    // Initialize progress data if not present
    const saved = getCourseData();
    if (!saved) {
        saveCourseData({
            current_video_index: currentIndex,
            timestamp: 0,
            completed_videos: [],
            total_videos: totalVideos,
            playlist_title: 'Playlist',
            thumbnail: `https://i.ytimg.com/vi/${playlist[0]}/hqdefault.jpg`,
        });
    } else {
        // Update total if it changed
        const updated = { ...saved, total_videos: totalVideos };
        if (!updated.thumbnail) {
            updated.thumbnail = `https://i.ytimg.com/vi/${playlist[0]}/hqdefault.jpg`;
        }
        saveCourseData(updated);
    }

    // Build playlist item elements
    // We use video IDs as titles until we can get real titles
    playlistVideos = playlist;

    sidebarCount.textContent = `${totalVideos} videos`;

    renderPlaylistItems();

    // Try to get the playlist title from the current video data
    try {
        const videoData = player.getVideoData();
        if (videoData && videoData.title) {
            // Try extracting a playlist-level title; otherwise use the first video title
            updateCourseTitle();
        }
    } catch (e) { }
}

function renderPlaylistItems() {
    const saved = getCourseData();
    const completedSet = new Set(saved ? saved.completed_videos : []);

    playlistItems.innerHTML = playlistVideos.map((vidId, i) => {
        const isActive = i === currentIndex;
        const isCompleted = completedSet.has(i);
        const classes = ['playlist-item'];
        if (isActive) classes.push('active');
        if (isCompleted) classes.push('completed');

        const indexOrCheck = isCompleted
            ? `<span class="item-check">✓</span>`
            : `<span class="item-index">${i + 1}</span>`;

        return `
      <div class="${classes.join(' ')}" data-index="${i}" onclick="jumpToVideo(${i})">
        ${indexOrCheck}
        <span class="item-title">Video ${i + 1}</span>
      </div>
    `;
    }).join('');

    // Fetch actual titles via oEmbed (non-blocking)
    fetchVideoTitles();
}

/**
 * Fetch video titles using YouTube's oEmbed endpoint (no API key needed).
 * This is done asynchronously and updates the sidebar once titles arrive.
 */
async function fetchVideoTitles() {
    const items = playlistItems.querySelectorAll('.playlist-item');

    for (let i = 0; i < playlistVideos.length; i++) {
        try {
            const resp = await fetch(
                `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${playlistVideos[i]}`
            );
            const data = await resp.json();
            if (data && data.title && items[i]) {
                const titleEl = items[i].querySelector('.item-title');
                if (titleEl) titleEl.textContent = data.title;
            }
        } catch (e) {
            // Silently fail — keep "Video N" as fallback
        }
    }

    // Also update the course title with the playlist title
    updateCourseTitle();
}

function updateCourseTitle() {
    try {
        const videoData = player.getVideoData();
        // For playlist mode, attempt to read the list title from the player
        // Unfortunately the IFrame API doesn't provide a direct playlist title,
        // so we use the current video's title or a stored title
        const saved = getCourseData();
        if (saved && saved.playlist_title && saved.playlist_title !== 'Playlist') {
            courseTitle.textContent = saved.playlist_title;
            sidebarTitle.textContent = saved.playlist_title;
        } else if (videoData && videoData.title) {
            // Use first video title as a reference
            courseTitle.textContent = videoData.title;
            document.title = `FocusTube — ${videoData.title}`;
        }
    } catch (e) { }
}

function renderSidebarHighlight() {
    const items = playlistItems.querySelectorAll('.playlist-item');
    items.forEach((item, i) => {
        item.classList.toggle('active', i === currentIndex);
    });

    // Scroll active item into view
    const activeItem = playlistItems.querySelector('.playlist-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ============================================================
// PLAYBACK CONTROLS
// ============================================================

/**
 * Jump to a specific video in the playlist by index.
 */
function jumpToVideo(index) {
    if (!player || !isPlayerReady) return;

    // Save current state before jumping
    saveCurrentState();

    currentIndex = index;
    player.playVideoAt(index);

    saveCurrentState();
    updateUI();
    renderSidebarHighlight();
}

// ============================================================
// PROGRESS TRACKING
// ============================================================

/**
 * Save the current playback state to LocalStorage.
 */
function saveCurrentState() {
    if (mode !== 'playlist' || !playlistId) return;

    const saved = getCourseData() || {
        current_video_index: 0,
        timestamp: 0,
        completed_videos: [],
        total_videos: playlistVideos.length,
        playlist_title: 'Playlist',
    };

    saved.current_video_index = currentIndex;

    try {
        if (player && typeof player.getCurrentTime === 'function') {
            saved.timestamp = Math.floor(player.getCurrentTime());
        }
    } catch (e) { }

    saveCourseData(saved);
}

/**
 * Start saving timestamps every 5 seconds while playing.
 */
function startTimestampSaving() {
    if (timestampInterval) clearInterval(timestampInterval);
    timestampInterval = setInterval(() => {
        if (player && isPlayerReady) {
            try {
                const state = player.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    saveCurrentState();
                }
            } catch (e) { }
        }
    }, 5000);
}

/**
 * Mark the current video as completed.
 */
function markCurrentVideoComplete() {
    if (mode !== 'playlist' || !playlistId) return;

    const saved = getCourseData();
    if (!saved) return;

    if (!saved.completed_videos) saved.completed_videos = [];
    if (!saved.completed_videos.includes(currentIndex)) {
        saved.completed_videos.push(currentIndex);
    }

    saveCourseData(saved);
    updateUI();
    renderPlaylistItems(); // Re-render to show checkmarks
    renderSidebarHighlight();

    showToast(`Video ${currentIndex + 1} marked as completed ✓`);
}

/**
 * Restart the course — reset all progress.
 */
function restartCourse() {
    if (!confirm('Are you sure you want to restart this course? All progress will be reset.')) return;

    const saved = getCourseData();
    if (!saved) return;

    saved.current_video_index = 0;
    saved.timestamp = 0;
    saved.completed_videos = [];

    saveCourseData(saved);

    // Jump to first video
    currentIndex = 0;
    if (player && isPlayerReady) {
        player.playVideoAt(0);
    }

    updateUI();
    renderPlaylistItems();
    renderSidebarHighlight();

    showToast('Course progress has been reset');
}

// ============================================================
// UI UPDATES
// ============================================================

function updateUI() {
    if (mode !== 'playlist') return;

    const saved = getCourseData();
    if (!saved) return;

    const completedCount = saved.completed_videos ? saved.completed_videos.length : 0;
    const totalCount = saved.total_videos || playlistVideos.length || 0;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Video progress text
    videoProgressText.innerHTML = `Video <span>${currentIndex + 1}</span> / <span>${totalCount}</span>`;

    // Course progress bar
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;

    // Sidebar count
    sidebarCount.textContent = `${completedCount} / ${totalCount} completed`;
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================

function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 300ms ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!player || !isPlayerReady) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            try {
                const state = player.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
            } catch (err) { }
            break;

        case 'ArrowLeft':
            e.preventDefault();
            try {
                const current = player.getCurrentTime();
                player.seekTo(Math.max(0, current - 10), true);
            } catch (err) { }
            break;

        case 'ArrowRight':
            e.preventDefault();
            try {
                const current = player.getCurrentTime();
                player.seekTo(current + 10, true);
            } catch (err) { }
            break;
    }
});

// ============================================================
// BUTTON EVENT LISTENERS
// ============================================================

markCompleteBtn.addEventListener('click', () => {
    markCurrentVideoComplete();
});

restartCourseBtn.addEventListener('click', () => {
    restartCourse();
});

// ============================================================
// PAGE VISIBILITY — Auto-pause when user leaves, resume on return
// ============================================================

let wasPlayingBeforeHidden = false;

/**
 * Pause the video when user switches tabs, minimizes, or alt-tabs away.
 * Resume playback when they come back.
 */
document.addEventListener('visibilitychange', () => {
    if (!player || !isPlayerReady) return;

    if (document.hidden) {
        // Tab is now hidden — pause if playing
        try {
            const state = player.getPlayerState();
            wasPlayingBeforeHidden = (state === YT.PlayerState.PLAYING);
            if (wasPlayingBeforeHidden) {
                player.pauseVideo();
            }
        } catch (e) { }
        saveCurrentState();
    } else {
        // Tab is visible again — resume if it was playing before
        if (wasPlayingBeforeHidden) {
            try {
                player.playVideo();
            } catch (e) { }
            wasPlayingBeforeHidden = false;
        }
    }
});

/**
 * Also pause when user switches to another window (alt-tab, clicking WhatsApp, etc.)
 * window.blur fires when this window loses focus entirely.
 */
window.addEventListener('blur', () => {
    if (!player || !isPlayerReady) return;
    try {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            wasPlayingBeforeHidden = true;
            player.pauseVideo();
        }
    } catch (e) { }
    saveCurrentState();
});

window.addEventListener('focus', () => {
    if (!player || !isPlayerReady) return;
    if (wasPlayingBeforeHidden) {
        try {
            player.playVideo();
        } catch (e) { }
        wasPlayingBeforeHidden = false;
    }
});

window.addEventListener('beforeunload', () => {
    saveCurrentState();
});

// ============================================================
// INITIAL UI SETUP
// ============================================================

if (mode === 'video') {
    // Hide playlist-specific elements
    playlistSidebar.classList.add('hidden');
    progressSection.classList.add('hidden');
    markCompleteBtn.classList.add('hidden');
    restartCourseBtn.classList.add('hidden');
}
