// Create browser compatibility shims and prevent reference errors
window.browser = window.browser || {};
window.chrome = window.chrome || {};
window.crossbrowserName = window.crossbrowserName || "generic";
window.REMOTE_CONFIG_KEYS = window.REMOTE_CONFIG_KEYS || {};
window.webextApi = window.webextApi || {};

fetch("https://opensheet.vercel.app/1roR6dtZzzr_LQGDQ6vpuJdxRFRrgk_L3LHltBz7iVcY/Values")
  .then(res => res.json())
  .then(data => {
    console.log(data); // You'll get rows as JSON objects!
    // Do your rendering/processing here
  });


// Prevent errors from extension-related imports
if (typeof determineBrowser !== 'function') {
    window.determineBrowser = function() { return "generic"; };
}

// Add proper cross-browser compatibility detection at the top of the file
const webBrowser = window.browser || window.chrome || {};

// Initialize allUpdates as an empty array
let allUpdates = [];

// Function to fetch updates from JSON file
async function fetchUpdates() {
    try {
        const response = await fetch('updates.json');
        if (!response.ok) {
            throw new Error('Failed to fetch updates');
        }
        const data = await response.json();
        allUpdates = data.updates;
        // Sort updates by date (newest first)
        allUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error loading updates:', error);
        allUpdates = [];
    }
}

// Define global variable for mobile detection
let isMobile = window.innerWidth <= 768;

// Make allItems globally accessible to ensure findItemByName works everywhere
let allItems = []; // Initialize empty array that will be populated by fetchData

// Helper functions needed throughout the code - DEFINED FIRST
function cleanItemName(itemName) {
    if (!itemName) return "";
    return itemName.replace(/ *\([^)]*\) */g, "").trim();
}

// Helper function to find item by name - used by the timeline
function findItemByName(name) {
    // Early bail out silently if items aren't loaded yet
    if (!allItems || !Array.isArray(allItems) || allItems.length === 0) {
        return null;
    }
    
    // Clean the name first (handle special cases like items with parentheses)
    const cleanedName = cleanItemName(name);
    
    // Find a case-insensitive match
    return allItems.find(item => cleanItemName(item.name).toLowerCase() === cleanedName.toLowerCase());
}

// Utility debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Function to generate the mobile chat bubble timeline
function generateMobileTimeline() {
    // Only execute on mobile
    if (!isMobile) return;
    
    console.log("Generating mobile timeline...");
    
    const eventsContainer = document.getElementById('timeline-events');
    if (!eventsContainer) {
        console.error("Timeline events container not found");
        return;
    }
    
    const timelineEvents = eventsContainer.querySelectorAll('.timeline-event');
    if (!timelineEvents || timelineEvents.length === 0) {
        console.error("No timeline events found to convert to mobile view");
        return;
    }
    
    // Create mobile timeline container
    const mobileTimeline = document.createElement('div');
    mobileTimeline.className = 'mobile-timeline';
    
    // Add intro message
    const chatIntro = document.createElement('div');
    chatIntro.className = 'chat-intro';
    chatIntro.innerHTML = '<i class="fas fa-info-circle"></i> Updates are displayed newest to oldest. Tap on items to see details.';
    mobileTimeline.appendChild(chatIntro);
    
    // Group updates by date
    const updatesByDate = {};
    timelineEvents.forEach(event => {
        const dateText = event.querySelector('.event-date').textContent.trim();
        if (!updatesByDate[dateText]) {
            updatesByDate[dateText] = [];
        }
        
        // Extract all event changes
        const changes = event.querySelectorAll('.event-change');
        updatesByDate[dateText].push(...Array.from(changes));
    });
    
    // Process dates in chronological order (newest first)
    const dates = Object.keys(updatesByDate).sort((a, b) => {
        // Convert date strings to Date objects for comparison (MM/DD/YYYY format)
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB - dateA; // Newest first
    });
    
    // Define how many dates to show initially (pagination)
    const initialDatesToShow = 2;
    let visibleDates = initialDatesToShow;
    
    // Create date markers and chat bubbles for the initial dates
    function renderDates(startIndex, endIndex) {
        const datesToRender = dates.slice(startIndex, endIndex);
        
        datesToRender.forEach((date, dateIndex) => {
            // Create date marker
            const dateMarker = document.createElement('div');
            dateMarker.className = 'date-marker';
            dateMarker.innerHTML = `<span class="date-marker-text">${date}</span>`;
            mobileTimeline.appendChild(dateMarker);
            
            // Create chat bubbles container for this date
            const chatBubbles = document.createElement('div');
            chatBubbles.className = 'chat-bubbles';
            
            // Add each change as a bubble
            updatesByDate[date].forEach((change, index) => {
                // Create chat bubble
                const bubble = document.createElement('div');
                
                // Set animation delay based on index
                bubble.style.setProperty('--index', index);
                
                // Extract item name
                const itemNameElement = change.querySelector('strong');
                const itemName = itemNameElement ? itemNameElement.textContent.trim() : 'Item';
                
                // Determine bubble type
                let bubbleType = 'note';
                const changeDetails = change.querySelector('.change-details');
                
                if (changeDetails) {
                    const valueDifference = changeDetails.querySelector('.value-difference');
                    if (valueDifference) {
                        if (valueDifference.classList.contains('increase')) {
                            bubbleType = 'increase';
                        } else if (valueDifference.classList.contains('decrease')) {
                            bubbleType = 'decrease';
                        }
                    }
                }
                
                // Add appropriate classes and content
                bubble.className = `update-bubble ${bubbleType}`;
                
                // Create content based on bubble type
                if (bubbleType === 'note') {
                    // Note-type bubble
                    const noteText = change.textContent.trim();
                    bubble.innerHTML = `
                        <div class="bubble-header">
                            <div class="change-indicator"><i class="fas fa-info-circle"></i></div>
                            <div class="item-name">${itemName}</div>
                        </div>
                        <div class="bubble-content">
                            <div class="note-text">${noteText.replace(itemName, '')}</div>
                        </div>
                    `;
                } else {
                    // Value change bubble
                    const oldValue = changeDetails.querySelector('.value-range') ? 
                        changeDetails.querySelector('.value-range').textContent.split('→')[0].trim().replace('Range: ', '') : 'N/A';
                    
                    const newValue = changeDetails.querySelector('.value-range') ? 
                        changeDetails.querySelector('.value-range').textContent.split('→')[1].trim() : 'N/A';
                    
                    // Extract percentage change if it exists
                    let percentageChange = '';
                    const valuePercentage = changeDetails.querySelector('.value-percentage');
                    if (valuePercentage) {
                        percentageChange = valuePercentage.textContent.trim();
                    }
                    
                    // Determine icon based on change type
                    let icon = bubbleType === 'increase' ? 'fa-arrow-up' : 'fa-arrow-down';
                    
                    bubble.innerHTML = `
                        <div class="bubble-header">
                            <div class="change-indicator"><i class="fas ${icon}"></i></div>
                            <div class="item-name">${itemName}</div>
                        </div>
                        <div class="value-change">
                            <div class="old-value">
                                <span class="change-label">Old Value</span>
                                <span class="value-number">${oldValue}</span>
                            </div>
                            <div class="change-arrow">
                                <i class="fas fa-long-arrow-alt-right"></i>
                            </div>
                            <div class="new-value">
                                <span class="change-label">New Value</span>
                                <span class="value-number">${newValue}</span>
                            </div>
                            ${percentageChange ? `<div class="percentage-badge">${percentageChange}</div>` : ''}
                        </div>
                    `;
                }
                
                // Get item rarity from the original element if available and apply to bubble
                if (itemNameElement && itemNameElement.dataset.rarity) {
                    bubble.dataset.rarity = itemNameElement.dataset.rarity;
                    const itemNameDiv = bubble.querySelector('.item-name');
                    if (itemNameDiv) {
                        itemNameDiv.style.color = getComputedStyle(document.documentElement)
                            .getPropertyValue(`--rarity-${itemNameElement.dataset.rarity.toLowerCase()}`) || '';
                    }
                }
                
                // Add to chat bubbles container
                chatBubbles.appendChild(bubble);
            });
            
            mobileTimeline.appendChild(chatBubbles);
        });
    }
    
    // Initial render
    renderDates(0, visibleDates);
    
    // Add "Continue to iterate?" button if there are more dates to show
    if (dates.length > visibleDates) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-button';
        loadMoreBtn.innerHTML = '<span>Show More?</span> <i class="fas fa-chevron-down"></i>';
        mobileTimeline.appendChild(loadMoreBtn);
        
        loadMoreBtn.addEventListener('click', function() {
            // Increase visible dates count
            const previousCount = visibleDates;
            visibleDates += 1; // Show one more date at a time
            
            // Remove button temporarily while we add more content
            this.remove();
            
            // Render newly visible dates
            renderDates(previousCount, visibleDates);
            
            // Add button back if there are still more dates to show
            if (dates.length > visibleDates) {
                mobileTimeline.appendChild(loadMoreBtn);
                
                // Scroll button into view with animation
                setTimeout(() => {
                    loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            } else {
                // If we've shown all dates, add a "no more updates" message
                const endMessage = document.createElement('div');
                endMessage.className = 'end-message';
                endMessage.innerHTML = '<i class="fas fa-check-circle"></i> All updates loaded';
                mobileTimeline.appendChild(endMessage);
                
                // Scroll to end message
                setTimeout(() => {
                    endMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
            
            // Animate new bubbles that were just added
            anime({
                targets: '.update-bubble',
                opacity: [0, 1],
                translateY: [15, 0],
                scale: [0.9, 1],
                delay: anime.stagger(50),
                duration: 400,
                easing: 'easeOutQuad'
            });
        });
    }
    
    // Replace the original timeline content
    eventsContainer.innerHTML = '';
    eventsContainer.appendChild(mobileTimeline);
    
    console.log("Mobile timeline generated successfully");
    
    // Animate bubbles appearing
    anime({
        targets: '.update-bubble',
        opacity: [0, 1],
        translateY: [15, 0],
        scale: [0.9, 1],
        delay: anime.stagger(50),
        duration: 400,
        easing: 'easeOutQuad'
    });
}

// Optimize particle system for mobile
function initParticleSystem() {
    const particleCanvas = document.getElementById('particle-canvas');
    if (!particleCanvas) return;

    const ctx = particleCanvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth <= 768;
    let particles = [];

    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    resizeCanvas();

    // Reduce or disable particles on mobile
    let numberOfParticles = isMobile ? 0 : Math.min((particleCanvas.width * particleCanvas.height) / 12000, 150);

    for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
    }

    function Particle() {
        this.x = Math.random() * particleCanvas.width;
        this.y = Math.random() * particleCanvas.height;
        this.size = Math.random() * 1.8 + 0.6;
        this.speedX = Math.random() * 0.3 - 0.15;
        this.speedY = Math.random() * 0.3 - 0.15;
        this.color = `rgba(200,220,255,${Math.random() * 0.6 + 0.2})`;
    }

    Particle.prototype.update = function() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (
            this.x < -10 || this.x > particleCanvas.width + 10 ||
            this.y < -10 || this.y > particleCanvas.height + 10
        ) {
            this.x = Math.random() * particleCanvas.width;
            this.y = Math.random() * particleCanvas.height;
        }
    };

    Particle.prototype.draw = function() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    };

    function animate() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        if (!isMobile) drawLines();
        requestAnimationFrame(animate);
    }

    function drawLines() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.strokeStyle = `rgba(150,200,255,${(1 - dist / 100) * 0.1})`;
                    ctx.lineWidth = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    if (!isMobile) animate();
}

