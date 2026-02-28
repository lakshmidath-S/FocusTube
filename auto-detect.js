/**
 * auto-detect.js — Auto Course Detector
 *
 * Uses YouTube Data API v3 to automatically discover high-quality
 * Computer Science courses. Results are scored, ranked, and cached
 * in localStorage for 24 hours to respect API quota limits.
 *
 * Requires: YouTube Data API v3 key stored in localStorage["yt_api_key"]
 */

// ============================================================
// CONSTANTS
// ============================================================

const AUTO_CACHE_KEY = 'auto_courses_cache';
const API_KEY_STORAGE = 'yt_api_key';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

/** Search queries to discover CS courses */
const SEARCH_QUERIES = [
    'computer science full course',
    'data structures full course',
    'algorithms full course',
    'operating systems course',
    'database systems course',
    'machine learning full course',
    'web development full course',
    'python full course',
    'c++ full course',
    'system design course',
];

/** Trusted educational channels get a score bonus */
const TRUSTED_CHANNELS = [
    'freecodecamp',
    'free code camp',
    'mit opencourseware',
    'stanford',
    'harvard',
    'nptel',
    'programming with mosh',
    'traversy media',
    'the coding train',
    'cs dojo',
    'gate smashers',
    'abdul bari',
    'jenny\'s lectures',
    'mycodeschool',
    'sentdex',
    'tech with tim',
    'fireship',
    'neso academy',
    'code with harry',
    'edureka',
];

const TRUSTED_BONUS = 2;

// ============================================================
// API KEY MANAGEMENT
// ============================================================

function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
}

function setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

function getCachedCourses() {
    try {
        const raw = localStorage.getItem(AUTO_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        // Check if cache is still valid (< 24 hours old)
        if (cache.timestamp && (Date.now() - cache.timestamp) < CACHE_TTL_MS) {
            return cache.courses;
        }
        return null; // Cache expired
    } catch {
        return null;
    }
}

function setCachedCourses(courses) {
    const cache = {
        timestamp: Date.now(),
        courses: courses,
    };
    localStorage.setItem(AUTO_CACHE_KEY, JSON.stringify(cache));
}

// ============================================================
// YOUTUBE API HELPERS
// ============================================================

/**
 * Make a YouTube API request.
 * @param {string} endpoint - API endpoint (e.g., 'search', 'playlists')
 * @param {Object} params - Query parameters
 * @returns {Promise<Object|null>}
 */
async function ytApiRequest(endpoint, params) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const url = new URL(`${YT_API_BASE}/${endpoint}`);
    url.searchParams.set('key', apiKey);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    try {
        const resp = await fetch(url.toString());
        if (!resp.ok) {
            if (resp.status === 403) {
                console.warn('[AutoDetect] API quota exceeded or key invalid');
            }
            return null;
        }
        return await resp.json();
    } catch (e) {
        console.error('[AutoDetect] Network error:', e);
        return null;
    }
}

// ============================================================
// SEARCH & DISCOVERY
// ============================================================

/**
 * Search for playlists matching a query.
 * Returns up to 5 results per query.
 */
async function searchPlaylists(query) {
    const data = await ytApiRequest('search', {
        part: 'snippet',
        q: query,
        type: 'playlist',
        maxResults: 5,
        order: 'relevance',
        relevanceLanguage: 'en',
    });

    if (!data || !data.items) return [];
    return data.items.map(item => ({
        playlistId: item.id.playlistId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url || '',
        description: item.snippet.description,
        type: 'playlist',
    }));
}

/**
 * Search for long-form videos (full courses) matching a query.
 * videoDuration=long filters to videos > 20 minutes.
 */
async function searchVideos(query) {
    const data = await ytApiRequest('search', {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 3,
        order: 'viewCount',
        videoDuration: 'long',
        relevanceLanguage: 'en',
    });

    if (!data || !data.items) return [];
    return data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url || '',
        description: item.snippet.description,
        type: 'video',
    }));
}

/**
 * Get playlist details (item count).
 * @param {string[]} playlistIds
 * @returns {Promise<Object>} Map of playlistId -> { itemCount }
 */
async function getPlaylistDetails(playlistIds) {
    if (playlistIds.length === 0) return {};

    const data = await ytApiRequest('playlists', {
        part: 'contentDetails',
        id: playlistIds.join(','),
        maxResults: 50,
    });

    if (!data || !data.items) return {};

    const map = {};
    data.items.forEach(item => {
        map[item.id] = {
            itemCount: item.contentDetails?.itemCount || 0,
        };
    });
    return map;
}

/**
 * Get video details (duration, view count, like count).
 * @param {string[]} videoIds
 * @returns {Promise<Object>} Map of videoId -> { duration, viewCount, likeCount }
 */
async function getVideoDetails(videoIds) {
    if (videoIds.length === 0) return {};

    const data = await ytApiRequest('videos', {
        part: 'contentDetails,statistics',
        id: videoIds.join(','),
        maxResults: 50,
    });

    if (!data || !data.items) return {};

    const map = {};
    data.items.forEach(item => {
        map[item.id] = {
            duration: item.contentDetails?.duration || 'PT0S',
            viewCount: parseInt(item.statistics?.viewCount || '0', 10),
            likeCount: parseInt(item.statistics?.likeCount || '0', 10),
        };
    });
    return map;
}

