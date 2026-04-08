// ==UserScript==
// @name         Rakuten In-Store Offer Auto-Adder
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Automatically adds all Rakuten In-Store Cash Back offers with smart verification and retry logic.
// @author       npezarro
// @match        https://www.rakuten.com/in-store*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rakuten.com
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/npezarro/rakutenOfferAutoAdder/main/rakuten-auto-add.user.js
// @downloadURL  https://raw.githubusercontent.com/npezarro/rakutenOfferAutoAdder/main/rakuten-auto-add.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        minDelay: 800,    // Minimum delay between offers (ms)
        maxDelay: 1800,   // Maximum delay between offers (ms)
        verifyWait: 5000, // Max time to wait for "Added" text confirmation (ms)
        expandWait: 2000, // Time to wait after clicking "See More" to let content load
        maxRetryRounds: 3 // Maximum number of retry rounds for failed offers
    };

    // --- Storage Keys ---
    const STORAGE_POS = 'rakuten_adder_pos';
    const STORAGE_MIN = 'rakuten_adder_minimized';

    // --- State ---
    let isRunning = false;
    let stats = { added: 0, skipped: 0, failed: 0, total: 0 };

    // --- Helpers ---
    function randomDelay() {
        return CONFIG.minDelay + Math.random() * (CONFIG.maxDelay - CONFIG.minDelay);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- UI: Overlay Panel ---
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'rakuten-adder-panel';
        const saved = loadPosition();
        Object.assign(panel.style, {
            position: 'fixed',
            bottom: saved.bottom,
            right: saved.right,
            width: '320px',
            maxHeight: '400px',
            backgroundColor: '#1a1a2e',
            color: '#eee',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: '99999',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '13px',
            overflow: 'hidden',
            transition: 'width 0.2s, max-height 0.2s',
            userSelect: 'none'
        });

        // Header (draggable)
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#16213e',
            cursor: 'grab',
            borderRadius: '12px 12px 0 0'
        });

        const title = document.createElement('span');
        title.textContent = 'Rakuten Adder 2.0';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '14px';

        const headerBtns = document.createElement('div');
        headerBtns.style.display = 'flex';
        headerBtns.style.gap = '6px';

        const minBtn = document.createElement('button');
        minBtn.textContent = '−';
        styleHeaderBtn(minBtn);
        minBtn.addEventListener('click', () => toggleMinimize(panel, body));

        headerBtns.appendChild(minBtn);
        header.appendChild(title);
        header.appendChild(headerBtns);

        // Body (log + controls)
        const body = document.createElement('div');
        body.id = 'rakuten-adder-body';
        Object.assign(body.style, {
            padding: '10px 14px',
            display: loadMinimized() ? 'none' : 'block'
        });

        // Status line
        const status = document.createElement('div');
        status.id = 'rakuten-adder-status';
        status.textContent = 'Ready';
        Object.assign(status.style, {
            padding: '6px 10px',
            marginBottom: '8px',
            backgroundColor: '#0f3460',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: 'bold'
        });

        // Log area
        const logArea = document.createElement('div');
        logArea.id = 'rakuten-adder-log';
        Object.assign(logArea.style, {
            maxHeight: '200px',
            overflowY: 'auto',
            marginBottom: '8px',
            padding: '6px',
            backgroundColor: '#0a0a1a',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.5'
        });

        // Run button
        const runBtn = document.createElement('button');
        runBtn.id = 'rakuten-adder-run';
        runBtn.textContent = 'Run';
        Object.assign(runBtn.style, {
            width: '100%',
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#e94560',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        });
        runBtn.addEventListener('mouseenter', () => {
            if (!isRunning) runBtn.style.backgroundColor = '#c73e54';
        });
        runBtn.addEventListener('mouseleave', () => {
            if (!isRunning) runBtn.style.backgroundColor = '#e94560';
        });
        runBtn.addEventListener('click', startRun);

        body.appendChild(status);
        body.appendChild(logArea);
        body.appendChild(runBtn);

        panel.appendChild(header);
        panel.appendChild(body);
        document.body.appendChild(panel);

        // If minimized on load, collapse
        if (loadMinimized()) {
            panel.style.width = '160px';
            panel.style.maxHeight = '42px';
            minBtn.textContent = '+';
        }

        makeDraggable(panel, header);
    }

    function styleHeaderBtn(btn) {
        Object.assign(btn.style, {
            background: 'none',
            border: '1px solid #555',
            color: '#ccc',
            borderRadius: '4px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
    }

    function toggleMinimize(panel, body) {
        const isMin = body.style.display !== 'none';
        body.style.display = isMin ? 'none' : 'block';
        panel.style.width = isMin ? '160px' : '320px';
        panel.style.maxHeight = isMin ? '42px' : '400px';
        const minBtn = panel.querySelector('button');
        minBtn.textContent = isMin ? '+' : '−';
        localStorage.setItem(STORAGE_MIN, isMin ? '1' : '0');
    }

    function loadMinimized() {
        return localStorage.getItem(STORAGE_MIN) === '1';
    }

    function loadPosition() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_POS));
            if (saved && saved.bottom && saved.right) return saved;
        } catch (_) { /* ignore */ }
        return { bottom: '20px', right: '20px' };
    }

    function savePosition(panel) {
        localStorage.setItem(STORAGE_POS, JSON.stringify({
            bottom: panel.style.bottom,
            right: panel.style.right
        }));
    }

    // --- UI: Dragging ---
    function makeDraggable(panel, handle) {
        let dragging = false;
        let startX, startY, startRight, startBottom;

        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            handle.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            startRight = parseInt(panel.style.right, 10);
            startBottom = parseInt(panel.style.bottom, 10);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = startX - e.clientX;
            const dy = startY - e.clientY;
            panel.style.right = Math.max(0, startRight + dx) + 'px';
            panel.style.bottom = Math.max(0, startBottom + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            handle.style.cursor = 'grab';
            savePosition(panel);
        });
    }

    // --- UI: Logging ---
    function log(msg, type = 'info') {
        const logArea = document.getElementById('rakuten-adder-log');
        if (!logArea) return;
        const entry = document.createElement('div');
        const colors = { info: '#8ec5fc', success: '#90ee90', error: '#ff6b6b', warn: '#ffd93d' };
        entry.style.color = colors[type] || colors.info;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;
    }

    function setStatus(text) {
        const el = document.getElementById('rakuten-adder-status');
        if (el) el.textContent = text;
    }

    // --- Core: Expand all "See More" sections ---
    async function expandAll() {
        let expanded = 0;
        while (true) {
            const seeMoreBtns = document.querySelectorAll(
                'button, a, [role="button"]'
            );
            let clicked = false;
            for (const btn of seeMoreBtns) {
                const text = (btn.textContent || '').trim().toLowerCase();
                if (text === 'see more' || text === 'show more' || text === 'load more') {
                    if (btn.offsetParent !== null && !btn.disabled) {
                        btn.click();
                        expanded++;
                        log(`Expanded section (${expanded})`, 'info');
                        await sleep(CONFIG.expandWait);
                        clicked = true;
                        break; // Re-query after each click since DOM changes
                    }
                }
            }
            if (!clicked) break;
        }
        if (expanded > 0) {
            log(`Expanded ${expanded} section(s)`, 'success');
        } else {
            log('No "See More" sections found', 'info');
        }
    }

    // --- Core: Find all "Add" buttons ---
    function findAddButtons() {
        const buttons = [];
        const allBtns = document.querySelectorAll('button');
        for (const btn of allBtns) {
            const text = (btn.textContent || '').trim();
            if (text === 'Add' && btn.offsetParent !== null && !btn.disabled) {
                buttons.push(btn);
            }
        }
        return buttons;
    }

    // --- Core: Click "Add" and verify it changed to "Added" ---
    async function clickAndVerify(btn) {
        btn.click();
        const startTime = Date.now();
        while (Date.now() - startTime < CONFIG.verifyWait) {
            await sleep(200);
            const text = (btn.textContent || '').trim();
            if (text === 'Added' || btn.disabled) {
                return true;
            }
        }
        return false;
    }

    // --- Core: Main run loop ---
    async function startRun() {
        if (isRunning) return;
        isRunning = true;

        const runBtn = document.getElementById('rakuten-adder-run');
        if (runBtn) {
            runBtn.textContent = 'Running...';
            runBtn.style.backgroundColor = '#888';
            runBtn.style.cursor = 'not-allowed';
        }

        stats = { added: 0, skipped: 0, failed: 0, total: 0 };
        const logArea = document.getElementById('rakuten-adder-log');
        if (logArea) logArea.innerHTML = '';

        setStatus('Expanding sections...');
        log('Starting — expanding all sections first');
        await expandAll();

        let round = 0;
        let failedThisRound = [];

        while (round < CONFIG.maxRetryRounds) {
            round++;
            setStatus(`Round ${round}/${CONFIG.maxRetryRounds}`);
            log(`--- Round ${round} ---`, 'info');

            const buttons = round === 1 ? findAddButtons() : failedThisRound;
            failedThisRound = [];

            if (buttons.length === 0) {
                log('No "Add" buttons found', 'info');
                break;
            }

            if (round === 1) {
                stats.total = buttons.length;
                log(`Found ${buttons.length} offer(s) to add`, 'info');
            }

            for (let i = 0; i < buttons.length; i++) {
                const btn = buttons[i];
                // Skip if already added
                const text = (btn.textContent || '').trim();
                if (text === 'Added' || btn.disabled) {
                    stats.skipped++;
                    continue;
                }

                setStatus(`Round ${round} — ${i + 1}/${buttons.length}`);

                const verified = await clickAndVerify(btn);
                if (verified) {
                    stats.added++;
                    // Try to get the offer name from nearby text
                    const card = btn.closest('[class*="card"], [class*="offer"], li, article') || btn.parentElement;
                    const label = card ? (card.querySelector('h3, h4, h5, [class*="name"], [class*="title"]') || {}).textContent : '';
                    log(`Added: ${label || '(offer)'}`, 'success');
                } else {
                    stats.failed++;
                    failedThisRound.push(btn);
                    log(`Timeout: offer did not confirm`, 'warn');
                }

                await sleep(randomDelay());
            }

            if (failedThisRound.length === 0) {
                log('All offers processed successfully', 'success');
                break;
            } else {
                log(`${failedThisRound.length} offer(s) failed — retrying`, 'warn');
            }
        }

        setStatus('Done');
        log(`Finished — Added: ${stats.added}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`, 'success');

        isRunning = false;
        if (runBtn) {
            runBtn.textContent = 'Run';
            runBtn.style.backgroundColor = '#e94560';
            runBtn.style.cursor = 'pointer';
        }
    }

    // --- Init ---
    createPanel();
})();