// Function to initialize mobile features
function initMobileFeatures() {
    console.log("Initializing mobile features");
    
    // Check if we're on mobile viewport
    const isMobileViewport = window.innerWidth <= 768;
    
    if (isMobileViewport) {
        console.log("Mobile viewport detected, applying mobile view");
        document.body.classList.add('mobile-view');
        
        // Generate mobile timeline if we're in the update-log section
        const updateLogSection = document.getElementById('update-log');
        if (updateLogSection && updateLogSection.classList.contains('active')) {
            generateMobileTimeline();
        }
        
        // Update layout heights for mobile
        const mobileFooterHeight = document.getElementById('main-footer')?.offsetHeight || 55;
        document.documentElement.style.setProperty('--mobile-footer-height', `${mobileFooterHeight}px`);
    } else {
        // Switch back to desktop mode if needed
        document.body.classList.remove('mobile-view');
        
        // Remove mobile timeline if it exists
        const mobileTimeline = document.querySelector('.mobile-timeline');
        if (mobileTimeline) mobileTimeline.remove();
    }
}

// --- Layout Height Update ---
function updateLayoutHeights() {
    const headerElement = document.getElementById('main-header');
    const footerElement = document.getElementById('main-footer');
    
    const headerHeight = headerElement?.offsetHeight || 65;
    const footerHeight = footerElement?.offsetHeight || 55;
    
    // Check if we're on mobile and use the mobile heights
    if (window.innerWidth <= 768) {
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
    } else {
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
    }
}