// ============================================================
// DURATION PARSING
// ============================================================

/**
 * Parse ISO 8601 duration string (e.g., PT1H30M15S) to seconds.
 */
function parseDuration(iso) {
    if (!iso) return 0;
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    return h * 3600 + m * 60 + s;
}

/**
 * Format seconds to human-readable duration string.
 */
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// ============================================================
// SCORING
// ============================================================

/**
 * Check if a channel name matches a trusted channel.
 */
function isTrustedChannel(channelName) {
    const lower = channelName.toLowerCase();
    return TRUSTED_CHANNELS.some(tc => lower.includes(tc));
}

/**
 * Calculate course quality score.
 * score = log10(viewCount) * 0.5 + likeRatio * 0.3 + durationHours * 0.2 + trustedBonus
 */
function calculateScore(viewCount, likeCount, durationSeconds, channelName) {
    const logViews = viewCount > 0 ? Math.log10(viewCount) : 0;
    const likeRatio = viewCount > 0 ? (likeCount / viewCount) : 0;
    const durationHours = durationSeconds / 3600;

    let score = (logViews * 0.5) + (likeRatio * 0.3) + (durationHours * 0.2);

    if (isTrustedChannel(channelName)) {
        score += TRUSTED_BONUS;
    }

    return Math.round(score * 100) / 100;
}

// ============================================================
// MAIN DETECTION PIPELINE
// ============================================================

/**
 * Run the full auto-detection pipeline.
 * Searches for playlists and videos, fetches details, filters, scores, and ranks.
 * @returns {Promise<Array>} Sorted array of course objects
 */
async function autoDetectCourses() {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.log('[AutoDetect] No API key configured');
        return [];
    }

    // Check cache first
    const cached = getCachedCourses();
    if (cached) {
        console.log('[AutoDetect] Using cached results (' + cached.length + ' courses)');
        return cached;
    }

    console.log('[AutoDetect] Starting fresh course detection...');

    const allPlaylists = [];
    const allVideos = [];

    // Batch search — limit to 5 queries to save quota (alternate queries each day)
    const dayOfYear = Math.floor((Date.now() / 86400000)) % 2;
    const queries = dayOfYear === 0
        ? SEARCH_QUERIES.slice(0, 5)
        : SEARCH_QUERIES.slice(5, 10);

    for (const query of queries) {
        const [playlists, videos] = await Promise.all([
            searchPlaylists(query),
            searchVideos(query),
        ]);
        allPlaylists.push(...playlists);
        allVideos.push(...videos);
    }

    // Deduplicate playlists by ID
    const uniquePlaylists = deduplicateBy(allPlaylists, 'playlistId');
    const uniqueVideos = deduplicateBy(allVideos, 'videoId');

    // Fetch playlist details (item counts)
    const playlistIds = uniquePlaylists.map(p => p.playlistId);
    const playlistDetails = await getPlaylistDetails(playlistIds);

    // Fetch video details (duration, views, likes)
    const videoIds = uniqueVideos.map(v => v.videoId);
    const videoDetails = await getVideoDetails(videoIds);

    // Also fetch a sample video from each playlist to get view stats
    // Use the first video of each playlist for scoring
    // To avoid too many API calls, we'll use channel-level trust + item count for playlists

    const scoredCourses = [];

    // Process playlists
    for (const pl of uniquePlaylists) {
        const details = playlistDetails[pl.playlistId];
        if (!details) continue;

        // Filter: minimum 10 videos
        if (details.itemCount < 10) continue;

        // Estimate duration: ~15 min avg per video
        const estimatedDurationSec = details.itemCount * 15 * 60;

        // Filter: > 3 hours estimated
        if (estimatedDurationSec < 3 * 3600) continue;

        // Score playlists using item count as a proxy for quality
        // log10(itemCount * 10000) as a view proxy + trust bonus
        const pseudoViews = details.itemCount * 10000; // rough proxy
        const score = calculateScore(pseudoViews, pseudoViews * 0.04, estimatedDurationSec, pl.channel);

        scoredCourses.push({
            title: pl.title,
            channel: pl.channel,
            playlistId: pl.playlistId,
            thumbnail: pl.thumbnail,
            totalVideos: details.itemCount,
            totalDuration: formatDuration(estimatedDurationSec),
            totalDurationSec: estimatedDurationSec,
            viewCount: 0, // Not available for playlists directly
            score: score,
            type: 'playlist',
        });
    }

    // Process videos
    for (const vid of uniqueVideos) {
        const details = videoDetails[vid.videoId];
        if (!details) continue;

        const durationSec = parseDuration(details.duration);

        // Filter: > 1 hour
        if (durationSec < 3600) continue;

        // Filter: > 50,000 views
        if (details.viewCount < 50000) continue;

        const score = calculateScore(details.viewCount, details.likeCount, durationSec, vid.channel);

        scoredCourses.push({
            title: vid.title,
            channel: vid.channel,
            videoId: vid.videoId,
            thumbnail: vid.thumbnail,
            totalVideos: 1,
            totalDuration: formatDuration(durationSec),
            totalDurationSec: durationSec,
            viewCount: details.viewCount,
            score: score,
            type: 'video',
        });
    }

    // Sort by score descending
    scoredCourses.sort((a, b) => b.score - a.score);

    // Limit to top 20
    const topCourses = scoredCourses.slice(0, 20);

    // Cache results
    if (topCourses.length > 0) {
        setCachedCourses(topCourses);
    }

    console.log(`[AutoDetect] Found ${topCourses.length} courses`);
    return topCourses;
}

