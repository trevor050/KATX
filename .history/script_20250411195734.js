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

// Utility debounce function - ADDED BACK
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
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

let isMobileView = window.innerWidth <= 768; // Initialize based on initial width

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- DOMContentLoaded START ---'); // LOG: DOMContentLoaded Entry
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
*/

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