// --- Function to Dynamically Create Mobile Timeline ---
function createMobileTimeline() {
  console.log("Attempting to create mobile timeline...");
  const timelineEventsEl = document.getElementById('timeline-events');
  const updateLogSection = document.getElementById('update-log');

  // Prerequisites check
  if (!timelineEventsEl || !allUpdates || allUpdates.length === 0 || !updateLogSection) {
    console.warn("Mobile timeline prerequisites not met (container, data, or section missing).");
    if (timelineEventsEl) timelineEventsEl.innerHTML = '<p class="no-results" style="text-align: center;">Loading history failed or no updates available.</p>';
    return;
  }

  // Clear existing content ONLY if we haven't already built the mobile timeline
  if (!timelineEventsEl.querySelector('.mobile-timeline')) {
    timelineEventsEl.innerHTML = ''; // Clear previous content
  } else {
    console.log("Mobile timeline already exists, skipping generation.");
    return; // Avoid regenerating if already present
  }

  // Create intro text
  const introEl = document.createElement('div');
  introEl.className = 'chat-intro';
  introEl.innerHTML = `
    <i class="fa-solid fa-mobile-alt"></i>
    Update Feed: Newest changes appear first. Tap item names for details.
  `;
  timelineEventsEl.appendChild(introEl);

  // Create mobile timeline container
  const mobileTimelineEl = document.createElement('div');
  mobileTimelineEl.className = 'mobile-timeline';

  let bubbleIndex = 0; // For staggered animation index
  
  // Render all dates at once - no pagination
  allUpdates.forEach((update) => {
    // Create date marker
    const dateMarker = document.createElement('div');
    dateMarker.className = 'date-marker';
    dateMarker.innerHTML = `<div class="date-marker-text">${update.date}</div>`;
    mobileTimelineEl.appendChild(dateMarker);

    // Create container for the bubbles for this date
    const chatBubbles = document.createElement('div');
    chatBubbles.className = 'chat-bubbles';

    // Process all changes for this date
    update.changes.forEach((change) => {
      let itemInfo = null;
      let fullItemName = null;
      let changeClass = 'neutral';
      let iconClass = 'fa-circle-info';

      // Determine Item Info & Basic Classes
      if (change.type === 'value') {
        fullItemName = change.item;
        // No need to log errors, findItemByName returns null silently if allItems isn't ready
        itemInfo = findItemByName(fullItemName);
      } else if (change.type === 'note') {
        changeClass = 'note';
        fullItemName = `${change.action}: ${change.detail}`;
        if (change.action === 'Added') {
          const potentialItemName = cleanItemName(change.detail);
          itemInfo = findItemByName(potentialItemName);
          if (itemInfo) fullItemName = change.detail; 
          iconClass = 'fa-plus';
        } else if (change.action === 'Fixed') {
          iconClass = 'fa-wrench';
        } else if (change.action === 'Established') {
          iconClass = 'fa-flag-checkered';
        }
      } else {
        fullItemName = "Unknown Change";
      }

      // Refine changeClass and iconClass for VALUE changes
      if (change.type === 'value') {
        const parseVal = (valStr) => {
          if (!valStr) return NaN;
          if (typeof valStr !== 'string') valStr = String(valStr);
          const cleaned = valStr.replace(/[,kK]/gi, '');
          const num = parseInt(cleaned, 10);
          return isNaN(num) ? NaN : num * (valStr.toLowerCase().includes('k') ? 1000 : 1);
        };
        const oldValueNum = parseVal(change.old);
        const newValueNum = parseVal(change.new);

        if (!isNaN(oldValueNum) && !isNaN(newValueNum)) {
          if (newValueNum > oldValueNum) { 
            changeClass = 'increase'; 
            iconClass = 'fa-arrow-up'; 
          } else if (newValueNum < oldValueNum) { 
            changeClass = 'decrease'; 
            iconClass = 'fa-arrow-down'; 
          } else { 
            changeClass = 'neutral'; 
            iconClass = 'fa-equals'; 
          }
        } else {
          changeClass = 'neutral';
          iconClass = 'fa-exchange-alt';
        }
      }

      // Create Bubble Element
      const bubble = document.createElement('div');
      bubble.className = `update-bubble ${changeClass}`;
      bubble.style.setProperty('--index', bubbleIndex);

      let bubbleHTML = '';
      
      // --- Generate HTML for VALUE changes - Improved inline layout ---
      if (change.type === 'value') {
        const rarityAttr = itemInfo ? `data-rarity="${itemInfo.rarity}"` : '';
        const rarityStyle = itemInfo ? `style="color: var(--rarity-${itemInfo.rarity.toLowerCase()}, var(--color-text));"` : '';
        const itemId = itemInfo?.id || '';
        
        // Calculate values and differences
        const parseVal = (valStr) => {
          if (!valStr) return NaN;
          const cleaned = valStr.replace(/[,kK]/gi, '');
          const num = parseInt(cleaned, 10);
          return isNaN(num) ? NaN : num * (valStr.toLowerCase().includes('k') ? 1000 : 1);
        };
        
        const oldValueNum = parseVal(change.old);
        const newValueNum = parseVal(change.new);
        let difference = newValueNum - oldValueNum;
        let percentChange = oldValueNum > 0 ? Math.round((difference / oldValueNum) * 100) : 0;
        percentChange = Math.max(-999, Math.min(999, percentChange));
        const changePrefix = difference >= 0 ? '+' : '';
        const absDifference = Math.abs(difference).toLocaleString('en-US');
        
        // Always make the item name clickable with proper class and attributes
        bubbleHTML = `
          <div class="bubble-header">
            <div class="change-indicator"><i class="fa-solid ${iconClass}"></i></div>
            <div class="item-name timeline-item-link" data-item-id="${itemId}" ${rarityAttr} ${rarityStyle}>
              ${fullItemName}
            </div>
          </div>
          <div class="value-info">
            <div class="value-change-row">
              <span class="old-value">${change.old}</span>
              <span class="change-arrow"><i class="fa-solid fa-arrow-right"></i></span>
              <span class="new-value">${change.new}</span>
              <span class="value-percentage ${changeClass}">${Math.abs(percentChange)}%</span>
            </div>
          </div>
        `;
      } else { // Notes or other types
        // Determine if this is a clickable item
        const isClickable = itemInfo && change.type === 'note' && change.action === 'Added';
        const itemClass = isClickable ? 'timeline-item-link' : '';
        const itemId = isClickable ? `data-item-id="${itemInfo.id}"` : '';
        const rarityAttr = isClickable ? `data-rarity="${itemInfo.rarity}"` : '';
        const rarityStyle = isClickable ? `style="color: var(--rarity-${itemInfo.rarity.toLowerCase()}, var(--color-text));"` : '';
        
        bubbleHTML = `
          <div class="bubble-content">
            <div class="change-indicator"><i class="fa-solid ${iconClass}"></i></div>
            <div class="note-text ${itemClass}" ${itemId} ${rarityAttr} ${rarityStyle}>
              ${change.type === 'note' ? `<strong>${change.action}:</strong> ` : ''}
              ${fullItemName.replace(`${change.action}: `, '')}
            </div>
          </div>
        `;
      }

      bubble.innerHTML = bubbleHTML;
      chatBubbles.appendChild(bubble);
      bubbleIndex++;
    });

    mobileTimelineEl.appendChild(chatBubbles);
  });

  timelineEventsEl.appendChild(mobileTimelineEl);

  // Attach Event Listeners to newly created links with explicit binding
  mobileTimelineEl.querySelectorAll('.timeline-item-link').forEach(link => {
    // Make the entire element clickable
    if (!link.hasAttribute('data-listener-added')) {
      link.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get the item ID from the element
        const itemId = this.getAttribute('data-item-id');
        if (itemId) {
          // Call the openItemDetailModal function directly
          openItemDetailModal(itemId);
        }
      });
      link.setAttribute('data-listener-added', 'true');
      
      // Add cursor style to enhance clickability
      link.style.cursor = 'pointer';
    }
  });

  console.log("Mobile timeline created and listeners attached.");

  // Trigger bubble entrance animation
  if (typeof anime === 'function') {
    anime({
      targets: '.mobile-view .update-bubble',
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.95, 1],
      delay: anime.stagger(30, { start: 100 }),
      duration: 300,
      easing: 'easeOutQuad'
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & State ---
    let allItems = [];

    // --- HARDCODED Guide Data ---
const guideData = {
    stability: [
        { term: "Stable", definition: "Item's value will most likely not change, if it does, it wouldn't be a major change" },
        { term: "Unstable", definition: "Item's value is fluxuating, may end up increasing or decreasing" },
        { term: "Declining", definition: "Item is on track to lose a significant amount of its value" },
        { term: "Rising", definition: "Item is on track to gain a significant amount of value" }
    ],
    demand: [
        { term: "High", definition: "Most demandable items, very easy to trade and get overpays for" },
        { term: "Medium", definition: "Items with good demand, likely wont have trouble getting a good deal for it" },
        { term: "Normal", definition: "Item has reasonable demand, not heavily sought after but could still get a fair trade" },
        { term: "Low", definition: "Item has bad demand, nobody really looks for it and it will likely be underpaid for" }
    ],
    value: [
        { term: "Owner's Choice", definition: "Temporary value, for items that have little to no owners and are likely not in circulation" },
        { term: "???", definition: "Items with basically no value, exclusive to admins and will probably never be traded" }
    ],
    // Add new fusion section
    fusion: [
        { term: "Fusing", definition: "Fused items lose 30% of their original value. Hover over an item to check if its labeled with \"Fusion Effect: ... \"" }
    ]
};

    const rarityOrder = ["Contraband", "Mythical", "Legendary", "Unique", "Epic", "Rare", "Common", "Stock"];

    const infoData = { welcome: '', creators: [], ownerDisclaimer: '', contactNote: '', discordNote: ''};
    let currentSection = 'info-hub';
    let favoritesList = [];
    let headerHeight = 65;
    let footerHeight = 55;
    let isTransitioning = false;
    let currentAdvancedFilters = { obtainability: [], demand: [], stability: [] };

    // --- DOM Elements ---
    const mainElement = document.getElementById('main-content');
    const headerElement = document.getElementById('main-header');
    const footerElement = document.getElementById('main-footer');
    const navButtons = document.querySelectorAll('.nav-button');
    const itemGrid = document.getElementById('item-grid');
    const searchBar = document.getElementById('search-bar');
    const rarityFilter = document.getElementById('rarity-filter');
    const obtainabilityFilter = document.getElementById('obtainability-filter');
    const sortBy = document.getElementById('sort-by');
    const clearFiltersButton = document.getElementById('clear-filters');
    const loadingIndicators = document.querySelectorAll('.loading-indicator');
    const stabilityGuideEl = document.getElementById('stability-guide');
    const demandGuideEl = document.getElementById('demand-guide');
    const valueGuideEl = document.getElementById('value-guide');
    const timelineEventsEl = document.getElementById('timeline-events');
    const favoritesButton = document.getElementById('favorites-button');
    const favoritesCountSpan = document.getElementById('favorites-count');
    const favoritesOverlay = document.getElementById('favorites-overlay');
    const closeFavoritesButton = document.getElementById('close-favorites');
    const favoritesItemsContainer = document.getElementById('favorites-items-container');
    const clearFavoritesButton = document.getElementById('clear-favorites-btn');
    const tooltip = document.getElementById('tooltip');
    const infoNodeContainer = document.querySelector('.info-node-container');
    const nexusCtaButton = document.getElementById('nexus-cta-button');
    const particleCanvas = document.getElementById('particle-canvas');
    const connectionCanvas = document.getElementById('connection-canvas');
    const advancedFiltersBtn = document.getElementById('advanced-filters-btn');
    const advancedFilterOverlay = document.getElementById('advanced-filter-overlay');
    const advObtainFiltersContainer = document.getElementById('adv-obtain-filters');
    const advDemandFiltersContainer = document.getElementById('adv-demand-filters');
    const advStabilityFiltersContainer = document.getElementById('adv-stability-filters');
    const applyAdvFiltersBtn = document.getElementById('apply-advanced-filters');
    const resetAdvFiltersBtn = document.getElementById('reset-advanced-filters');
    const closeAdvFiltersBtns = document.querySelectorAll('.close-advanced-filters');
    const itemDetailModal = document.getElementById('item-detail-modal');
    const itemDetailCardContainer = document.getElementById('item-detail-card-container');
    const closeItemDetailBtn = document.querySelector('.close-item-detail');
    const confirmationModal = document.getElementById('confirmation-modal');
    const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');

    // *** NEW: Infinite Scroll Configuration & State ***
    const VIRTUAL_SCROLL_BUFFER = 5; // Number of items to render above/below viewport
    const ESTIMATED_ITEM_HEIGHT = 380; // Approx height of one card in pixels (adjust based on your final CSS including gap)
    let currentVisibleItems = []; // Keep track of the full filtered list for scrolling
    let virtualScrollInfo = { // Store state for the virtual scroller
        startIndex: 0,
        endIndex: 0,
        scrollTop: 0,
        itemContainer: itemGrid, // The grid element
        scrollContainer: mainElement // The element that scrolls (might be window or main content)
    };
    let virtualScrollListenerAttached = false; // Flag to track if listener is active
    // *** END NEW ***

    // Add event listener to update heights on resize
    const debouncedResizeHandler = debounce(() => {
        updateLayoutHeights();
        // *** MODIFICATION: Trigger virtual scroll update on resize ***
        if (currentSection === 'value-database' && virtualScrollListenerAttached) {
            debouncedScrollHandler(); // Re-render based on new dimensions/heights
        }
        // *** END MODIFICATION ***
        // initMobileFeatures(); // Keep this if you still need it for other features
        handleResponsiveView(); // Use your responsive handler
    }, 250);
    window.addEventListener('resize', debouncedResizeHandler);

    // --- Particle Background ---
    initParticleSystem();

    // Helper functions for fuzzy matching
    function stringSimilarity(s1, s2) {
        if (!s1 || !s2) return 0;
        
        s1 = s1.toLowerCase().replace(/[^a-z0-9]/gi, '');
        s2 = s2.toLowerCase().replace(/[^a-z0-9]/gi, '');
        
        // Exact match
        if (s1 === s2) return 1.0;
        
        // Simple Jaccard similarity for quick fuzzy matching
        const set1 = new Set(s1);
        const set2 = new Set(s2);
        
        const intersection = new Set([...set1].filter(c => set2.has(c)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    // Modified version of finding an item with fuzzy matching
    function findItemFuzzy(name) {
        if (!allItems || !allItems.length || !name) return null;
        
        // Skip certain generic terms that should never match items
        const skipTerms = ['added', 'established', 'fixed', 'updated', 'removed', 'changed'];
        if (skipTerms.includes(name.toLowerCase().trim())) {
            return null;
        }
        
        // Try exact match first (case insensitive)
        const exactMatch = allItems.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) return exactMatch;
        
        // Try fuzzy search if exact match fails
        const threshold = 0.92; // Increased threshold for higher accuracy (was 0.8)
        let bestMatch = null;
        let highestSimilarity = 0;
        
        allItems.forEach(item => {
            const similarity = stringSimilarity(item.name, name);
            if (similarity > threshold && similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = item;
            }
        });
        
        return bestMatch;
    }

    // --- Data Fetching and Parsing ---
    async function fetchData() {
        try {
            loadingIndicators.forEach(el => {
                if(el) el.style.display = 'flex';
            });
            if(itemGrid) itemGrid.style.minHeight = '300px';

            // Fetch updates first
            await fetchUpdates();
            
            // First attempt to fetch from online source
            let valueData = null;
            let infoData = null;
            let usingOnlineSource = false;

            try {
                console.warn("Attempting to fetch from online source...");
                const response = await fetch("https://opensheet.vercel.app/1roR6dtZzzr_LQGDQ6vpuJdxRFRrgk_L3LHltBz7iVcY/Values");
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const onlineData = await response.json();
                console.log("Successfully fetched online data");
                
                if (Array.isArray(onlineData) && onlineData.length > 0) {
                    // Filter out empty objects and process online data
                    const filteredData = onlineData.filter(item => 
                        item && item.Item && Object.keys(item).length > 1
                    );
                    
                    if (filteredData.length > 0) {
                        console.warn(`Using online data source (${filteredData.length} items)`);
                        allItems = parseOnlineData(filteredData);
                        usingOnlineSource = true;
                    } else {
                        throw new Error("Online data contained no valid items");
                    }
                } else {
                    throw new Error("Online data format invalid");
                }
            } catch (onlineError) {
                console.error("Failed to fetch from online source:", onlineError);
                console.warn("Falling back to local CSV files.");
                usingOnlineSource = false;
            }

            // Fall back to local CSV files if online fetch failed
            if (!usingOnlineSource) {
                console.warn("Fetching local Value & Info CSVs.");
                const [valueRes, infoRes] = await Promise.all([
                    fetchCSV('Value List Editor - ❗Values❗.csv'),
                    fetchCSV('Value List Editor - ❗Info❗.csv')
                ]).catch(error => {
                    throw new Error(`Local CSV fetch error: ${error.message}`);
                });

                if (!Array.isArray(valueRes)) throw new Error("Invalid local Values CSV data.");
                if (!Array.isArray(infoRes)) throw new Error("Invalid local Info CSV data.");

                allItems = parseValueData(valueRes);
                parseInfoData(infoRes);
            }

            // Load favorites *after* items are loaded to ensure validation works
            loadFavoritesFromStorage();
            
            updateLayoutHeights();
            populateFilters();
            displayItems(allItems);
            populateGuide();
            populateInfoNodes();
            populateTimeline();
            
            // If we're in mobile view and in the update log section, create mobile timeline now that data is loaded
            if (window.innerWidth <= 768 && document.getElementById('update-log').classList.contains('active')) {
                createMobileTimeline();
            }

            loadingIndicators.forEach(el => {
                if(el) el.style.display = 'none';
            });
            if(itemGrid) itemGrid.style.minHeight = 'auto';
            checkFilterStates();

        } catch (error) {
            console.error("Error in fetchData:", error);
            // Show error to user
            loadingIndicators.forEach(el => {
                if(el) el.innerHTML = '<p class="error-message">Failed to load data. Please try refreshing the page.</p>';
            });
        }
    }
    
    // Add new parser for online data format
    function parseOnlineData(data) {
        if (!Array.isArray(data)) {
            console.error("Invalid data passed to parseOnlineData");
            return [];
        }
        
        const items = [];
        
        data.forEach((row, index) => {
            if (!row || !row.Item || row.Item.trim() === '') return;
            
            const rawValue = (row.Value || '').replace(/[,"]/g, '');
            const valueNum = parseInt(rawValue, 10);
            
            const name = row.Item?.trim() || 'Unknown Item';
            const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const id = `item-${index}-${safeName}`;
            
            items.push({
                id: id,
                name: name,
                rarity: row.Rarity?.trim() || 'Common',
                value: row.Value?.trim() || '???',
                valueNumeric: isNaN(valueNum)
                    ? (row.Value?.trim().toLowerCase() === "owner's choice" ? -2 : -1)
                    : valueNum,
                range: row.Range?.trim() || 'N/A',
                demand: row.Demand?.trim() || 'N/A',
                stability: row.Stability?.trim() || 'N/A',
                obtainability: row.Obtainability?.trim() || 'N/A'
            });
        });
        
        return items;
    }

    // --- Save/Load Favorites to/from localStorage ---
    function saveFavoritesToStorage() {
        localStorage.setItem('katxFavorites', JSON.stringify(favoritesList));
    }

    function loadFavoritesFromStorage() {
        try {
            const saved = localStorage.getItem('katxFavorites');
            if (saved) {
                let storedFavorites = JSON.parse(saved);
                
                // Validate favorites against current items (if loaded)
                if (allItems && allItems.length > 0) {
                    const validFavorites = storedFavorites.filter(id => 
                        allItems.some(item => item.id === id)
                    );
                    
                    // If we found invalid favorites, save the cleaned list back
                    if (validFavorites.length !== storedFavorites.length) {
                        console.log(`Removed ${storedFavorites.length - validFavorites.length} invalid favorites`);
                        favoritesList = validFavorites;
                        saveFavoritesToStorage();
                    } else {
                        favoritesList = storedFavorites;
                    }
                } else {
                    // If items not loaded yet, just use the stored list as is
                    favoritesList = storedFavorites;
                }
                
                console.log(`Loaded ${favoritesList.length} favorites from storage`);
                updateFavoritesUI();
            } else {
                favoritesList = [];
            }
        } catch (e) {
            console.error("Error loading favorites from storage:", e);
            favoritesList = [];
        }
    }

    function fetchCSV(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: false,
                skipEmptyLines: 'greedy',
                complete: (results) => {
                    if (results.errors && results.errors.length > 0) {
                        console.warn(`PapaParse errors in ${url}:`, results.errors);
                        resolve(results.data || []);
                    } else if (!results.data) {
                        console.warn(`PapaParse no data for ${url}.`);
                        resolve([]);
                    } else {
                        resolve(results.data);
                    }
                },
                error: (error, file) => {
                    console.error(`Error fetching/parsing ${url}:`, error);
                    reject(error);
                }
            });
        });
    }

    // --- Parsers ---
    function parseValueData(data) {
        if (!Array.isArray(data)) {
            console.error("Invalid data passed to parseValueData");
            return [];
        }
        const items = [];
        const nameCol = 1,
              rarityCol = 3,
              valueCol = 5,
              rangeCol = 7,
              demandCol = 9,
              stabilityCol = 11,
              obtainCol = 13;

        data.forEach((row, index) => {
            if (
                index < 1 ||
                !row ||
                typeof row !== 'object' ||
                row.length <= obtainCol ||
                !row[nameCol] ||
                row[nameCol].trim() === ''
            ) return;

            const rawValue = (row[valueCol] || '').replace(/[,"]/g, '');
            const valueNum = parseInt(rawValue, 10);

            const name = row[nameCol]?.trim() || 'Unknown Item';
            const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const id = `item-${index}-${safeName}`;

            items.push({
                id: id,
                name: name,
                rarity: row[rarityCol]?.trim() || 'Common',
                value: row[valueCol]?.trim() || '???',
                valueNumeric: isNaN(valueNum)
                    ? (row[valueCol]?.trim().toLowerCase() === "owner's choice" ? -2 : -1)
                    : valueNum,
                range: row[rangeCol]?.trim() || 'N/A',
                demand: row[demandCol]?.trim() || 'N/A',
                stability: row[stabilityCol]?.trim() || 'N/A',
                obtainability: row[obtainCol]?.trim() || 'N/A'
            });
        });
        return items;
    }

    function parseInfoData(infoRawData) {
        if (!Array.isArray(infoRawData)) {
            console.error("Invalid info data");
            return;
        }
        let welcomeLines = [];
        let ownerDisclaimerStarted = false;
        let ownerDisclaimerLines = [];
        const ownerDisclaimerHeader = "DISCLAIMERS FROM GAME OWNER";

        infoData.welcome = '';
        infoData.ownerDisclaimer = '';
        infoData.contactNote = '';
        infoData.discordNote = '';

        infoRawData.forEach((row, index) => {
            if (!row || row.length === 0) return;
            const cell0 = row[0]?.trim();
            const cell2 = row[2]?.trim();

            if (cell0 && index === 0 && cell0.toLowerCase().startsWith("kab community")) {
                welcomeLines.push(cell0);
            } else if (welcomeLines.length > 0 && cell0 && !cell2 && index < 10) {
                welcomeLines.push(cell0);
            }

            if (cell0 === ownerDisclaimerHeader) {
                ownerDisclaimerStarted = true;
                return;
            }
            if (ownerDisclaimerStarted && cell0) {
                ownerDisclaimerLines.push(cell0);
            } else if (ownerDisclaimerStarted && !cell0) {
                ownerDisclaimerStarted = false;
            }

            if (cell2?.includes('Feel free to DM')) infoData.contactNote = cell2;
            if (cell2?.includes('Official KAB discord server')) infoData.discordNote = cell2;
        });

        infoData.welcome = welcomeLines.join(' ').replace(/,+\s*$/, "");
        if (ownerDisclaimerLines.length > 0) {
            infoData.ownerDisclaimer = ownerDisclaimerLines.join('<br>');
        } else {
            infoData.ownerDisclaimer = "friendly reminder that any value list is unofficial and if u get scammed because u used values we wont do shit<br>reminder that value lists are optional. There are no official value lists as of this moment";
        }
    }

    // --- Filtering and Sorting ---
    function applyFiltersAndSort() {
        if (!allItems || typeof allItems.filter !== 'function') {
            console.error("allItems not ready.");
            return;
        }
        const searchTerm = searchBar.value.toLowerCase();
        const selectedRarity = rarityFilter.value;
        const basicObtainability = obtainabilityFilter.value;
        const currentSort = sortBy.value;

        const advObtain = currentAdvancedFilters.obtainability;
        const advDemand = currentAdvancedFilters.demand;
        const advStability = currentAdvancedFilters.stability;

        let filteredItems = allItems.filter(item => {
            if (
                !item ||
                typeof item.name !== 'string' ||
                typeof item.rarity !== 'string' ||
                typeof item.obtainability !== 'string' ||
                typeof item.demand !== 'string' ||
                typeof item.stability !== 'string'
            ) return false;

            const nameMatch = item.name.toLowerCase().includes(searchTerm);
            const rarityMatch = selectedRarity === 'all' || item.rarity === selectedRarity;

            let obtainabilityMatch = false;
            if (advObtain.length > 0) {
                const itemSources = item.obtainability.split(/[/,]/)
                    .map(s => s.trim().toLowerCase())
                    .filter(s => s);
                obtainabilityMatch = itemSources.some(itemSrc =>
                    advObtain.some(advSrc => itemSrc.includes(advSrc.toLowerCase()))
                );
            } else {
                obtainabilityMatch =
                    basicObtainability === 'all' ||
                    item.obtainability.toLowerCase().includes(basicObtainability.toLowerCase());
            }

            const demandMatch = advDemand.length === 0 || advDemand.includes(item.demand);
            const stabilityMatch = advStability.length === 0 || advStability.includes(item.stability);

            return nameMatch && rarityMatch && obtainabilityMatch && demandMatch && stabilityMatch;
        });

        filteredItems.sort((a, b) => {
            switch (currentSort) {
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'value_desc':
                    if (a.valueNumeric <= -1 && b.valueNumeric > -1) return 1;
                    if (a.valueNumeric > -1 && b.valueNumeric <= -1) return -1;
                    if (a.valueNumeric <= -1 && b.valueNumeric <= -1)
                        return a.value.localeCompare(b.value);
                    return b.valueNumeric - a.valueNumeric;
                case 'value_asc':
                    if (a.valueNumeric <= -1 && b.valueNumeric > -1) return 1;
                    if (a.valueNumeric > -1 && b.valueNumeric <= -1) return -1;
                    if (a.valueNumeric <= -1 && b.valueNumeric <= -1)
                        return a.value.localeCompare(b.value);
                    return a.valueNumeric - b.valueNumeric;
                case 'rarity':
                    const rarityA = rarityOrder.indexOf(a.rarity);
                    const rarityB = rarityOrder.indexOf(b.rarity);
                    const idxA = rarityA === -1 ? rarityOrder.length : rarityA;
                    const idxB = rarityB === -1 ? rarityOrder.length : rarityB;
                    return idxA - idxB;
                default:
                    return 0;
            }
        });

        // *** MODIFICATION: Reset scroll position before displaying new filtered items ***
        // This ensures the user sees the top of the new results.
        const scrollContainer = virtualScrollInfo.scrollContainer || window;
        if (scrollContainer === window) {
            // Check if mainElement is the scroll target or if window is
            if (virtualScrollInfo.scrollContainer === mainElement) {
                mainElement.scrollTo({ top: 0, behavior: 'auto' }); // Changed to auto for instant scroll
            } else {
                window.scrollTo({ top: 0, behavior: 'auto' }); // Changed to auto for instant scroll
            }
        } else {
            scrollContainer.scrollTop = 0;
        }
        virtualScrollInfo.scrollTop = 0; // Update state immediately
        // *** END MODIFICATION ***

        // Call the modified displayItems which handles virtual scroll setup
        displayItems(filteredItems);
        checkFilterStates();
    }

    // --- Clear Button Logic ---
    function checkFilterStates() {
        if (!clearFiltersButton || !searchBar || !rarityFilter || !obtainabilityFilter) return;
    // --- Event Listeners ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.dataset.section;
            switchSection(targetSection);
            button.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
            setTimeout(() => button.style.backgroundColor = '', 150);
            
            // Handle mobile timeline specifically for update-log section
            if (targetSection === 'update-log' && window.innerWidth <= 768) {
                // Create mobile timeline on small screens
                setTimeout(() => {
                    document.body.classList.add('mobile-view');
                    createMobileTimeline();
                }, 400); // Delay slightly to let section transition complete
            }
        });
    });

    if (nexusCtaButton) {
        nexusCtaButton.addEventListener('click', () => switchSection(nexusCtaButton.dataset.targetSection));
    }

    // Basic filter listeners + check state
    if(searchBar) searchBar.addEventListener('input', () => {
        applyFiltersAndSort();
    });
    if(rarityFilter) rarityFilter.addEventListener('change', () => {
        applyFiltersAndSort();
    });
    if(obtainabilityFilter) obtainabilityFilter.addEventListener('change', () => {
        if(obtainabilityFilter.value !== 'all') {
            resetAdvancedFilters();
        }
        applyFiltersAndSort();
    });
    if(sortBy) sortBy.addEventListener('change', () => {
        applyFiltersAndSort();
    });
    if(clearFiltersButton) clearFiltersButton.addEventListener('click', clearFilters);

    // Advanced filter listeners
    if(advancedFiltersBtn) advancedFiltersBtn.addEventListener('click', openAdvancedFilters);
    if(applyAdvFiltersBtn) applyAdvFiltersBtn.addEventListener('click', applyAdvancedFilters);
    if(resetAdvFiltersBtn) resetAdvFiltersBtn.addEventListener('click', resetAdvancedFilters);
    closeAdvFiltersBtns.forEach(btn => {
        if(btn) btn.addEventListener('click', closeAdvancedFilters);
    });

    // Favorites listeners
    if(favoritesButton) favoritesButton.addEventListener('click', () => {
        populateFavoritesOverlay();
        favoritesOverlay.classList.add('visible');
    });
    
    if(closeFavoritesButton) closeFavoritesButton.addEventListener('click', () => {
        favoritesOverlay.classList.remove('visible');
    });
    
    if(favoritesOverlay) favoritesOverlay.addEventListener('click', (e) => {
        if (e.target === favoritesOverlay) {
            favoritesOverlay.classList.remove('visible');
        }
    });
    
    if(clearFavoritesButton) clearFavoritesButton.addEventListener('click', clearAllFavorites);

    // Confirmation modal listeners
    if(cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', hideConfirmationModal);
    if(confirmationModal) confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal) {
            hideConfirmationModal();
        }
    });

    // Item Detail Modal Listeners
    if(closeItemDetailBtn) closeItemDetailBtn.addEventListener('click', closeItemDetailModal);
    if(itemDetailModal) itemDetailModal.addEventListener('click', (e) => {
        if (e.target === itemDetailModal) closeItemDetailModal();
    });

    // --- Initial Load ---
    fetchData();
    
    // Insert the styles for the creators list
    const style = document.createElement('style');
    style.textContent = `
        .creators-list .primary-creator {
            font-size: 1.2rem;
            margin-bottom: 1.2rem;
            padding: 0.8rem;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid var(--color-primary);
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
        }
        .creators-list .primary-creator strong {
            color: var(--color-primary);
            font-size: 1.3rem;
            text-shadow: 0 0 5px rgba(0, 255, 255, 0.4);
        }
        .creators-list .creator-role {
            font-weight: 600;
            color: var(--color-text);
            display: block;
            margin-bottom: 0.2rem;
        }
        .creators-list .secondary-creators {
            margin-top: 1rem;
            padding-top: 0.5rem;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .creators-list .sub-heading {
            font-size: 0.9rem;
            color: var(--color-text-muted);
            margin-bottom: 0.5rem;
        }
    `;
    document.head.appendChild(style);

    // Add this to the document ready function or where event handlers are set up

    // Function to format timeline events with the new structure
    function formatTimelineEvents() {
        document.querySelectorAll('.timeline-event .event-change').forEach(eventChange => {
            // Skip if already formatted
            if (eventChange.querySelector('.change-details')) return;
            
            // Get the original values
            const content = eventChange.innerHTML;
            const matchResult = content.match(/(.*?):\s*(\d[\d,.]*[k]?)\s*(?:<span class="arrow.*?<\/span>)\s*(\d[\d,.]*[k]?)/);
            
            if (matchResult) {
                const [_, itemNameHtml, oldValue, newValue] = matchResult;
                
                // Parse values (assuming 'k' suffix means thousands)
                const oldValueNum = parseValueString(oldValue);
                const newValueNum = parseValueString(newValue);
                
                // Calculate difference and percentage
                const difference = newValueNum - oldValueNum;
                const percentChange = oldValueNum > 0 ? Math.round((difference / oldValueNum) * 100) : 0;
                const changeDirection = difference >= 0 ? 'increase' : 'decrease';
                const changePrefix = difference >= 0 ? 'up' : 'down';
                const absDifference = Math.abs(difference);
                
                // Format values for display
                const formattedDiff = formatValue(absDifference);
                
                // Create new HTML
                eventChange.innerHTML = `
                    ${itemNameHtml}
                    <div class="change-details">
                        <span class="value-difference ${changeDirection}">${changePrefix} ${formattedDiff}</span>
                        <span class="value-range">(${oldValue} to ${newValue})</span>
                        <span class="value-percentage ${changeDirection}">${Math.abs(percentChange)}%</span>
                    </div>
                `;
            }
        });
    }

    // Helper functions to parse and format values
    function parseValueString(valueStr) {
        // Remove commas
        valueStr = valueStr.replace(/,/g, '');
        
        // Handle 'k' suffix (thousands)
        if (valueStr.endsWith('k')) {
            return parseFloat(valueStr.slice(0, -1)) * 1000;
        }
        return parseFloat(valueStr);
    }

    function formatValue(value) {
        if (value >= 1000) {
            return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'k';
        }
        return value.toString();
    }

    // Check for long names in item detail cards and add class for styling
    function handleLongItemNames() {
        document.querySelectorAll('.item-detail-card .item-name').forEach(nameElement => {
            if (nameElement.textContent.length > 15) {
                nameElement.classList.add('long-name');
            }
        });
    }

    // Add these calls where appropriate in your existing code
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                formatTimelineEvents();
                handleLongItemNames();
            }
        }
    });
    
    // Observe timeline and detail card container
    const timelineEvents = document.getElementById('timeline-events');
    const detailContainer = document.getElementById('item-detail-card-container');
    
    if (timelineEvents) {
        observer.observe(timelineEvents, { childList: true, subtree: true });
        formatTimelineEvents(); // Format any existing events
    }
    
    if (detailContainer) {
        observer.observe(detailContainer, { childList: true, subtree: true });
    }
});