// ============================================================
// HELPERS
// ============================================================

function deduplicateBy(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
        const val = item[key];
        if (!val || seen.has(val)) return false;
        seen.add(val);
        return true;
    });
}

function formatViewCount(count) {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return count.toString();
}

// ============================================================
// SETTINGS MODAL
// ============================================================

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = getApiKey();
    modal.classList.remove('hidden');
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');
}

function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;

    const key = input.value.trim();
    if (!key) {
        alert('Please enter a valid YouTube Data API v3 key.');
        return;
    }

    setApiKey(key);

    // Clear cache to force re-fetch with new key
    localStorage.removeItem(AUTO_CACHE_KEY);

    closeSettingsModal();

    // Re-run auto detection
    renderAutoDetectedCourses();
}

function clearApiKey() {
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.removeItem(AUTO_CACHE_KEY);
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = '';
    closeSettingsModal();
    renderAutoDetectedCourses();
}

// ============================================================
// RENDER
// ============================================================

/**
 * Render auto-detected courses on the homepage.
 * Shows loading shimmer while fetching, then course cards or a message.
 */
async function renderAutoDetectedCourses() {
    const section = document.getElementById('autoDetect');
    const grid = document.getElementById('autoDetectGrid');
    const status = document.getElementById('autoDetectStatus');
    if (!section || !grid || !status) return;

    section.classList.remove('hidden');
    const apiKey = getApiKey();

    // No API key configured
    if (!apiKey) {
        grid.innerHTML = '';
        status.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔑</div>
        <p>Add your YouTube Data API key in <button class="btn btn-secondary btn-sm" onclick="openSettingsModal()" style="display:inline-flex; vertical-align:middle;">⚙ Settings</button> to auto-discover CS courses.</p>
        <p style="margin-top: 0.5rem; font-size: var(--font-xs); color: var(--text-muted);">Your key stays in your browser (localStorage) — never sent to any server except YouTube.</p>
      </div>
    `;
        return;
    }

    // Show loading shimmer
    status.innerHTML = '';
    grid.innerHTML = Array(4).fill(`
    <div class="card shimmer-card">
      <div class="card-thumb shimmer"></div>
      <div class="card-body">
        <div class="shimmer shimmer-line" style="width:80%; height:16px; margin-bottom:8px;"></div>
        <div class="shimmer shimmer-line" style="width:50%; height:12px; margin-bottom:12px;"></div>
        <div class="shimmer shimmer-line" style="width:60%; height:12px;"></div>
      </div>
    </div>
  `).join('');

    // Fetch courses
    const courses = await autoDetectCourses();

    if (courses.length === 0) {
        grid.innerHTML = '';
        status.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No courses found. This may be due to an invalid API key or quota limits.</p>
        <p style="margin-top: 0.5rem;"><button class="btn btn-secondary btn-sm" onclick="openSettingsModal()">⚙ Check API Key</button></p>
      </div>
    `;
        return;
    }

    // Render course cards
    status.innerHTML = '';
    grid.innerHTML = courses.map(course => {
        const isPlaylist = course.type === 'playlist';
        const onclickId = isPlaylist ? course.playlistId : course.videoId;
        const onclickType = isPlaylist ? 'playlist' : 'video';
        const videoLabel = isPlaylist ? `${course.totalVideos} videos` : '1 video (full course)';
        const viewLabel = course.viewCount > 0 ? `${formatViewCount(course.viewCount)} views · ` : '';
        const trustedBadge = isTrustedChannel(course.channel)
            ? '<span class="trusted-badge" title="Trusted educational channel">★ Trusted</span>'
            : '';

        return `
      <div class="card fade-in" onclick="goToPlayer('${onclickType}', '${onclickId}')">
        <div class="card-thumb">
          <img src="${course.thumbnail}" alt="${escapeHtml(course.title)}" loading="lazy" />
          <span class="card-duration-badge">${course.totalDuration}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(course.title)}</h3>
          <p class="card-channel">${escapeHtml(course.channel)} ${trustedBadge}</p>
          <p class="card-description">${viewLabel}${videoLabel}</p>
          <div class="card-footer">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); goToPlayer('${onclickType}', '${onclickId}')">
              ▶ Start Course
            </button>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

/**
 * Simple HTML escaping to prevent XSS from API-provided titles.
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
