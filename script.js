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
        loadMoreBtn.innerHTML = '<span>Continue to iterate?</span> <i class="fas fa-chevron-down"></i>';
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

    // Add event listener to update heights on resize
    window.addEventListener('resize', updateLayoutHeights);

    // --- Particle Background ---
    if (particleCanvas) {
        const ctx = particleCanvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null };

        function resizeCanvas() {
            particleCanvas.width = window.innerWidth;
            particleCanvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
            updateLayoutHeights();
        });
        particleCanvas.addEventListener('mousemove', (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        });
        particleCanvas.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * particleCanvas.width;
                this.y = Math.random() * particleCanvas.height;
                this.size = Math.random() * 1.8 + 0.6;
                this.speedX = Math.random() * 0.3 - 0.15;
                this.speedY = Math.random() * 0.3 - 0.15;
                this.baseColor = Math.random() > 0.1
                    ? `rgba(200, 220, 255, ${Math.random() * 0.6 + 0.2})`
                    : `rgba(0, 255, 255, ${Math.random() * 0.6 + 0.3})`;
                this.color = this.baseColor;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (mouse.x != null && mouse.y != null) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = 80;
                    if (distance < maxDistance) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (maxDistance - distance) / maxDistance * 0.15;
                        this.x += forceDirectionX * force;
                        this.y += forceDirectionY * force;
                    }
                }
                if (
                    this.x < -10 ||
                    this.x > particleCanvas.width + 10 ||
                    this.y < -10 ||
                    this.y > particleCanvas.height + 10
                ) {
                    this.x = Math.random() * particleCanvas.width;
                    this.y = Math.random() > 0.5 ? -5 : particleCanvas.height + 5;
                    this.speedX = Math.random() * 0.3 - 0.15;
                    this.speedY = Math.random() * 0.3 - 0.15;
                }
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            let numberOfParticles = (particleCanvas.width * particleCanvas.height) / 12000;
            numberOfParticles = Math.min(numberOfParticles, 150);
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        }

        function animateParticles() {
            if (!ctx) return;
            ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            drawLines();
            requestAnimationFrame(animateParticles);
        }

        function drawLines() {
            if (!ctx) return;
            let maxDistance = 100; // Moderate distance for connections
            ctx.beginPath();
            for (let a = 0; a < particles.length; a++) {
                for (let b = a + 1; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Dynamic connection logic - only connect if distance is right and passes random check
                    if (distance < maxDistance && Math.random() > 0.15) {
                        // More varied opacity based on distance
                        const opacity = (1 - (distance / maxDistance)) * (0.05 + Math.random() * 0.1);
                        ctx.strokeStyle = `rgba(150, 200, 255, ${opacity})`;
                        ctx.lineWidth = 0.3 + Math.random() * 0.4; // Varied line width
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                    }
                }
            }
            ctx.stroke();
        }

        initParticles();
        animateParticles();
    } else {
        console.error("Particle canvas not found!");
    }

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

        displayItems(filteredItems);
        checkFilterStates();
    }

    // --- Clear Button Logic ---
    function checkFilterStates() {
        if (!clearFiltersButton || !searchBar || !rarityFilter || !obtainabilityFilter) return;
        const isSearchActive = searchBar.value.trim() !== '';
        const isRarityActive = rarityFilter.value !== 'all';
        const isBasicObtainabilityActive = obtainabilityFilter.value !== 'all';
        const isAdvFilterActive = (
            currentAdvancedFilters.obtainability.length > 0 ||
            currentAdvancedFilters.demand.length > 0 ||
            currentAdvancedFilters.stability.length > 0
        );

        clearFiltersButton.disabled = !(
            isSearchActive ||
            isRarityActive ||
            isBasicObtainabilityActive ||
            isAdvFilterActive
        );
    }

    function clearFilters() {
        searchBar.value = '';
        rarityFilter.value = 'all';
        obtainabilityFilter.value = 'all';
        sortBy.value = 'name_asc';

        resetAdvancedFilters();
        applyFiltersAndSort();
    }

    // --- UI Population ---
    function populateFilters() {
        if (!allItems || allItems.length === 0 ||
            !rarityFilter || !obtainabilityFilter ||
            !advObtainFiltersContainer) return;

        const rarities = [...new Set(allItems.map(item => item.rarity))]
            .sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));
        rarityFilter.innerHTML = '<option value="all">All</option>';
        rarities.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            rarityFilter.appendChild(opt);
        });

        const commonSources = new Set();
        allItems.forEach(item => {
            const sources = item.obtainability.split(/[/,]/)
                .map(s => s.trim())
                .filter(s => s && s.toLowerCase() !== 'n/a' && s.length > 1);
            sources.forEach(source => {
                let norm = source;
                if (norm.toLowerCase().includes('crate')) norm = 'Crates';
                else if (norm.toLowerCase().includes('shop')) norm = 'Shop';
                else if (norm.toLowerCase().includes('admin')) norm = 'Admin';
                else if (norm.toLowerCase().includes('gift') || norm.toLowerCase().includes('festive')) norm = 'Event/Gift';
                else if (norm.toLowerCase().includes('craft')) norm = 'Crafting';
                else if (norm.toLowerCase().includes('.roll')) norm = 'Command';
                commonSources.add(norm);
            });
        });

        const sortedSources = [...commonSources].sort();
        obtainabilityFilter.innerHTML = '<option value="all">All</option>';
        sortedSources.forEach(source => {
            const opt = document.createElement('option');
            opt.value = source;
            opt.textContent = source;
            obtainabilityFilter.appendChild(opt);
        });

        const advLoader = advObtainFiltersContainer.querySelector('.loading-indicator') || advObtainFiltersContainer.querySelector('p');
        if(advLoader) advLoader.remove();
        advObtainFiltersContainer.innerHTML = '';
        sortedSources.forEach(source => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" name="adv-obtain" value="${source}"> ${source}`;
            advObtainFiltersContainer.appendChild(label);
        });
    }

    function displayItems(items) {
        if(!itemGrid) return;
        itemGrid.innerHTML = '';

        if (items.length === 0) {
            itemGrid.innerHTML = '<p class="no-results" style="grid-column: 1 / -1; text-align: center;">No items match criteria.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const card = createItemCard(item);
            fragment.appendChild(card);
        });
        itemGrid.appendChild(fragment);

        anime({
            targets: '.item-card',
            opacity: [0, 1],
            translateY: [15, 0],
            scale: [0.98, 1],
            delay: anime.stagger(10, {start: 20}),
            duration: 250,
            easing: 'easeOutQuad'
        });
    }

    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.rarity = item.rarity;
        card.style.setProperty('--rarity-color', `var(--rarity-${item.rarity?.toLowerCase() || 'common'})`);

        const imgContainer = document.createElement('div');
        imgContainer.className = 'item-image-container';

        const img = document.createElement('img');
        const imgPath = `imgs/images/${item.name.replace(/#/g, '_')}.png`;
        console.log(`Trying image path for item card: ${imgPath}`);
        img.src = imgPath;
        img.alt = item.name;
        img.onload = () => console.log(`Loaded image for ${item.name}: ${imgPath}`);
        img.onerror = () => {
            console.warn(`XImage not found for ${item.name} at ${imgPath}`);
            img.style.display = 'none';
        };
        imgContainer.appendChild(img);

        card.appendChild(imgContainer);

        const isSpecialValue = item.value === "Owner's choice" || item.value === "???";
        const valueClass = isSpecialValue ? (item.value === "???" ? 'unknown' : 'owner-choice') : '';

        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'add-favorite-btn';
        favoriteBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
        favoriteBtn.title = 'Add to Favorites';
        favoriteBtn.dataset.itemId = item.id;

        if (favoritesList.includes(item.id)) {
            favoriteBtn.classList.add('selected');
            favoriteBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
            favoriteBtn.title = 'Remove from Favorites';
        }

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoriteItem(item.id, favoriteBtn);
        });

        const demandIconText = getStatusIcon(item.demand, 'demand');
        const stabilityIconText = getStatusIcon(item.stability, 'stability');
        const obtainabilityText = item.obtainability || 'N/A';

        card.innerHTML += `
            <div class="item-card-content">
                <div class="item-card-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-rarity">${item.rarity}</span>
                </div>
                <div class="item-details">
                    <span class="item-value ${valueClass}">${formatValue(item.value)}</span>
                    ${
                        !isSpecialValue
                            ? `<span class="item-range">Range: ${item.range}</span>`
                            : ''
                    }
                </div>
            </div>
            <div class="item-market-info">
                <span class="info-chip demand-${item.demand?.toLowerCase().replace(/\s+/g, '-') || 'na'}" data-tooltip-type="demand" data-tooltip-term="${item.demand}">
                    <span class="icon icon-demand">${demandIconText}</span>
                    ${item.demand || 'N/A'}
                </span>
                <span class="info-chip stability-${item.stability?.toLowerCase().replace(/\s+/g, '-') || 'na'}" data-tooltip-type="stability" data-tooltip-term="${item.stability}">
                    <span class="icon icon-stability">${stabilityIconText}</span>
                    ${item.stability || 'N/A'}
                </span>
                <span class="item-obtainability" title="${obtainabilityText}">${obtainabilityText}</span>
            </div>
        `;

        card.appendChild(favoriteBtn);

        card.querySelectorAll('.info-chip').forEach(chip => {
            chip.addEventListener('mouseenter', showTooltip);
            chip.addEventListener('mouseleave', hideTooltip);
        });

        card.addEventListener('click', () => {
            openItemDetailModal(item.id);
        });

        return card;
    }

    function createFavoriteCard(item) {
        const card = document.createElement('div');
        card.className = 'favorite-item-card';
        card.dataset.rarity = item.rarity;
        card.style.setProperty('--rarity-color', `var(--rarity-${item.rarity?.toLowerCase() || 'common'})`);

        const imgContainer = document.createElement('div');
        imgContainer.className = 'item-image-container';

        const img = document.createElement('img');
        const imgPath = `imgs/images/${item.name.replace(/#/g, '_')}.png`;
        console.log(`Trying image path for favorite card: ${imgPath}`);
        img.src = imgPath;
        img.alt = item.name;
        img.onload = () => console.log(`Loaded favorite image for ${item.name}: ${imgPath}`);
        img.onerror = () => {
            console.warn(`Favorite image not found for ${item.name} at ${imgPath}`);
            img.style.display = 'none';
        };
        imgContainer.appendChild(img);

        card.appendChild(imgContainer);

        const isSpecialValue = item.value === "Owner's choice" || item.value === "???";
        const valueClass = isSpecialValue ? (item.value === "???" ? 'unknown' : 'owner-choice') : '';

        const demandIcon = getStatusIcon(item.demand, 'demand');
        const stabilityIcon = getStatusIcon(item.stability, 'stability');

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-favorite-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.title = 'Remove from Favorites';
        removeBtn.dataset.itemId = item.id;
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavoriteItem(item.id);
        });

        card.innerHTML += `
            <div class="favorite-card-content">
                <div class="favorite-card-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-rarity">${item.rarity}</span>
                </div>
                <div class="item-details">
                    <span class="item-value ${valueClass}">${formatValue(item.value)}</span>
                    ${
                        !isSpecialValue
                            ? `<span class="item-range">Range: ${item.range}</span>`
                            : ''
                    }
                </div>
                <div class="item-market-info">
                    <span class="info-chip demand-${item.demand?.toLowerCase().replace(/\s+/g, '-') || 'na'}">
                        <span class="icon icon-demand">${demandIcon}</span>
                        ${item.demand || 'N/A'}
                    </span>
                    <span class="info-chip stability-${item.stability?.toLowerCase().replace(/\s+/g, '-') || 'na'}">
                        <span class="icon icon-stability">${stabilityIcon}</span>
                        ${item.stability || 'N/A'}
                    </span>
                </div>
                <div class="item-obtainability" title="${item.obtainability}">
                    ${item.obtainability || 'N/A'}
                </div>
            </div>
        `;

        card.appendChild(removeBtn);
        
        card.addEventListener('click', () => {
            openItemDetailModal(item.id);
            if(favoritesOverlay) favoritesOverlay.classList.remove('visible');
        });

        return card;
    }

    function createDetailCard(item) {
        const card = document.createElement('div');
        card.className = 'item-detail-card';
        card.style.setProperty('--rarity-color', `var(--rarity-${item.rarity?.toLowerCase() || 'common'})`);

        const imgContainer = document.createElement('div');
        imgContainer.className = 'item-image-container';

        const img = document.createElement('img');
        const imgPath = `imgs/images/${item.name.replace(/#/g, '_')}.png`;
        console.log(`Trying image path for detail card: ${imgPath}`);
        img.src = imgPath;
        img.alt = item.name;
        img.onload = () => console.log(`Loaded detail image for ${item.name}: ${imgPath}`);
        img.onerror = () => {
            console.warn(`Detail image not found for ${item.name} at ${imgPath}`);
            img.style.display = 'none';
        };
        imgContainer.appendChild(img);

        card.appendChild(imgContainer);

        const isSpecialValue = item.value === "Owner's choice" || item.value === "???";
        const valueClass = isSpecialValue ? (item.value === "???" ? 'unknown' : 'owner-choice') : '';

        const demandIconText = getStatusIcon(item.demand, 'demand');
        const stabilityIconText = getStatusIcon(item.stability, 'stability');
        const obtainabilityText = item.obtainability || 'N/A';
        
        // Create favorite button
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'item-detail-favorite-btn';
        favoriteBtn.dataset.itemId = item.id;
        
        // Check if this item is in favorites
        const isFavorite = favoritesList.includes(item.id);
        if (isFavorite) {
            favoriteBtn.classList.add('selected');
            favoriteBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
            favoriteBtn.title = 'Remove from Favorites';
        } else {
            favoriteBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
            favoriteBtn.title = 'Add to Favorites';
        }
        
        // Add event listener for toggling favorite status
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoriteItem(item.id, favoriteBtn);
        });

        card.innerHTML += `
            <div class="item-card-header">
                <span class="item-name">${item.name}</span>
                <span class="item-rarity">${item.rarity}</span>
            </div>
            <div class="item-details">
                <span class="item-value ${valueClass}">${formatValue(item.value)}</span>
                ${
                    !isSpecialValue
                        ? `<span class="item-range">Range: ${item.range}</span>`
                        : ''
                }
            </div>
            <div class="item-market-info">
                <span class="info-chip demand-${item.demand?.toLowerCase().replace(/\s+/g, '-') || 'na'}" data-tooltip-type="demand" data-tooltip-term="${item.demand}">
                    <span class="icon icon-demand">${demandIconText}</span>
                    ${item.demand || 'N/A'}
                </span>
                <span class="info-chip stability-${item.stability?.toLowerCase().replace(/\s+/g, '-') || 'na'}" data-tooltip-type="stability" data-tooltip-term="${item.stability}">
                    <span class="icon icon-stability">${stabilityIconText}</span>
                    ${item.stability || 'N/A'}
                </span>
            </div>
            <div class="item-obtainability" title="${obtainabilityText}">Obtained via: ${obtainabilityText}</div>
        `;

        card.appendChild(favoriteBtn);

        card.querySelectorAll('.info-chip').forEach(chip => {
            chip.addEventListener('mouseenter', showTooltip);
            chip.addEventListener('mouseleave', hideTooltip);
        });

        return card;
    }

    function getRarityIconClass(rarity) {
        switch (rarity?.toLowerCase()) {
            case 'contraband': return 'fa-skull-crossbones';
            case 'mythical':   return 'fa-wand-sparkles';
            case 'legendary':  return 'fa-star';
            case 'unique':     return 'fa-gem';
            case 'epic':       return 'fa-bolt';
            case 'rare':       return 'fa-clover';
            case 'common':     return 'fa-cube';
            case 'stock':      return 'fa-box-open';  // Changed from fa-coins to fa-box-open
            default:           return 'fa-question-circle';
        }
    }

    function formatValue(value) {
        if (value === "Owner's choice" || value === "???") return value;
        const num = parseInt(value.replace(/[,"]/g, ''), 10);
        return !isNaN(num) ? num.toLocaleString('en-US') : value;
    }

    function getStatusIcon(status, type) {
        const s = status?.toLowerCase() || 'na';
        if (type === 'demand') {
            switch(s) {
                case 'high':    return '▲';
                case 'medium':  return '▶';
                case 'normal':  return '●';
                case 'low':     return '▼';
                default:        return '-';
            }
        } else if (type === 'stability') {
            switch(s) {
                case 'rising':    return '↗';
                case 'stable':    return '↔';
                case 'unstable':  return '?';
                case 'declining': return '↘';
                default:          return '-';
            }
        }
        return '-';
    }

    function getTooltipText(type, term) {
        if (!term || term === 'N/A' || !type || !tooltip) return null;
        const cleanTerm = term.trim().toLowerCase();
        const category = guideData[type.toLowerCase()];
        if (category && Array.isArray(category)) {
            const item = category.find(g => g.term.trim().toLowerCase() === cleanTerm);
            if(item) {
                return `${item.term}: ${item.definition}`;
            } else {
                return `${term}: Definition unavailable`;
            }
        } else {
            return null;
        }
    }

    function populateGuide() {
        const populateCategory = (element, categoryName) => {
            if (!element) return;
            const loader = element.querySelector('.loading-indicator');
            if (loader) loader.style.display = 'none';
            element.innerHTML = '';

            const categoryData = guideData[categoryName.toLowerCase()];
            if (!categoryData || categoryData.length === 0) {
                element.innerHTML = '<p class="no-results">Definitions unavailable.</p>';
                return;
            }

            const fragment = document.createDocumentFragment();
            categoryData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'guide-item';
                const iconText = getStatusIcon(item.term, categoryName.toLowerCase());
                const iconClass = `${categoryName.toLowerCase()}-${item.term.toLowerCase().replace(/\s+/g, '-')}`;

                let iconColorVar = '--color-text-muted';
                if(categoryName === 'stability') iconColorVar = '--rarity-rare';
                else if (categoryName === 'demand') iconColorVar = '--rarity-legendary';
                else if (categoryName === 'value') iconColorVar = '--rarity-unique';

                div.innerHTML = `
                    <strong><span class="icon ${iconClass}" style="color: var(${iconColorVar})">${iconText}</span> ${item.term}</strong>
                    <span>${item.definition}</span>
                `;
                fragment.appendChild(div);
            });
            element.appendChild(fragment);
        };

        populateCategory(stabilityGuideEl, 'stability');
        populateCategory(demandGuideEl, 'demand');
        populateCategory(valueGuideEl, 'value');
        populateCategory(document.getElementById('fusion-guide'), 'fusion');
    }

    function populateInfoNodes() {
        if(!infoNodeContainer) return;
        infoNodeContainer.innerHTML = '';

        const nodeData = [
            {
                id: 'welcome',
                iconClass: 'fa-solid fa-circle-info',
                text: 'Mission',
                content: `<h3><i class="fa-solid fa-circle-info"></i> Mission Brief</h3><p>${infoData.welcome || 'Welcome message unavailable.'}</p>`
            },
            {
                id: 'disclaimers',
                iconClass: 'fa-solid fa-triangle-exclamation',
                text: 'Disclaimers',
                content: `<h3><i class="fa-solid fa-triangle-exclamation"></i> Game Owner Disclaimers</h3>
                          <div class="disclaimer-text">${infoData.ownerDisclaimer || 'Disclaimers unavailable.'}</div>`
            },
            {
                id: 'contact',
                iconClass: 'fa-solid fa-envelope',
                text: 'Contact',
                content: `<h3><i class="fa-solid fa-envelope"></i> Contact & Links</h3>
                          <p>${infoData.contactNote || ''}</p>
                          <p>${infoData.discordNote || ''}</p>`
            },
            {
                id: 'creators',
                iconClass: 'fa-solid fa-users',
                text: 'Creators',
                content: generateCreatorsHTML()
            }
        ];

        // Position nodes in the four corners pattern
        // Using a square pattern with consistent radius
        const positions = [
            { angle: -Math.PI * 0.75, radius: 75 }, // Mission (top-left)
            { angle: -Math.PI * 0.25, radius: 75 }, // Disclaimers (top-right)
            { angle: Math.PI * 0.75, radius: 75 },  // Contact (bottom-left)
            { angle: Math.PI * 0.25, radius: 75 }   // Creators (bottom-right)
        ];
        
        nodeData.forEach((nodeInfo, index) => {
            const { angle, radius } = positions[index];
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);

            const node = document.createElement('div');
            node.className = 'info-node';
            node.style.left = `${x}%`;
            node.style.top = `${y}%`;
            node.style.transform = `translate(-50%, -50%)`;

            node.innerHTML = `
                <span class="node-icon"><i class="${nodeInfo.iconClass}"></i></span>
                <span class="node-text">${nodeInfo.text}</span>
            `;

            node.addEventListener('click', (e) => {
                e.stopPropagation();
                displayPopup(nodeInfo.content);
            });

            infoNodeContainer.appendChild(node);

            anime({
                targets: node,
                scale: [0, 1],
                opacity: [0, 1],
                delay: 300 + index * 100,
                duration: 500,
                easing: 'easeOutExpo'
            });
        });
    }

    function generateCreatorsHTML() {
        let html = `<h3><i class="fa-solid fa-users"></i> Project Development Team</h3>`;
        html += '<div class="creators-list">';
        
        // ULM and trevor16 together in the same blue box
        html += `<p class="primary-creator"><span class="creator-role">Site Design & Development:</span> <strong>ULM Labs</strong><br><span>Discord:</span> <strong>trevor16</strong></p>`;
        html += `<div class="secondary-creators">`;
        html += `<p class="sub-heading">Value List Contributors:</p>`;
        html += `<p><span>Discord:</span> trevor16</p>`;
        html += `<p><span>Roblox:</span> My14thAddction</p>`;
        html += `<p><span>Roblox:</span> VEN_0MS</p>`;
        html += `<p><span>Discord:</span> iwokeup2moody</p>`;
        html += `<p><span>Discord:</span> framw</p>`;
        html += `</div>`;
        html += '</div>';
        
        if (infoData.contactNote) {
            html += `<p style="margin-top: 1rem; font-style: italic;">${infoData.contactNote}</p>`;
        }
        if (infoData.discordNote) {
            html += `<p style="font-style: italic;">${infoData.discordNote}</p>`;
        }
        return html;
    }
    function displayPopup(contentHTML) {
        const existingPopup = document.querySelector('.node-content-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.className = 'node-content-popup';
        popup.innerHTML = `
            ${contentHTML}
            <button class="close-popup"><i class="fa-solid fa-xmark"></i></button>
        `;
        document.body.appendChild(popup);

        let closePopupHandler;
        let clickOutsideHandler;

        closePopupHandler = () => {
            document.removeEventListener('click', clickOutsideHandler, true);
            popup.classList.remove('visible');
            setTimeout(() => {
                if (popup.parentNode) popup.remove();
            }, 300);
        };

        clickOutsideHandler = (event) => {
            if (!popup.contains(event.target)) closePopupHandler();
        };

        setTimeout(() => {
            document.addEventListener('click', clickOutsideHandler, true);
        }, 0);

        requestAnimationFrame(() => popup.classList.add('visible'));
        popup.querySelector('.close-popup').addEventListener('click', closePopupHandler);
        popup.addEventListener('click', (e) => e.stopPropagation());
    }

    // Uses hardcoded allUpdates data with fuzzy search
    function populateTimeline() {
        if (!timelineEventsEl) {
            console.warn("Timeline events element not found");
            return;
        }
        const loader = timelineEventsEl.querySelector('.loading-indicator');
        if (loader) loader.style.display = 'none';
        timelineEventsEl.innerHTML = '';

        if (!allUpdates || allUpdates.length === 0) {
            timelineEventsEl.innerHTML = '<p class="no-results" style="text-align: center;">No update history found.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        allUpdates.forEach((eventData, index) => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'timeline-event';
            eventDiv.style.setProperty('--i', index);

            let changesHTML = '';
            eventData.changes.forEach(change => {
                let changeClass = 'neutral';
                let arrow = '<i class="fa-solid fa-minus"></i>';
                let detailHTML = '';
                let itemInfo = null;
                let itemNameForLink = null;

                if (change.type === 'value' || change.type === 'other') {
                    itemNameForLink = change.item;
                    // Use fuzzy search here
                    itemInfo = findItemFuzzy(itemNameForLink);
                } else if (change.type === 'note' && change.action === 'Added' && !change.detail.includes('page') && !change.detail.includes('(oops)')) {
                    itemNameForLink = cleanItemName(change.detail);
                    // Use fuzzy search here too
                    itemInfo = findItemFuzzy(itemNameForLink);
                }

                const rarityAttr = itemInfo ? `data-rarity="${itemInfo.rarity}"` : '';
                const rarityStyle = itemInfo ? `style="--rarity-color: var(--rarity-${itemInfo.rarity.toLowerCase()})"` : '';

                if (change.type === 'value') {
                    const oldValue = parseInt(change.old?.replace(/,/g, ''), 10);
                    const newValue = parseInt(change.new?.replace(/,/g, ''), 10);

                    if (!isNaN(oldValue) && !isNaN(newValue)) {
                        if (newValue > oldValue) {
                            changeClass = 'increase';
                            arrow = '<i class="fa-solid fa-caret-up"></i>';
                        } else if (newValue < oldValue) {
                            changeClass = 'decrease';
                            arrow = '<i class="fa-solid fa-caret-down"></i>';
                        } else {
                            arrow = '<i class="fa-solid fa-arrows-left-right"></i>';
                        }
                    } else {
                        arrow = '<i class="fa-solid fa-arrow-right"></i>';
                    }
                    
                    // Calculate difference and percentage for the new format
                    const difference = newValue - oldValue;
                    
                    // Cap percentChange at 99.9% for massive decreases/increases
                    let percentChange = oldValue > 0 ? Math.round((difference / oldValue) * 100) : 0;
                    if (Math.abs(percentChange) >= 100) {
                        percentChange = percentChange > 0 ? 99.9 : -99.9;
                    }
                    
                    const changePrefix = difference >= 0 ? '+' : '-';
                    const absDifference = Math.abs(difference);
                    
                    detailHTML = `
                        <strong class="timeline-item-link" data-item-id="${itemInfo?.id || ''}" ${rarityAttr} ${rarityStyle}>
                            <i class="fa-solid fa-gem"></i> ${itemNameForLink}:
                        </strong>
                        <div class="change-details">
                            <span class="value-difference ${changeClass}">${changePrefix}${absDifference}</span>
                            <span class="value-range">${change.old} → ${change.new}</span>
                            <span class="value-percentage ${changeClass}">${difference >= 0 ? '' : '-'}${Math.abs(percentChange)}%</span>
                        </div>
                    `;
                } else if (change.type === 'note') {
                    detailHTML = `
                        <strong ${itemInfo
                            ? `class="timeline-item-link" data-item-id="${itemInfo.id}" ${rarityAttr} ${rarityStyle}`
                            : ''
                        }>
                            <i class="fa-solid fa-circle-info"></i> ${change.action}:
                        </strong> ${change.detail}
                    `;
                    changeClass = 'neutral';
                    arrow = '<i class="fa-solid fa-plus"></i>';
                } else if (change.type === 'other') {
                    detailHTML = `
                        <strong class="timeline-item-link" data-item-id="${itemInfo?.id || ''}" ${rarityAttr} ${rarityStyle}>
                            <i class="fa-solid fa-circle-info"></i> ${itemNameForLink}:
                        </strong> ${change.detail}
                    `;
                    changeClass = 'neutral';
                } else {
                    detailHTML = change.raw || '';
                    changeClass = 'neutral';
                }

                changesHTML += `<div class="event-change ${changeClass}">${detailHTML}</div>`;
            });

            eventDiv.innerHTML = `
                <span class="event-date">${eventData.date}</span>
                <div class="event-changes-container">
                    ${changesHTML}
                </div>
            `;
            fragment.appendChild(eventDiv);
        });

        timelineEventsEl.appendChild(fragment);

        timelineEventsEl.querySelectorAll('.timeline-item-link').forEach(link => {
            link.addEventListener('click', handleTimelineItemClick);
        });
        
        // Initialize mobile features - Now called directly here
        initMobileFeatures();
    }

    // --- Tooltips ---
    function showTooltip(event) {
        if (!tooltip) return;
        const element = event.currentTarget;
        const type = element.dataset.tooltipType;
        const term = element.dataset.tooltipTerm;
        const text = getTooltipText(type, term);
        if (!text) {
            hideTooltip();
            return;
        }

        tooltip.textContent = text;
        tooltip.style.display = 'block';

        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        let top = elementRect.top + scrollY - tooltipRect.height - 8;
        let left = elementRect.left + scrollX + (elementRect.width / 2) - (tooltipRect.width / 2);

        if (left < scrollX + 5) left = scrollX + 5;
        if (left + tooltipRect.width > window.innerWidth + scrollX - 5) {
            left = window.innerWidth + scrollX - tooltipRect.width - 5;
        }
        if (top < scrollY + 5) {
            top = elementRect.bottom + scrollY + 8;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        requestAnimationFrame(() => tooltip.classList.add('visible'));
    }

    function hideTooltip() {
        if(tooltip) tooltip.classList.remove('visible');
    }

    // --- Favorites Functionality ---
    function toggleFavoriteItem(itemId, buttonElement) {
        if (!itemId) {
            console.error("Attempted to toggle favorite with invalid itemId");
            return;
        }
        
        // Ensure favoritesList is an array
        if (!Array.isArray(favoritesList)) {
            console.error("favoritesList is not an array, resetting");
            favoritesList = [];
        }
        
        const index = favoritesList.indexOf(itemId);
        if (index > -1) {
            // Remove from favorites
            favoritesList.splice(index, 1);
            console.log(`Removed ${itemId} from favorites`);
            
            // Update button if provided
            if (buttonElement) {
                buttonElement.classList.remove('selected');
                buttonElement.innerHTML = '<i class="fa-regular fa-star"></i>';
                buttonElement.title = 'Add to Favorites';
            }
        } else {
            // Add to favorites
            favoritesList.push(itemId);
            console.log(`Added ${itemId} to favorites`);
            
            // Update button if provided
            if (buttonElement) {
                buttonElement.classList.add('selected');
                buttonElement.innerHTML = '<i class="fa-solid fa-star"></i>';
                buttonElement.title = 'Remove from Favorites';
            }
        }
        
        // Update all UI elements
        updateFavoritesUI();
        saveFavoritesToStorage();
    }

    function updateFavoritesUI() {
        // Ensure we have a valid favorites list
        if (!Array.isArray(favoritesList)) {
            console.error("favoritesList is not an array in updateFavoritesUI");
            favoritesList = [];
        }
        
        const count = favoritesList.length;
        console.log(`Updating favorites UI with ${count} items`);
        
        // Update counter
        if (favoritesCountSpan) {
            favoritesCountSpan.textContent = count;
        }
        
        // Update favorites button
        if (favoritesButton) {
            favoritesButton.disabled = count === 0;
        }
        
        // Update all favorite buttons on items in the main item grid
        document.querySelectorAll('.add-favorite-btn').forEach(btn => {
            const itemId = btn.dataset.itemId;
            const isFavorite = favoritesList.includes(itemId);
            
            btn.classList.toggle('selected', isFavorite);
            btn.innerHTML = isFavorite ? 
                '<i class="fa-solid fa-star"></i>' : 
                '<i class="fa-regular fa-star"></i>';
            btn.title = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
        });
        
        // Update detail view favorite button if modal is open
        document.querySelectorAll('.item-detail-favorite-btn').forEach(btn => {
            const itemId = btn.dataset.itemId;
            const isFavorite = favoritesList.includes(itemId);
            
            btn.classList.toggle('selected', isFavorite);
            btn.innerHTML = isFavorite ? 
                '<i class="fa-solid fa-star"></i>' : 
                '<i class="fa-regular fa-star"></i>';
            btn.title = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
        });
        
        // Update favorites overlay if visible
        if (favoritesOverlay && favoritesOverlay.classList.contains('visible')) {
            populateFavoritesOverlay();
        }
    }

    function populateFavoritesOverlay() {
        if(!favoritesItemsContainer) return;
        favoritesItemsContainer.innerHTML = '';

        if (favoritesList.length === 0) {
            favoritesItemsContainer.innerHTML = '<p class="no-favorites-message">No favorites selected. Add items to your favorites by clicking the star icon on any item card.</p>';
            if(clearFavoritesButton) clearFavoritesButton.style.display = 'none';
            return;
        }

        if(clearFavoritesButton) clearFavoritesButton.style.display = 'block';

        favoritesList.forEach(itemId => {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
                const favoriteCard = createFavoriteCard(item);
                favoritesItemsContainer.appendChild(favoriteCard);
            }
        });
    }

    function removeFavoriteItem(itemId) {
        const index = favoritesList.indexOf(itemId);
        if (index > -1) {
            favoritesList.splice(index, 1);
            updateFavoritesUI();
            saveFavoritesToStorage();
        }
    }
    
    function clearAllFavorites() {
        if (favoritesList.length === 0) return;
        
        showConfirmationModal(() => {
            favoritesList = [];
            updateFavoritesUI();
            saveFavoritesToStorage();
            hideConfirmationModal();
        });
    }
    
    function showConfirmationModal(onConfirm) {
        if (!confirmationModal) return;
        
        // Store the callback function for later use
        confirmActionBtn.onclick = onConfirm;
        
        // Show the modal with animation
        confirmationModal.classList.add('visible');
        
        // Add subtle entrance animation for the modal content
        anime({
            targets: '.confirmation-icon',
            scale: [0.5, 1],
            opacity: [0, 1],
            duration: 400,
            easing: 'easeOutBack'
        });
        
        // Set up escape key to cancel
        document.addEventListener('keydown', handleConfirmEscapeKey);
    }
    
    function hideConfirmationModal() {
        if (!confirmationModal) return;
        confirmationModal.classList.remove('visible');
        document.removeEventListener('keydown', handleConfirmEscapeKey);
    }
    
    function handleConfirmEscapeKey(e) {
        if (e.key === 'Escape') {
            hideConfirmationModal();
        }
    }

    // --- Navigation & Transition Logic ---
    function switchSection(targetSectionId) {
        if (targetSectionId === currentSection || isTransitioning) return;
        isTransitioning = true;

        const currentActiveSection = document.getElementById(currentSection);
        const targetSection = document.getElementById(targetSectionId);

        const currentActiveButton = document.querySelector(`.nav-button[data-section="${currentSection}"]`);
        const targetButton = document.querySelector(`.nav-button[data-section="${targetSectionId}"]`);

        if (nexusCtaButton) {
            nexusCtaButton.style.display = (targetSectionId === 'info-hub') ? 'inline-block' : 'none';
        }

        // Apply transition-out class to current section
        if (currentActiveSection) {
            currentActiveSection.classList.add('transitioning-out');
            currentActiveSection.classList.remove('active');
        }
        if (currentActiveButton) currentActiveButton.classList.remove('active');
        if (targetButton) targetButton.classList.add('active');

        // Use a shorter transition time for smoother switching
        setTimeout(() => {
            if (currentActiveSection) {
                currentActiveSection.style.display = 'none';
                currentActiveSection.classList.remove('transitioning-out');
            }
            
            // Make target section visible first, then add active class for animation
            if (targetSection) {
                targetSection.style.display = 'flex';
                
                // Force browser to recognize the display change before adding the active class
                void targetSection.offsetWidth; // Trigger reflow
                
                requestAnimationFrame(() => {
                    targetSection.classList.add('active');
                });
            }
            
            currentSection = targetSectionId;
            isTransitioning = false;
            
            // If switching to update-log and we're on mobile, generate the mobile timeline
            if (targetSectionId === 'update-log' && window.innerWidth <= 768) {
                setTimeout(() => {
                    if (allItems && allItems.length > 0) {
                        createMobileTimeline();
                    } else {
                        console.log("Waiting for items to load before creating mobile timeline...");
                        // We'll create the timeline after data is loaded
                    }
                }, 100);
            }
        }, 200);

        const existingPopup = document.querySelector('.node-content-popup.visible');
        if (existingPopup) {
            existingPopup.classList.remove('visible');
            setTimeout(() => {
                if(existingPopup.parentNode) existingPopup.remove();
            }, 200);
        }
    }

    // --- Handle Clicking Item in Timeline or Grid ---
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

    // --- Item Detail Modal Logic ---
    function openItemDetailModal(itemId) {
        const item = allItems.find(i => i.id === itemId);
        if (!item || !itemDetailModal || !itemDetailCardContainer) return;

        itemDetailCardContainer.innerHTML = '<div class="loading-indicator">Loading...</div>';

        const detailCard = createDetailCard(item);
        itemDetailCardContainer.innerHTML = '';
        itemDetailCardContainer.appendChild(detailCard);

        itemDetailModal.classList.add('visible');
    }

    function closeItemDetailModal() {
        if(itemDetailModal) itemDetailModal.classList.remove('visible');
    }

    // --- Advanced Filter Modal Logic ---
    function openAdvancedFilters() {
        if (!advancedFilterOverlay) return;
        populateAdvancedFilterCheckboxes();
        advancedFilterOverlay.classList.add('visible');
    }

    function closeAdvancedFilters() {
        if (advancedFilterOverlay) advancedFilterOverlay.classList.remove('visible');
    }

    function populateAdvancedFilterCheckboxes() {
        document.querySelectorAll('#adv-obtain-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = currentAdvancedFilters.obtainability.includes(cb.value);
        });
        document.querySelectorAll('#adv-demand-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = currentAdvancedFilters.demand.includes(cb.value);
        });
        document.querySelectorAll('#adv-stability-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = currentAdvancedFilters.stability.includes(cb.value);
        });
    }

    function applyAdvancedFilters() {
        currentAdvancedFilters.obtainability = Array.from(document.querySelectorAll('#adv-obtain-filters input:checked')).map(cb => cb.value);
        currentAdvancedFilters.demand = Array.from(document.querySelectorAll('#adv-demand-filters input:checked')).map(cb => cb.value);
        currentAdvancedFilters.stability = Array.from(document.querySelectorAll('#adv-stability-filters input:checked')).map(cb => cb.value);

        // Reset basic if advanced is used
        if (currentAdvancedFilters.obtainability.length > 0 && obtainabilityFilter) {
            obtainabilityFilter.value = 'all';
        }

        closeAdvancedFilters();
        applyFiltersAndSort();
    }

    function resetAdvancedFilters() {
        currentAdvancedFilters.obtainability = [];
        currentAdvancedFilters.demand = [];
        currentAdvancedFilters.stability = [];

        document.querySelectorAll('#advanced-filter-overlay input[type="checkbox"]').forEach(cb => cb.checked = false);
        checkFilterStates();
    }

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