// --- Initialize Mobile Features ---
// This function was refactored and replaced with initializeResponsiveFeatures
// Remove this to fix the error: Uncaught ReferenceError: timelineEventsEl is not defined

// Call this function after loading timeline events
document.addEventListener('DOMContentLoaded', () => {
    // Existing initialization code
    // ...
    
    // Initialize mobile-specific features
    initializeResponsiveFeatures();
    
    // Update heights on page load
    updateLayoutHeights();
    
    // Listen for resize events to adapt layout
    window.addEventListener('resize', () => {
        initializeResponsiveFeatures();
    });
});

function initParticleSystem() {
    const particleCanvas = document.getElementById('particle-canvas');
    if (!particleCanvas) {
        console.warn("Particle canvas not found when initializing particle system");
        return;
    }
    
    const particleCtx = particleCanvas.getContext('2d');
    if (!particleCtx) {
        console.warn("Could not get 2D context for particle canvas");
        return;
    }
    
    const connectionCanvas = document.getElementById('connection-canvas');
    let connectionCtx = null;
    if (connectionCanvas) {
        connectionCtx = connectionCanvas.getContext('2d');
    }
    
    let particles = [];
    let mouse = { x: null, y: null };

    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
        if (connectionCanvas) {
            connectionCanvas.width = window.innerWidth;
            connectionCanvas.height = window.innerHeight;
        }
    }
    
    resizeCanvas();
    
    // Rest of particle system code
    // ...existing code...
}

