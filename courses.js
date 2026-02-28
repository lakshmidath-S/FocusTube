/**
 * courses.js — Curated CS Course Playlists
 * 
 * Each course object contains:
 *   - id: unique identifier
 *   - title: course display name
 *   - channel: YouTube channel name
 *   - playlistId: YouTube playlist ID
 *   - thumbnail: thumbnail URL (uses YouTube's default thumbnail)
 *   - description: short course description
 */

const CURATED_COURSES = [
  {
    id: 1,
    title: "CS50: Introduction to Computer Science",
    channel: "Harvard University",
    playlistId: "PLhQjrBD2T381WAHyx1pq-sBfykqMBI7V4",
    thumbnail: "https://i.ytimg.com/vi/3LPJfIKxwWc/hqdefault.jpg",
    description: "Harvard's legendary intro to CS — covers C, Python, SQL, web dev, and more."
  },
  {
    id: 2,
    title: "Data Structures — Full Course",
    channel: "freeCodeCamp.org",
    playlistId: "PLWKjhJtqVAbn5emQ3RRG8gEBqkhf_5vxj",
    thumbnail: "https://i.ytimg.com/vi/RBSGKlAvoiM/hqdefault.jpg",
    description: "Learn arrays, linked lists, trees, graphs, and more from scratch."
  },
  {
    id: 3,
    title: "Algorithms — Full Course for Beginners",
    channel: "freeCodeCamp.org",
    playlistId: "PLWKjhJtqVAbkso-IbgiiP48n-O-JQA9PJ",
    thumbnail: "https://i.ytimg.com/vi/8hly31xKli0/hqdefault.jpg",
    description: "Sorting, searching, dynamic programming, and algorithm analysis."
  },
  {
    id: 4,
    title: "Web Development Full Course",
    channel: "freeCodeCamp.org",
    playlistId: "PLWKjhJtqVAbnSe1qUNMG7AbPmjIG54u6",
    thumbnail: "https://i.ytimg.com/vi/mU6anWqZJcc/hqdefault.jpg",
    description: "HTML, CSS, JavaScript, React, Node.js — the full stack from zero to hero."
  },
  {
    id: 5,
    title: "MIT 6.006 — Introduction to Algorithms",
    channel: "MIT OpenCourseWare",
    playlistId: "PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY",
    thumbnail: "https://i.ytimg.com/vi/ZA-tUyM_y7s/hqdefault.jpg",
    description: "MIT's foundational algorithms course — sorting, hashing, graphs, shortest paths."
  },
  {
    id: 6,
    title: "MIT 6.042J — Mathematics for Computer Science",
    channel: "MIT OpenCourseWare",
    playlistId: "PLB7540DEDD482705B",
    thumbnail: "https://i.ytimg.com/vi/L3LMbpZIKhQ/hqdefault.jpg",
    description: "Discrete math, proofs, number theory, probability — the math behind CS."
  },
  {
    id: 7,
    title: "Python for Beginners — Full Course",
    channel: "freeCodeCamp.org",
    playlistId: "PLWKjhJtqVAbnqBxcdjVGgT3uVR10bzTEB",
    thumbnail: "https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg",
    description: "Learn Python programming from scratch — variables, loops, functions, OOP."
  },
  {
    id: 8,
    title: "Machine Learning — Full Course",
    channel: "freeCodeCamp.org",
    playlistId: "PLWKjhJtqVAblStefaz_YOVpDWqcRScc2s",
    thumbnail: "https://i.ytimg.com/vi/NWONeJKn6kc/hqdefault.jpg",
    description: "Regression, classification, neural networks, and real-world ML projects."
  },
  {
    id: 9,
    title: "Operating Systems — Full Course",
    channel: "Gate Smashers",
    playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
    thumbnail: "https://i.ytimg.com/vi/bkSWJJZNgf8/hqdefault.jpg",
    description: "Processes, threads, memory management, scheduling, and file systems."
  },
  {
    id: 10,
    title: "Database Systems — Full Course",
    channel: "freeCodeCamp.org",
    playlistId: "PLWKjhJtqVAbkmRvnFmOcqHuHSxMkog-di",
    thumbnail: "https://i.ytimg.com/vi/HXV3zeQKqGY/hqdefault.jpg",
    description: "SQL, relational databases, normalization, indexing, and transactions."
  }
];
