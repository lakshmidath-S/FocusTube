/**
 * magic-effects.js — Vanilla JS port of MagicBento animations
 *
 * Applies to homepage cards:
 *   - Border glow (follows cursor)
 *   - Global spotlight (follows cursor across section)
 *   - Floating particles on hover
 *   - Click ripple effect
 *
 * Requires: GSAP loaded globally
 */

// ============================================================
// CONFIG
// ============================================================

const MAGIC_CONFIG = {
    glowColor: '108, 92, 231',         // matches FocusTube accent
    spotlightRadius: 400,
    particleCount: 12,
    mobileBreakpoint: 768,
};

// ============================================================
// HELPERS
// ============================================================

function isMobileDevice() {
    return window.innerWidth <= MAGIC_CONFIG.mobileBreakpoint;
}

function createParticle(x, y) {
    const el = document.createElement('div');
    el.className = 'magic-particle';
    el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${MAGIC_CONFIG.glowColor}, 1);
    box-shadow: 0 0 6px rgba(${MAGIC_CONFIG.glowColor}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
    return el;
}

// ============================================================
// BORDER GLOW — cursor-following glow on card borders
// ============================================================

function initBorderGlow(card) {
    card.classList.add('magic-glow');

    card.addEventListener('mousemove', (e) => {
        if (isMobileDevice()) return;
        const rect = card.getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / rect.width) * 100;
        const relY = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--glow-x', `${relX}%`);
        card.style.setProperty('--glow-y', `${relY}%`);
        card.style.setProperty('--glow-intensity', '1');
    });

    card.addEventListener('mouseleave', () => {
        card.style.setProperty('--glow-intensity', '0');
    });
}

// ============================================================
// CLICK RIPPLE — expanding ripple on card click
// ============================================================

function initClickRipple(card) {
    card.addEventListener('click', (e) => {
        if (isMobileDevice() || typeof gsap === 'undefined') return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const maxDist = Math.max(
            Math.hypot(x, y),
            Math.hypot(x - rect.width, y),
            Math.hypot(x, y - rect.height),
            Math.hypot(x - rect.width, y - rect.height)
        );

        const ripple = document.createElement('div');
        ripple.style.cssText = `
      position: absolute;
      width: ${maxDist * 2}px;
      height: ${maxDist * 2}px;
      border-radius: 50%;
      background: radial-gradient(circle,
        rgba(${MAGIC_CONFIG.glowColor}, 0.35) 0%,
        rgba(${MAGIC_CONFIG.glowColor}, 0.15) 30%,
        transparent 70%
      );
      left: ${x - maxDist}px;
      top: ${y - maxDist}px;
      pointer-events: none;
      z-index: 50;
    `;

        card.style.position = 'relative';
        card.appendChild(ripple);

        gsap.fromTo(ripple,
            { scale: 0, opacity: 1 },
            { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() }
        );
    });
}

// ============================================================
// PARTICLES — floating dots on hover
// ============================================================

function initParticles(card) {
    let particles = [];
    let timeouts = [];
    let isHovered = false;

    function clearParticles() {
        timeouts.forEach(clearTimeout);
        timeouts = [];
        particles.forEach(p => {
            gsap.to(p, {
                scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)',
                onComplete: () => p.parentNode?.removeChild(p)
            });
        });
        particles = [];
    }

    function spawnParticles() {
        if (!isHovered || typeof gsap === 'undefined') return;
        const rect = card.getBoundingClientRect();

        for (let i = 0; i < MAGIC_CONFIG.particleCount; i++) {
            const tid = setTimeout(() => {
                if (!isHovered) return;

                const p = createParticle(
                    Math.random() * rect.width,
                    Math.random() * rect.height
                );
                card.style.position = 'relative';
                card.style.overflow = 'hidden';
                card.appendChild(p);
                particles.push(p);

                gsap.fromTo(p,
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
                );

                gsap.to(p, {
                    x: (Math.random() - 0.5) * 100,
                    y: (Math.random() - 0.5) * 100,
                    rotation: Math.random() * 360,
                    duration: 2 + Math.random() * 2,
                    ease: 'none',
                    repeat: -1,
                    yoyo: true
                });

                gsap.to(p, {
                    opacity: 0.3,
                    duration: 1.5,
                    ease: 'power2.inOut',
                    repeat: -1,
                    yoyo: true
                });
            }, i * 100);

            timeouts.push(tid);
        }
    }

    card.addEventListener('mouseenter', () => {
        if (isMobileDevice()) return;
        isHovered = true;
        spawnParticles();
    });

    card.addEventListener('mouseleave', () => {
        isHovered = false;
        clearParticles();
    });
}