window.addEventListener('load', function() {
    setTimeout(initParticleSystem, 100); // Small delay to ensure DOM is fully loaded
});

window.addEventListener('resize', function() {
    const particleCanvas = document.getElementById('particle-canvas');
    if (particleCanvas) {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    
    const connectionCanvas = document.getElementById('connection-canvas');
    if (connectionCanvas) {
        connectionCanvas.width = window.innerWidth;
        connectionCanvas.height = window.innerHeight;
    }
});

// Fix scope issues by moving the createMobileTimeline function
// inside the document.addEventListener where it has access to findItemFuzzy
function initializeResponsiveFeatures() {
    // Check if we're on mobile viewport
    const isMobile = window.innerWidth <= 768;
    
    // Add or remove mobile view class to body
    if (isMobile) {
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
    }
    
    // Initialize mobile timeline if on mobile
    if (isMobile) {
        setTimeout(() => {
            // Call handleResponsiveView to manage timeline creation
            handleResponsiveView();
        }, 100); // Small delay to ensure DOM is ready
    }
}

// Special handling for "(Contraband)" and other items with parentheses
function cleanItemName(itemName) {
    if (!itemName) return "";
    
    // Extract the name part before parentheses for item matching
    // But keep the full name for display purposes
    return itemName.replace(/ *\([^)]*\) */g, "").trim();
}

