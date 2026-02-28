# 📺 FocusTube — Distraction-Free CS Learning

> [!NOTE]
> This project was **vibe coded** with Anti-Gravity ✨. 

FocusTube is a minimal, distraction-free YouTube player tailored for students and self-learners. It strips away comments, recommendations, and sidebars, allowing you to focus entirely on your learning material.

## ✨ Features

- **🎯 Focus Mode**: A clean player interface that hides all YouTube distractions including comments and sidebar recommendations.
- **🎨 MagicBento Animations**: Premium visual effects (border glow, spotlight, particles) inspired by modern React components, but built with pure Vanilla JS and GSAP.
- **🛡️ Focus Curtain**: A distraction-blocking overlay that appears when the video is paused or ends, hiding YouTube's "More videos" and end-screen suggestions.
- **🔍 Auto Course Detector**: Automatically discovers high-quality Computer Science courses across 65+ categories (Languages, Frameworks, CS Fundamentals, AI/ML, DevOps, etc.).
- **⏸️ Smart Auto-Pause**: Automatically pauses your video when you switch tabs, minimize the window, or alt-tab away.
- **📊 Progress Tracking**: Automatically saves your progress (timestamp and completed videos) locally so you can resume exactly where you left off.
- **🌊 Click Ripples**: Smooth interactive feedback on every course card.

## 🛠️ Tech Stack

- **HTML5/CSS3**: Modern, responsive layout with CSS variables and glassmorphism.
- **Vanilla JavaScript**: Lightweight and fast, no heavy frameworks required.
- **GSAP (GreenSock)**: High-performance animations and interactions.
- **YouTube IFrame API**: Seamless integration with YouTube for playback.
- **LocalStorage**: Persistent data without the need for a backend.

## � YouTube API Setup

To enable the **Auto Course Detector**, you need your own YouTube Data API v3 key. Your key is stored locally in your browser and is never sent to our servers.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., "FocusTube").
3.  In the search bar, look for **"YouTube Data API v3"** and click **Enable**.
4.  Go to **Credentials** > **Create Credentials** > **API Key**.
5.  Copy your API Key.
6.  Open FocusTube, click **Settings** (top right), paste your key, and click **Save**.


---

*Enjoy a focused, high-vibe learning journey with Anti-Gravity.*