// ============================================================
// GLOBAL SPOTLIGHT — large glow following cursor across section
// ============================================================

function initGlobalSpotlight() {
    if (typeof gsap === 'undefined') return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
    position: fixed;
    width: 800px;
    height: 800px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle,
      rgba(${MAGIC_CONFIG.glowColor}, 0.12) 0%,
      rgba(${MAGIC_CONFIG.glowColor}, 0.06) 15%,
      rgba(${MAGIC_CONFIG.glowColor}, 0.03) 25%,
      rgba(${MAGIC_CONFIG.glowColor}, 0.015) 40%,
      rgba(${MAGIC_CONFIG.glowColor}, 0.008) 65%,
      transparent 70%
    );
    z-index: 200;
    opacity: 0;
    transform: translate(-50%, -50%);
    mix-blend-mode: screen;
    will-change: transform, opacity;
  `;
    document.body.appendChild(spotlight);

    const radius = MAGIC_CONFIG.spotlightRadius;
    const proximity = radius * 0.5;
    const fadeDistance = radius * 0.75;

    document.addEventListener('mousemove', (e) => {
        if (isMobileDevice()) return;

        // Check if mouse is within any section that has magic cards
        const sections = document.querySelectorAll('#autoDetect, #courses, #continue');
        let isInsideSection = false;

        for (const section of sections) {
            const rect = section.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                isInsideSection = true;
                break;
            }
        }

        if (!isInsideSection) {
            gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
            return;
        }

        // Find closest card
        const cards = document.querySelectorAll('.card, .continue-card');
        let minDist = Infinity;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dist = Math.max(0,
                Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(rect.width, rect.height) / 2
            );
            minDist = Math.min(minDist, dist);

            // Also update border glow position for cards near cursor
            if (dist <= fadeDistance && card.classList.contains('magic-glow')) {
                const relX = ((e.clientX - rect.left) / rect.width) * 100;
                const relY = ((e.clientY - rect.top) / rect.height) * 100;
                const intensity = dist <= proximity ? 1 : (fadeDistance - dist) / (fadeDistance - proximity);
                card.style.setProperty('--glow-x', `${relX}%`);
                card.style.setProperty('--glow-y', `${relY}%`);
                card.style.setProperty('--glow-intensity', intensity.toString());
            }
        });

        gsap.to(spotlight, {
            left: e.clientX,
            top: e.clientY,
            duration: 0.1,
            ease: 'power2.out'
        });

        const targetOpacity = minDist <= proximity ? 0.8
            : minDist <= fadeDistance ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.8
                : 0;

        gsap.to(spotlight, {
            opacity: targetOpacity,
            duration: targetOpacity > 0 ? 0.2 : 0.5,
            ease: 'power2.out'
        });
    });

    document.addEventListener('mouseleave', () => {
        gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    });
}

// ============================================================
// INIT — Apply effects to all homepage cards
// ============================================================

function initMagicEffects() {
    if (isMobileDevice()) return;

    // Apply to all cards on the page
    const cards = document.querySelectorAll('.card, .continue-card');
    cards.forEach(card => {
        initBorderGlow(card);
        initClickRipple(card);
        initParticles(card);
    });

    // Global spotlight
    initGlobalSpotlight();
}

// Re-init when new cards are rendered (e.g., auto-detect finishes)
function refreshMagicEffects() {
    if (isMobileDevice()) return;

    const cards = document.querySelectorAll('.card:not(.magic-glow), .continue-card:not(.magic-glow)');
    cards.forEach(card => {
        initBorderGlow(card);
        initClickRipple(card);
        initParticles(card);
    });
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a tick for other scripts to render cards first
    setTimeout(initMagicEffects, 500);
});

// Watch for dynamically added cards via MutationObserver
const magicObserver = new MutationObserver((mutations) => {
    let hasNewCards = false;
    mutations.forEach(m => {
        m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.classList?.contains('card') || node.querySelector?.('.card'))) {
                hasNewCards = true;
            }
        });
    });
    if (hasNewCards) {
        setTimeout(refreshMagicEffects, 100);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const grids = document.querySelectorAll('.course-grid');
    grids.forEach(grid => magicObserver.observe(grid, { childList: true }));
});