// Create a completely new timeline format for mobile
function createMobileTimeline() {
    console.log("Attempting to create mobile timeline...");
    const timelineEventsEl = document.getElementById('timeline-events');
    const updateLogSection = document.getElementById('update-log');

    // Ensure data is ready and we are in the correct section
    if (!timelineEventsEl || !allUpdates || allUpdates.length === 0 || !updateLogSection) {
         console.warn("Mobile timeline prerequisites not met (container, data, or section missing).");
         if(timelineEventsEl) timelineEventsEl.innerHTML = '<p class="no-results" style="text-align: center;">Loading history failed or no updates available.</p>';
         return;
    }

    // Clear existing content ONLY if we haven't already built the mobile timeline
    if (!timelineEventsEl.querySelector('.mobile-timeline')) {
         timelineEventsEl.innerHTML = ''; // Clear previous content (like loading indicators or old desktop structure)
    } else {
        console.log("Mobile timeline already exists, skipping generation.");
        return; // Avoid regenerating if already present
    }

    // Create intro text
    const introEl = document.createElement('div');
    introEl.className = 'chat-intro';
    introEl.innerHTML = `
        <i class="fa-solid fa-circle-info"></i>
        Chat-style updates: newest updates at the top
    `;
    timelineEventsEl.appendChild(introEl);

    // Create mobile timeline container
    const mobileTimelineEl = document.createElement('div');
    mobileTimelineEl.className = 'mobile-timeline';

    let bubbleIndex = 0; // For staggered animation index

    // Define how many dates to show initially (pagination)
    const initialDatesToShow = 2;
    let visibleDates = initialDatesToShow;
    
    // Iterate through dates (assuming allUpdates is already sorted newest first)
    // Render only the initial subset for performance/smooth loading
    function renderDates(startIndex, endIndex) {
        const datesToRender = allUpdates.slice(startIndex, endIndex);
        
        datesToRender.forEach((update) => {
            // Create date marker
            const dateMarker = document.createElement('div');
            dateMarker.className = 'date-marker';
            dateMarker.innerHTML = `<div class="date-marker-text">${update.date}</div>`;
            mobileTimelineEl.appendChild(dateMarker);

            // Create container for the bubbles for this date
            const chatBubbles = document.createElement('div');
            chatBubbles.className = 'chat-bubbles';

            // Process all changes for this date
            update.changes.forEach((change) => {
                let itemInfo = null;
                let fullItemName = null;
                let changeClass = 'neutral';
                let iconClass = 'fa-circle-info';

                // Determine Item Info & Basic Classes
                if (change.type === 'value') {
                    fullItemName = change.item;
                    itemInfo = findItemByName(fullItemName); // Use existing find function
                    // Determine increase/decrease later based on values
                } else if (change.type === 'note') {
                    changeClass = 'note';
                    fullItemName = `${change.action}: ${change.detail}`;
                    // Try to find item if it's an 'Added' note
                    if (change.action === 'Added') {
                        const potentialItemName = cleanItemName(change.detail);
                        itemInfo = findItemByName(potentialItemName);
                        if (itemInfo) fullItemName = change.detail; // Use original detail if item found
                        iconClass = 'fa-plus';
                    } else if (change.action === 'Fixed') {
                        iconClass = 'fa-wrench';
                    } else if (change.action === 'Established') {
                        iconClass = 'fa-flag-checkered';
                    }
                } else {
                    fullItemName = "Unknown Change";
                }

                // Refine changeClass and iconClass for VALUE changes
                if (change.type === 'value') {
                    // Basic parsing (assumes numbers or specific strings)
                    const parseVal = (valStr) => {
                        if (!valStr) return NaN;
                        if (typeof valStr !== 'string') valStr = String(valStr);
                        const cleaned = valStr.replace(/[,kK]/gi, '');
                        const num = parseInt(cleaned, 10);
                        return isNaN(num) ? NaN : num * (valStr.toLowerCase().includes('k') ? 1000 : 1);
                    };
                    const oldValueNum = parseVal(change.old);
                    const newValueNum = parseVal(change.new);

                    if (!isNaN(oldValueNum) && !isNaN(newValueNum)) {
                        if (newValueNum > oldValueNum) { 
                            changeClass = 'increase'; 
                            iconClass = 'fa-arrow-up'; 
                        } else if (newValueNum < oldValueNum) { 
                            changeClass = 'decrease'; 
                            iconClass = 'fa-arrow-down'; 
                        } else { 
                            changeClass = 'neutral'; 
                            iconClass = 'fa-equals'; 
                        } // No change
                    } else {
                        changeClass = 'neutral'; // Non-numeric change (e.g., Owner's Choice)
                        iconClass = 'fa-exchange-alt';
                    }
                }

                // Create Bubble Element
                const bubble = document.createElement('div');
                bubble.className = `update-bubble ${changeClass}`;
                bubble.style.setProperty('--index', bubbleIndex); // For animation

                let bubbleHTML = '';
                // --- Generate HTML for VALUE changes ---
                if (change.type === 'value') {
                    const rarityAttr = itemInfo ? `data-rarity="${itemInfo.rarity}"` : '';
                    const rarityStyle = itemInfo ? `style="--rarity-color: var(--rarity-${itemInfo.rarity.toLowerCase()}, var(--color-text))"` : '';

                    // Calculate percentage
                    const parseVal = (valStr) => {
                        if (!valStr) return NaN;
                        const cleaned = valStr.replace(/[,kK]/gi, '');
                        const num = parseInt(cleaned, 10);
                        return isNaN(num) ? NaN : num * (valStr.toLowerCase().includes('k') ? 1000 : 1);
                    };
                    const oldValueNum = parseVal(change.old);
                    const newValueNum = parseVal(change.new);
                    let percentageHTML = '';
                    if (!isNaN(oldValueNum) && !isNaN(newValueNum) && oldValueNum !== 0) {
                        const difference = newValueNum - oldValueNum;
                        let percentChange = Math.round((difference / oldValueNum) * 100);
                        percentChange = Math.max(-999, Math.min(999, percentChange)); // Cap extremes
                        percentageHTML = `
                            <div class="percentage-badge">
                                <i class="fa-solid ${iconClass}"></i>
                                ${difference >= 0 ? '+' : ''}${percentChange}%
                            </div>
                        `;
                    }

                    bubbleHTML = `
                        <div class="bubble-header">
                            <div class="change-indicator"><i class="fa-solid ${iconClass}"></i></div>
                            <div class="item-name ${itemInfo ? 'timeline-item-link' : ''}" data-item-id="${itemInfo?.id || ''}" ${rarityAttr} ${rarityStyle}>
                                ${fullItemName}
                            </div>
                        </div>
                        <div class="value-change">
                            <div class="old-value">
                                <span class="change-label">Old</span>
                                <span class="value-number">${change.old || 'N/A'}</span>
                            </div>
                            <div class="change-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                            <div class="new-value">
                                <span class="change-label">New</span>
                                <span class="value-number">${change.new || 'N/A'}</span>
                            </div>
                            ${percentageHTML}
                        </div>
                    `;
                // --- Generate HTML for NOTE changes ---
                } else { // Notes or other types
                    const displayTitle = itemInfo && change.type === 'note' && change.action === 'Added'
                        ? `<span class="timeline-item-link" data-item-id="${itemInfo.id}" data-rarity="${itemInfo.rarity}" style="--rarity-color: var(--rarity-${itemInfo.rarity.toLowerCase()}, var(--color-text))">${fullItemName}</span>`
                        : fullItemName; // Display as plain text if not linkable

                    bubbleHTML = `
                        <div class="bubble-content">
                            <div class="change-indicator"><i class="fa-solid ${iconClass}"></i></div>
                            <div class="note-text">
                                ${change.type === 'note' ? `<strong>${change.action}:</strong> ` : ''}
                                ${displayTitle}
                            </div>
                        </div>
                    `;
                }

                bubble.innerHTML = bubbleHTML;
                chatBubbles.appendChild(bubble);
                bubbleIndex++;
            });

            mobileTimelineEl.appendChild(chatBubbles);
        });
    }
    
    // Initial render
    renderDates(0, visibleDates);
    
    // Add "Continue to iterate?" button if there are more dates to show
    if (allUpdates.length > visibleDates) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-button';
        loadMoreBtn.innerHTML = '<span>Continue to iterate?</span> <i class="fas fa-chevron-down"></i>';
        mobileTimelineEl.appendChild(loadMoreBtn);
        
        loadMoreBtn.addEventListener('click', function() {
            // Increase visible dates count
            const previousCount = visibleDates;
            visibleDates += 1;
            
            // Remove button temporarily while we add more content
            this.remove();
            
            // Render newly visible dates
            renderDates(previousCount, visibleDates);
            
            // Add button back if there are still more dates to show
            if (allUpdates.length > visibleDates) {
                mobileTimelineEl.appendChild(loadMoreBtn);
            } else {
                // If all dates are loaded, show an end message
                const endMessage = document.createElement('div');
                endMessage.className = 'end-message';
                endMessage.innerHTML = '<i class="fas fa-check-circle"></i> All updates loaded';
                mobileTimelineEl.appendChild(endMessage);
            }
            
            // Animate new bubbles that were just added
            if (typeof anime === 'function') {
                anime({
                    targets: '.mobile-view .update-bubble',
                    opacity: [0, 1],
                    translateY: [10, 0],
                    scale: [0.95, 1],
                    delay: anime.stagger(50),
                    duration: 400,
                    easing: 'easeOutQuad'
                });
            }
        });
    }

    timelineEventsEl.appendChild(mobileTimelineEl);

    // Attach Event Listeners to newly created links
    mobileTimelineEl.querySelectorAll('.timeline-item-link').forEach(link => {
        if (!link.hasAttribute('data-listener-added')) { // Prevent duplicate listeners
            link.addEventListener('click', handleTimelineItemClick); // Use existing handler
            link.setAttribute('data-listener-added', 'true');
        }
    });

    console.log("Mobile timeline created and listeners attached.");

    // Trigger bubble entrance animation
    if (typeof anime === 'function') {
        anime({
            targets: '.mobile-view .update-bubble',
            opacity: [0, 1],
            translateY: [10, 0],
            scale: [0.95, 1],
            delay: anime.stagger(60, { start: 100 }), // Stagger animation
            duration: 400,
            easing: 'easeOutQuad'
        });
    }
}

