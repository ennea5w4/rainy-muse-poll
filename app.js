/**
 * Rainy Muse Poll v0.1.1 - Application Logic
 * Minimal anonymous single-vote poll for Sleeping Stars v2
 */

(function () {
  'use strict';

  // --- Configuration ---
  const POLL_ID = 'sleeping-stars-v2-result';
  const SUPABASE_URL = 'https://telvacnnxhgathhugjlh.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_puNMQNsWazm-HNUFuC5kVw_YDfaCKpo';
  const SUPABASE_TABLE = 'poll_votes';

  // Local Storage Keys
  const LOCAL_STORAGE_KEY = `rm_poll_${POLL_ID}`;
  const VOTED_KEY = `rm_poll_voted_${POLL_ID}`;

  // Types definition (Type 1 to Type 9)
  const TYPES = [
    { key: 'type1', label: 'Type 1' },
    { key: 'type2', label: 'Type 2' },
    { key: 'type3', label: 'Type 3' },
    { key: 'type4', label: 'Type 4' },
    { key: 'type5', label: 'Type 5' },
    { key: 'type6', label: 'Type 6' },
    { key: 'type7', label: 'Type 7' },
    { key: 'type8', label: 'Type 8' },
    { key: 'type9', label: 'Type 9' },
  ];

  // --- DOM Elements ---
  const votingSection = document.getElementById('votingSection');
  const resultsSection = document.getElementById('resultsSection');
  const submitBtn = document.getElementById('submitBtn');
  const statusMsg = document.getElementById('statusMsg');
  const resultsChart = document.getElementById('resultsChart');
  const totalVotesText = document.getElementById('totalVotesText');
  const radioInputs = document.querySelectorAll('input[name="type_choice"]');
  const choiceOptions = document.querySelectorAll('.choice-option');

  // --- State ---
  let selectedChoice = null;
  let sourceParam = 'direct';

  /**
   * Initialize URL parameters, listeners, and existing state
   */
  async function init() {
    // 1. Extract source from URL query parameter (e.g. ?source=note)
    const urlParams = new URLSearchParams(window.location.search);
    const rawSource = urlParams.get('source');
    if (rawSource && rawSource.trim() !== '') {
      sourceParam = rawSource.trim();
    } else {
      sourceParam = 'direct';
    }

    // 2. Check if user already voted in this browser
    const previousVote = localStorage.getItem(VOTED_KEY);
    if (previousVote) {
      votingSection.classList.add('hidden');
      resultsSection.classList.remove('hidden');
      try {
        const summary = await fetchSummary();
        renderResults(summary, previousVote);
      } catch (err) {
        console.error('Failed to load initial summary:', err);
      }
      return;
    }

    // 3. Attach radio change listeners
    radioInputs.forEach((radio) => {
      radio.addEventListener('change', handleRadioChange);
    });

    // 4. Attach submit button listener
    submitBtn.addEventListener('click', handleSubmitVote);

    // Initial button state
    updateSubmitButtonState();
  }

  /**
   * Handle radio selection change
   */
  function handleRadioChange(e) {
    selectedChoice = e.target.value;

    choiceOptions.forEach((opt) => {
      const input = opt.querySelector('input[type="radio"]');
      if (input && input.checked) {
        opt.classList.add('is-selected');
      } else {
        opt.classList.remove('is-selected');
      }
    });

    updateSubmitButtonState();
  }

  /**
   * Toggle submit button disabled state
   */
  function updateSubmitButtonState() {
    if (selectedChoice) {
      submitBtn.removeAttribute('disabled');
    } else {
      submitBtn.setAttribute('disabled', 'true');
    }
  }

  /**
   * Handle form submission
   */
  async function handleSubmitVote() {
    if (!selectedChoice) return;

    // Loading UI state
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    statusMsg.textContent = '保存中...';
    statusMsg.className = 'status-msg';

    try {
      // 1. Save Vote to Supabase (or fallback)
      await saveVote(selectedChoice, sourceParam);

      // Save voted choice locally to persist display across reloads
      localStorage.setItem(VOTED_KEY, selectedChoice);

      // 2. Fetch Latest Aggregation
      const summary = await fetchSummary();

      // 3. Render Results In-Place
      renderResults(summary, selectedChoice);

      // Hide voting form and reveal results
      votingSection.classList.add('hidden');
      resultsSection.classList.remove('hidden');

      // Scroll smoothly to results if needed
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      console.error('Vote submission error:', err);
      statusMsg.textContent = '保存中に問題が発生しました。もう一度お試しください。';
      statusMsg.className = 'status-msg is-error';
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  }

  /**
   * Save vote record: attempts Supabase REST API first, falls back to LocalStorage
   */
  async function saveVote(choice, source) {
    const record = {
      poll_id: POLL_ID,
      choice: choice,
      source: source,
      created_at: new Date().toISOString(),
    };

    let supabaseSaved = false;

    // Try Supabase insert
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(record),
        });

        if (res.ok) {
          supabaseSaved = true;
          console.info('Successfully saved vote to Supabase:', record);
        } else {
          console.warn(`Supabase returned status ${res.status}. Falling back to local storage.`);
        }
      } catch (networkErr) {
        console.warn('Supabase fetch failed (network or CORS), using local storage fallback.', networkErr);
      }
    }

    if (!supabaseSaved) {
      saveToLocalStorage(record);
    }

    return { supabaseSaved, record };
  }

  /**
   * Fetch aggregate data: attempts Supabase first, falls back to LocalStorage
   */
  async function fetchSummary() {
    let votes = [];
    let fetchedFromSupabase = false;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=choice&poll_id=eq.${encodeURIComponent(POLL_ID)}`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            votes = data;
            fetchedFromSupabase = true;
          }
        }
      } catch (err) {
        console.warn('Could not query Supabase for aggregation, checking local storage.');
      }
    }

    if (!fetchedFromSupabase) {
      votes = getFromLocalStorage();
    }

    // Aggregate counts
    const counts = {};
    TYPES.forEach((t) => (counts[t.key] = 0));

    votes.forEach((v) => {
      const c = v.choice;
      if (counts[c] !== undefined) {
        counts[c]++;
      }
    });

    const total = votes.length;

    // Calculate integer percentages (safe with 0 votes)
    const items = TYPES.map((t) => {
      const count = counts[t.key] || 0;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        key: t.key,
        label: t.label,
        count: count,
        percent: percent,
      };
    });

    return {
      total: total,
      items: items,
    };
  }

  /**
   * Render horizontal bar chart results
   */
  function renderResults(summary, userVotedChoice) {
    resultsChart.innerHTML = '';

    summary.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'chart-row';
      if (item.key === userVotedChoice) {
        row.classList.add('is-voted-type');
      }

      // 1. Type Label
      const nameEl = document.createElement('span');
      nameEl.className = 'chart-type-name';
      nameEl.textContent = item.label;

      // 2. Bar Track & Fill
      const trackEl = document.createElement('div');
      trackEl.className = 'chart-bar-track';

      const fillEl = document.createElement('div');
      fillEl.className = 'chart-bar-fill';
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        fillEl.style.width = `${item.percent}%`;
      });
      trackEl.appendChild(fillEl);

      // 3. Percentage Text
      const pctEl = document.createElement('span');
      pctEl.className = 'chart-percent';
      pctEl.textContent = `${item.percent}%`;

      row.appendChild(nameEl);
      row.appendChild(trackEl);
      row.appendChild(pctEl);

      resultsChart.appendChild(row);
    });

    // Update total count: "現在 48票"
    totalVotesText.textContent = `現在 ${summary.total}票`;
  }

  /**
   * Helper: save to local storage
   */
  function saveToLocalStorage(record) {
    try {
      const existing = getFromLocalStorage();
      existing.push(record);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  /**
   * Helper: get from local storage
   */
  function getFromLocalStorage() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Self-start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
