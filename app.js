/**
 * app.js — Home Page Logic
 *
 * Handles:
 *   - URL parsing (video / playlist detection)
 *   - Rendering curated course cards
 *   - Rendering "Continue Learning" section from LocalStorage
 *   - Navigation to player.html
 */

// ============================================================
// URL PARSING
// ============================================================

/**
 * Parse a YouTube URL and extract the video ID or playlist ID.
 * Supports formats:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/playlist?list=PLAYLIST_ID
 *   - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 *   - https://youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/live/VIDEO_ID
 *
 * @param {string} url - The YouTube URL to parse
 * @returns {{ type: 'video'|'playlist', id: string } | null}
 */
function parseYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return null;

  url = url.trim();

  try {
    // Try to construct a URL object; prepend https:// if missing
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);

    // Playlist page: youtube.com/playlist?list=...
    if (parsed.pathname === '/playlist' && parsed.searchParams.get('list')) {
      return { type: 'playlist', id: parsed.searchParams.get('list') };
    }

    // Watch page with playlist: youtube.com/watch?v=...&list=...
    // Prefer playlist if both are present
    if (parsed.searchParams.get('list')) {
      return { type: 'playlist', id: parsed.searchParams.get('list') };
    }

    // Watch page: youtube.com/watch?v=...
    if (parsed.searchParams.get('v')) {
      return { type: 'video', id: parsed.searchParams.get('v') };
    }

    // Short URL: youtu.be/VIDEO_ID
    if (parsed.hostname === 'youtu.be' && parsed.pathname.length > 1) {
      return { type: 'video', id: parsed.pathname.slice(1).split('/')[0] };
    }

    // Embed URL: youtube.com/embed/VIDEO_ID
    const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) {
      return { type: 'video', id: embedMatch[1] };
    }

    // Live URL: youtube.com/live/VIDEO_ID
    const liveMatch = parsed.pathname.match(/^\/live\/([a-zA-Z0-9_-]+)/);
    if (liveMatch) {
      return { type: 'video', id: liveMatch[1] };
    }

    return null;
  } catch (e) {
    return null;
  }
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

/**
 * Get all course progress data from LocalStorage.
 * @returns {Object} - Map of playlistId -> progress object
 */
function getCoursesProgress() {
  try {
    return JSON.parse(localStorage.getItem('courses_progress')) || {};
  } catch {
    return {};
  }
}

// ============================================================
// NAVIGATION
// ============================================================

/**
 * Navigate to player page with the given type and ID.
 * @param {'video'|'playlist'} type
 * @param {string} id
 */
function goToPlayer(type, id) {
  if (type === 'playlist') {
    window.location.href = `player.html?list=${encodeURIComponent(id)}`;
  } else {
    window.location.href = `player.html?v=${encodeURIComponent(id)}`;
  }
}

// ============================================================
// RENDER: Curated Courses
// ============================================================

function renderCuratedCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  grid.innerHTML = CURATED_COURSES.map(course => `
    <div class="card fade-in" onclick="goToPlayer('playlist', '${course.playlistId}')">
      <div class="card-thumb">
        <img src="${course.thumbnail}" alt="${course.title}" loading="lazy" />
      </div>
      <div class="card-body">
        <h3 class="card-title">${course.title}</h3>
        <p class="card-channel">${course.channel}</p>
        <p class="card-description">${course.description}</p>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); goToPlayer('playlist', '${course.playlistId}')">
            ▶ Start Course
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// RENDER: Continue Learning
// ============================================================

function renderContinueLearning() {
  const section = document.getElementById('continue');
  const grid = document.getElementById('continueGrid');
  if (!section || !grid) return;

  const progress = getCoursesProgress();
  const entries = Object.entries(progress);

  // Filter only playlists that are not fully completed
  const inProgress = entries.filter(([_, data]) => {
    return data.completed_videos &&
      data.total_videos &&
      data.completed_videos.length < data.total_videos;
  });

  if (inProgress.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  grid.innerHTML = inProgress.map(([playlistId, data]) => {
    const completedCount = data.completed_videos ? data.completed_videos.length : 0;
    const totalCount = data.total_videos || 0;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const title = data.playlist_title || 'Untitled Playlist';
    const thumbUrl = data.thumbnail || `https://i.ytimg.com/vi/default/hqdefault.jpg`;

    return `
      <div class="card fade-in">
        <div class="card-thumb">
          <img src="${thumbUrl}" alt="${title}" loading="lazy" />
        </div>
        <div class="card-body">
          <h3 class="card-title">${title}</h3>
          <p class="card-channel">${completedCount} / ${totalCount} videos</p>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${percent}%"></div>
          </div>
          <p class="progress-text">${percent}% complete</p>
        </div>
        <div class="card-footer" style="padding: var(--space-md) var(--space-lg) var(--space-lg);">
          <button class="btn btn-primary btn-sm" onclick="goToPlayer('playlist', '${playlistId}')">
            ▶ Resume
          </button>
          <button class="btn btn-danger btn-sm" onclick="removeCourse('${playlistId}')">
            ✕ Remove
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Remove a course from Continue Learning.
 */
function removeCourse(playlistId) {
  if (!confirm('Remove this course from Continue Learning? Your progress will be lost.')) return;

  const progress = getCoursesProgress();
  delete progress[playlistId];
  localStorage.setItem('courses_progress', JSON.stringify(progress));
  renderContinueLearning();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  renderCuratedCourses();
  renderContinueLearning();
  renderAutoDetectedCourses(); // auto-detect.js

  const urlInput = document.getElementById('urlInput');
  const startBtn = document.getElementById('startBtn');
  const urlError = document.getElementById('urlError');

  function handleStart() {
    const val = urlInput.value.trim();
    const parsed = parseYouTubeUrl(val);

    if (!parsed) {
      urlError.classList.remove('hidden');
      urlInput.focus();
      return;
    }

    urlError.classList.add('hidden');
    goToPlayer(parsed.type, parsed.id);
  }

  startBtn.addEventListener('click', handleStart);

  // Allow Enter key in input
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleStart();
    }
  });

  // Clear error on input
  urlInput.addEventListener('input', () => {
    urlError.classList.add('hidden');
  });
});