// Function to Manage Mobile View and Timeline Generation
function handleResponsiveView() {
    const currentlyMobile = window.innerWidth <= 768;
    const bodyHasMobileClass = document.body.classList.contains('mobile-view');
    const updateLogSection = document.getElementById('update-log');
    const timelineEventsEl = document.getElementById('timeline-events');

    if (currentlyMobile) {
        if (!bodyHasMobileClass) {
            console.log("Switching to Mobile View");
            document.body.classList.add('mobile-view');
            // If update log is active, generate mobile timeline
            if (updateLogSection && updateLogSection.classList.contains('active')) {
                // Clear potential desktop remnants before generating
                 if (timelineEventsEl) timelineEventsEl.innerHTML = '<div class="loading-indicator">Loading History... <i class="fa-solid fa-spinner fa-spin"></i></div>';
                createMobileTimeline();
            }
        }
    } else {
        if (bodyHasMobileClass) {
            console.log("Switching to Desktop View");
            document.body.classList.remove('mobile-view');
            // If update log is active, clear mobile timeline and repopulate desktop
            if (updateLogSection && updateLogSection.classList.contains('active')) {
                 if (timelineEventsEl) timelineEventsEl.innerHTML = '<div class="loading-indicator">Loading History... <i class="fa-solid fa-spinner fa-spin"></i></div>';
                // Repopulate the original desktop timeline
                populateTimeline(); // Assuming this function handles desktop regeneration
            }
        }
    }
    isMobileView = currentlyMobile; // Update global state
}

// --- Function to Handle Responsive Switching ---
function handleResponsiveView() {
  const currentlyMobile = window.innerWidth <= 768;
  const bodyHasMobileClass = document.body.classList.contains('mobile-view');
  const updateLogSection = document.getElementById('update-log');
  const timelineEventsEl = document.getElementById('timeline-events');

  if (currentlyMobile) {
    // --- Switching TO Mobile ---
    if (!bodyHasMobileClass) {
      console.log("Switching to Mobile View");
      document.body.classList.add('mobile-view');
      // If update log is the active section, generate mobile timeline
      if (updateLogSection && updateLogSection.classList.contains('active')) {
        // Clear potential desktop remnants before generating
        if (timelineEventsEl) timelineEventsEl.innerHTML = '<div class="loading-indicator">Switching View... <i class="fa-solid fa-spinner fa-spin"></i></div>';
        // Use setTimeout to ensure DOM updates before generating
        setTimeout(createMobileTimeline, 50);
      }
    }
  } else {
    // --- Switching TO Desktop ---
    if (bodyHasMobileClass) {
      console.log("Switching to Desktop View");
      document.body.classList.remove('mobile-view');
      // If update log is active, clear mobile timeline and repopulate desktop
      if (updateLogSection && updateLogSection.classList.contains('active')) {
        if (timelineEventsEl) timelineEventsEl.innerHTML = '<div class="loading-indicator">Loading History... <i class="fa-solid fa-spinner fa-spin"></i></div>';
        // Repopulate the original desktop timeline
        // Use setTimeout to ensure DOM updates before populating
        setTimeout(populateTimeline, 50); // Assumes populateTimeline handles desktop
      }
    }
  }
  isMobileView = currentlyMobile; // Update global state
}

// Add event listeners for responsive switching
document.addEventListener('DOMContentLoaded', () => {
  // Initial check on page load
  handleResponsiveView();
  
  // Add window resize listener
  window.addEventListener('resize', () => {
    handleResponsiveView();
    updateLayoutHeights();
  });
  
  // Add listener for section switching to trigger timeline generation
  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSectionId = button.dataset.section;
      // Call handleResponsiveView AFTER the section switch logic completes
      setTimeout(() => {
        if (targetSectionId === 'update-log') {
          handleResponsiveView(); // Re-check view state when switching TO update log
        }
      }, 350); // Adjust delay based on your transition duration
    });
  });
});

// --- Handle Timeline Item Click ---
function handleTimelineItemClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const itemId = event.currentTarget.dataset.itemId;
  if (!itemId) {
    console.warn("No item ID found on clicked timeline element");
    return;
  }
  
  // Open the item detail modal
  openItemDetailModal(itemId);
}