// TravelIntell Application Logic

document.addEventListener("DOMContentLoaded", () => {
    // STATE MANAGERS
    let toursData = [];
    let activeSeason = null;
    let activeSegment = "all";
    let activeRegion = "all";
    let activeDuration = "all";
    let activePersona = "traveler"; // "traveler" or "executive"
    let currentSelectedTour = null;
    let activeView = "discovery"; // "discovery" or "agent"
    let linkedTourContext = null; // Currently linked tour for FlyAgent
    let chatHistory = []; // Message history array [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]

    // DOM ELEMENTS
    const seasonsGrid = document.getElementById("seasons-grid");
    const searchInput = document.getElementById("search-input");
    const segmentPills = document.querySelectorAll(".segment-pills .pill");
    const regionSelect = document.getElementById("region-select");
    const durationSelect = document.getElementById("duration-select");
    const btnResetFilters = document.getElementById("btn-reset-filters");
    
    const toursGrid = document.getElementById("tours-grid");
    const loader = document.getElementById("loader");
    const emptyState = document.getElementById("empty-state");
    const tourCountLabel = document.getElementById("tour-count");
    const activeSeasonLabel = document.getElementById("active-season-label");

    // Persona buttons & Theme Switcher
    const btnTraveler = document.getElementById("btn-traveler");
    const btnExecutive = document.getElementById("btn-executive");
    const themeToggleBtn = document.getElementById("theme-toggle-btn");

    // Application View Switcher
    const viewTabDiscovery = document.getElementById("view-tab-discovery");
    const viewTabPlanner = document.getElementById("view-tab-planner");
    const viewTabAgent = document.getElementById("view-tab-agent");
    const viewDiscovery = document.getElementById("view-discovery");
    const viewPlanner = document.getElementById("view-planner");
    const viewAgent = document.getElementById("view-agent");

    // AI Itinerary Planner DOM Elements
    const plannerStart = document.getElementById("planner-start");
    const plannerDest = document.getElementById("planner-dest");
    const plannerDays = document.getElementById("planner-days");
    const plannerThemesContainer = document.getElementById("planner-themes-container");
    const themeSelectedCount = document.getElementById("theme-selected-count");
    const btnGenerateItinerary = document.getElementById("btn-generate-itinerary");
    const plannerResultsSection = document.getElementById("planner-results-section");
    const plannerResultsRoute = document.getElementById("planner-results-route");
    const resultsThemeBadge = document.getElementById("results-theme-badge");
    const plannerTimeline = document.getElementById("planner-timeline");
    const btnWhatsappShare = document.getElementById("btn-whatsapp-share");

    // Flowchart View DOM Elements
    const btnShowFlowchart = document.getElementById("btn-show-flowchart");
    const btnShowTimeline = document.getElementById("btn-show-timeline");
    const plannerFlowchartWrapper = document.getElementById("planner-flowchart-wrapper");
    const plannerFlowchartCanvas = document.getElementById("planner-flowchart-canvas");
    const flowchartNodesTree = document.getElementById("flowchart-nodes-tree");
    const flowchartSvgConnectors = document.getElementById("flowchart-svg-connectors");

    // Place Details Side Pop-Up Panel Elements (img2 design)
    const placePopupBackdrop = document.getElementById("place-popup-backdrop");
    const placePopupDrawer = document.getElementById("place-popup-drawer");
    const placePopupCloseBtn = document.getElementById("place-popup-close-btn");
    const btnPlaceClose = document.getElementById("btn-place-close");
    const placePopupDayTag = document.getElementById("place-popup-day-tag");
    const placePopupCategoryTag = document.getElementById("place-popup-category-tag");
    const placePopupTitle = document.getElementById("place-popup-title");
    const placePopupLocationText = document.getElementById("place-popup-location-text");
    const placePopupDesc = document.getElementById("place-popup-desc");
    const placePopupActivities = document.getElementById("place-popup-activities");
    const placePopupGallery = document.getElementById("place-popup-gallery");

    // Slide-over Sheet Elements
    const detailSheet = document.getElementById("detail-sheet");
    const sheetBackdrop = document.getElementById("sheet-backdrop");
    const sheetCloseBtn = document.getElementById("sheet-close-btn");
    
    const sheetSegment = document.getElementById("sheet-segment");
    const sheetRegion = document.getElementById("sheet-region");
    const sheetTitle = document.getElementById("sheet-title");
    const sheetDuration = document.getElementById("sheet-duration");
    const sheetPrice = document.getElementById("sheet-price");
    const sheetSeasons = document.getElementById("sheet-seasons");
    const sheetHeroImage = document.getElementById("sheet-hero-image");
    const sheetWarningsContainer = document.getElementById("sheet-warnings-container");
    const sheetWarningsList = document.getElementById("sheet-warnings-list");
    const sheetTimeline = document.getElementById("sheet-timeline");
    const sheetInclusions = document.getElementById("sheet-inclusions");
    const sheetExclusions = document.getElementById("sheet-exclusions");
    const btnLoadInAgent = document.getElementById("btn-load-in-agent");

    // Marketing Tab Elements
    const tabItinerary = document.getElementById("tab-itinerary");
    const tabMarketing = document.getElementById("tab-marketing");
    const panelItinerary = document.getElementById("panel-itinerary");
    const panelMarketing = document.getElementById("panel-marketing");
    const toneSelect = document.getElementById("tone-select");
    const marketingCaption = document.getElementById("marketing-caption");
    const marketingHashtags = document.getElementById("marketing-hashtags");
    const promptImage = document.getElementById("prompt-image");
    const promptVideo = document.getElementById("prompt-video");
    const btnGenerateCreative = document.getElementById("btn-generate-creative");
    const simulatedGradient = document.getElementById("simulated-gradient");
    const simulatedText = document.getElementById("simulated-text");
    const generatedVisual = document.getElementById("generated-visual");

    // Chat Strategy Hub Elements
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const btnSendMessage = document.getElementById("btn-send-message");
    const btnClearChat = document.getElementById("btn-clear-chat");
    const contextIndicatorBar = document.getElementById("context-indicator-bar");
    const contextTourTitle = document.getElementById("context-tour-title");
    const btnUnlinkContext = document.getElementById("btn-unlink-context");

    // INITIALIZE APP
    async function init() {
        showLoader(true);

        // Check URL parameters for iframe embedding & public mode security
        const urlParams = new URLSearchParams(window.location.search);
        const isEmbed = urlParams.get("embed") === "true";
        const viewParam = urlParams.get("view");

        if (isEmbed) {
            document.body.classList.add("embedded-mode");
            setPersona("traveler");
            if (btnExecutive) btnExecutive.style.display = "none";
            if (viewTabAgent) viewTabAgent.style.display = "none";
        }

        if (viewParam && (isEmbed ? ["discovery", "planner"] : ["discovery", "planner", "agent"]).includes(viewParam)) {
            setView(viewParam);
        } else if (isEmbed) {
            setView("discovery");
        }

        try {
            // Load tours from Express backend API endpoint
            const response = await fetch("/api/tours");
            if (!response.ok) throw new Error("Failed to load tour database from backend.");
            toursData = await response.json();
            
            setupRegionsDropdown();
            renderTours();
            lucide.createIcons();
        } catch (error) {
            console.error("Error launching TravelIntell:", error);
            toursGrid.innerHTML = `<div class="error-state">Failed to load travel packages from API server.</div>`;
        } finally {
            showLoader(false);
        }
    }

    // REGION POPULATION
    function setupRegionsDropdown() {
        const regions = new Set();
        toursData.forEach(tour => {
            if (tour.region) regions.add(tour.region);
        });

        regionSelect.innerHTML = `<option value="all">All Regions</option>`;
        Array.from(regions).sort().forEach(region => {
            const option = document.createElement("option");
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });
    }

    // THEME SWITCHER
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
    });

    // PERSONA MANAGEMENT (TRAVELER VS MARKETING EXEC SWITCHER)
    function setPersona(persona) {
        if (document.body.classList.contains("embedded-mode") && persona === "executive") {
            console.warn("Marketing Exec persona is restricted in public embedded widget mode.");
            return;
        }
        activePersona = persona;
        document.body.setAttribute("data-persona", persona);
        
        if (persona === "traveler") {
            btnTraveler.classList.add("active");
            btnExecutive.classList.remove("active");
            tabMarketing.classList.add("hidden");
            
            // Switch to Discovery Hub if returning from Strategy Hub
            if (activeView === "agent") {
                setView("discovery");
            }
            switchTab("itinerary");
        } else {
            btnTraveler.classList.remove("active");
            btnExecutive.classList.add("active");
            tabMarketing.classList.remove("hidden");

            // When shifting to Marketing Exec mode, open Strategy Hub & marketing tab!
            setView("agent");
            if (currentSelectedTour) {
                switchTab("marketing");
            }
        }
    }

    btnTraveler.addEventListener("click", () => setPersona("traveler"));
    btnExecutive.addEventListener("click", () => setPersona("executive"));

    // APPLICATION VIEW NAVIGATION
    function setView(viewName) {
        if (document.body.classList.contains("embedded-mode") && viewName === "agent") {
            viewName = "discovery";
        }
        activeView = viewName;
        
        viewTabDiscovery.classList.remove("active");
        viewTabPlanner.classList.remove("active");
        viewTabAgent.classList.remove("active");
        
        viewDiscovery.classList.add("hidden");
        viewPlanner.classList.add("hidden");
        viewAgent.classList.add("hidden");
        
        if (viewName === "discovery") {
            viewTabDiscovery.classList.add("active");
            viewDiscovery.classList.remove("hidden");
        } else if (viewName === "planner") {
            viewTabPlanner.classList.add("active");
            viewPlanner.classList.remove("hidden");
        } else {
            viewTabAgent.classList.add("active");
            viewAgent.classList.remove("hidden");
            scrollToBottom();
        }
    }

    viewTabDiscovery.addEventListener("click", () => setView("discovery"));
    viewTabPlanner.addEventListener("click", () => setView("planner"));
    viewTabAgent.addEventListener("click", () => setView("agent"));

    // Check URL parameters for Embedded Widget mode (iframe embed support)
    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedded = urlParams.get('embed') === 'true';
    const initialView = urlParams.get('view') || urlParams.get('mode');

    if (isEmbedded) {
        document.body.classList.add("embedded-mode");
    }
    if (initialView && ["discovery", "planner", "agent"].includes(initialView)) {
        setView(initialView);
    }

    // Dynamic Title Cleaner Helper
    function cleanDayTitle(title, description = '') {
        if (!title) title = '';
        let cleaned = title.trim();
        // Strip leading "Day 01", "Day 1:", "Day (1)" etc.
        cleaned = cleaned.replace(/^Day\s*\(?\s*\d+\s*\)?\s*[-–—:\s]*/i, '');
        // Strip leading Roman numerals like "Day I", "Day II"
        cleaned = cleaned.replace(/^Day\s+[IVX]+\s*[-–—:\s]*/i, '');
        // Strip "DAY (1) Arrive..." combined number+title patterns
        cleaned = cleaned.replace(/^DAY\s*\(\d+\)\s*/i, '');
        cleaned = cleaned.replace(/^Section\s*\d+\s*[-–—:\s]*/i, '');
        cleaned = cleaned.trim();

        // Fallback to description first line if clean title is bare or empty
        if (!cleaned || /^Day\s*\d+$/i.test(cleaned) || /^Day\s*[IVX]+$/i.test(cleaned)) {
            if (description) {
                const lines = description.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length > 0) {
                    let firstLine = lines[0].replace(/^[-•*]\s*/, '').trim();
                    firstLine = firstLine.replace(/^(\d+(?:st|nd|rd|th)?\s*Day|Day\s*\d+)\s*[:\u2013\u2014-]\s*/i, '');
                    if (firstLine.length > 3 && firstLine.length < 110) {
                        cleaned = firstLine;
                    }
                }
            }
        }

        if (!cleaned || /^Day\s*\d+$/i.test(cleaned)) {
            cleaned = "Sightseeing & Local Exploration";
        }

        return cleaned;
    }

    // --- CORE FUNCTION: Filter & extract actual day entries from a tour's days array ---
    // Returns an array of { title, description } representing real itinerary days only.
    function filterAndExtractDays(daysArray) {
        if (!Array.isArray(daysArray)) return [];

        const METADATA_KEYWORDS = [
            'overview', 'meal plan', 'hotel to be', 'inclusions', 'exclusions',
            'inclusion', 'exclusion', 'please note', 'important note', 'note :-',
            'terms & conditions', 'terms and conditions', 'price', 'cost includes',
            'cost exclusion', 'vehicle', 'rooms', 'travel date', 'package highlights',
            'tour overview', 'highlights', 'the cost includes', 'package cost',
            'standard hotel', 'deluxe hotel', 'luxury hotel', 'menu',
            'best places to visit', 'famous places', 'hill stations to visit',
            'best time to visit', 'how to reach', 'by air', 'by train', 'by road',
            'by water', 'by sea', 'restaurants', 'things to do', 'shopping',
            'honeymoon places', 'interesting facts', 'history of', 'location of',
            'wildlife of', 'cuisine of', 'monuments of', 'natural beauty',
            'population', 'time zone', 'area', 'dial code', 'transportation options',
            'best way to reach', 'brief itinerary', 'optional', 'hotel details',
            'payable in boat', 'extra bed means', 'requirement for',
            'deluxe houseboats', 'premium houseboats', 'luxury houseboats',
            'special food menu', 'winter', 'spring', 'summer', 'autumn', 'monsoon',
            'souvenirs', 'jewellery work', 'wooden mask', 'sarees',
            'kedarnath yatra', 'return back', 'late lunch', 'lunch at',
            'for over night', 'approx distance', 'est. travel', 'journey time',
            'welcome to', 'goreme open', 'why should you'
        ];

        const actualDays = [];

        daysArray.forEach(day => {
            const dayLabel = (day.day || '').trim();
            const title = (day.title || '').trim();
            const desc = (day.description || '').trim();
            const titleLower = title.toLowerCase();
            const dayLabelLower = dayLabel.toLowerCase();

            const isExplicitDay = /^Day\s*(\(?\s*\d+\s*\)?|[IVX]+)/i.test(dayLabel);
            const isSection = dayLabelLower.startsWith('section');
            const sectionHasDayTitle = isSection && /^Day\s*(\(?\s*\d+\s*\)?|[IVX]+|\s*\(\s*\d+\s*\))/i.test(title);
            const sectionHasRomanDay = isSection && /^DAY\s*\(\s*[\dIVX]+\s*\)/i.test(title);

            const isMetadata = METADATA_KEYWORDS.some(kw =>
                titleLower.includes(kw) || dayLabelLower.includes(kw)
            );

            if (isMetadata) return;

            if (isExplicitDay || sectionHasDayTitle || sectionHasRomanDay || desc.length > 10) {
                actualDays.push({
                    title: cleanDayTitle(title, desc),
                    description: desc
                });
            }
        });

        return actualDays;
    }

    // Dynamic Description Parser (Normalizes lines/paragraphs & formats bullets cleanly)
    function formatItineraryDescription(text) {
        if (!text) return "";
        let cleanText = text.replace(/\*/g, "");
        
        const rawLines = cleanText.split("\n").map(l => l.trim()).filter(l => l !== "");
        const mergedLines = [];
        
        for (let i = 0; i < rawLines.length; i++) {
            let line = rawLines[i];
            let isBullet = line.startsWith("-") || line.startsWith("•");
            let cleanLine = line;
            if (isBullet) {
                cleanLine = line.replace(/^[\-\•]\s*/, "").trim();
            }
            
            const firstChar = cleanLine.charAt(0);
            const isLowercase = firstChar && firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase();
            
            const prev = mergedLines[mergedLines.length - 1];
            
            if (prev && (isLowercase || !isBullet)) {
                prev.text += " " + cleanLine;
            } else {
                mergedLines.push({
                    type: isBullet ? 'bullet' : 'paragraph',
                    text: cleanLine
                });
            }
        }
        
        let html = "";
        let inList = false;
        
        mergedLines.forEach(item => {
            if (item.text.trim() === "") return;
            const highlightedText = highlightPlaces(item.text);
            
            if (item.type === 'bullet') {
                if (!inList) {
                    html += '<ul class="itinerary-bullet-list">';
                    inList = true;
                }
                html += `<li>${highlightedText}</li>`;
            } else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                html += `<p class="itinerary-para">${highlightedText}</p>`;
            }
        });
        
        if (inList) {
            html += '</ul>';
        }
        
        return html;
    }

    // FILTER HANDLERS
    seasonsGrid.addEventListener("click", (e) => {
        const card = e.target.closest(".season-card");
        if (!card) return;

        const selectedSeason = card.dataset.season;
        
        if (activeSeason === selectedSeason) {
            activeSeason = null;
            card.classList.remove("active");
            activeSeasonLabel.textContent = "All Seasons";
            activeSeasonLabel.className = "season-badge-inline";
        } else {
            document.querySelectorAll(".season-card").forEach(c => c.classList.remove("active"));
            activeSeason = selectedSeason;
            card.classList.add("active");
            activeSeasonLabel.textContent = selectedSeason;
            activeSeasonLabel.className = `season-badge-inline badge-${selectedSeason.toLowerCase()}`;
        }
        renderTours();
    });

    searchInput.addEventListener("input", renderTours);

    segmentPills.forEach(pill => {
        pill.addEventListener("click", () => {
            segmentPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeSegment = pill.dataset.segment;
            renderTours();
        });
    });

    // ENTERPRISE UTILITY FUNCTIONS
    function debounce(func, waitMs = 250) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, waitMs);
        };
    }

    function escapeHTML(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // EVENT LISTENERS FOR SEARCH & FILTERS (DEBOUNCED FOR 60FPS SMOOTHNESS)
    searchInput.addEventListener("input", debounce(renderTours, 200));

    regionSelect.addEventListener("change", (e) => {
        activeRegion = e.target.value;
        renderTours();
    });

    durationSelect.addEventListener("change", (e) => {
        activeDuration = e.target.value;
        renderTours();
    });

    btnResetFilters.addEventListener("click", () => {
        activeSeason = null;
        activeSegment = "all";
        activeRegion = "all";
        activeDuration = "all";
        searchInput.value = "";

        document.querySelectorAll(".season-card").forEach(c => c.classList.remove("active"));
        segmentPills.forEach(p => p.classList.remove("active"));
        document.querySelector("[data-segment='all']").classList.add("active");
        regionSelect.value = "all";
        durationSelect.value = "all";
        activeSeasonLabel.textContent = "All Seasons";
        activeSeasonLabel.className = "season-badge-inline";

        renderTours();
    });

    function getDaysCount(durationStr) {
        if (!durationStr || durationStr === "Flexible") return 0;
        const match = durationStr.match(/(\d+)\s*Days?/);
        return match ? parseInt(match[1]) : 0;
    }

    // MAIN FILTERING AND RENDERING
    function renderTours() {
        const query = searchInput.value.toLowerCase().trim();
        
        const filtered = toursData.filter(tour => {
            if (activeSeason && !tour.seasons.includes(activeSeason)) return false;
            if (activeSegment !== "all" && tour.segment !== activeSegment) return false;
            if (activeRegion !== "all" && tour.region !== activeRegion) return false;
            
            if (activeDuration !== "all") {
                const days = getDaysCount(tour.duration);
                if (activeDuration === "short" && (days === 0 || days > 4)) return false;
                if (activeDuration === "medium" && (days < 5 || days > 8)) return false;
                if (activeDuration === "long" && days < 9) return false;
            }

            if (query) {
                const titleMatch = tour.title.toLowerCase().includes(query);
                const regionMatch = tour.region.toLowerCase().includes(query);
                const descriptionMatch = tour.days.some(d => d.description.toLowerCase().includes(query) || d.title.toLowerCase().includes(query));
                if (!titleMatch && !regionMatch && !descriptionMatch) return false;
            }

            return true;
        });

        tourCountLabel.textContent = filtered.length;
        toursGrid.innerHTML = "";
        
        if (filtered.length === 0) {
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
            
            filtered.forEach(tour => {
                const card = document.createElement("div");
                card.className = "tour-card";
                
                const primarySeason = tour.seasons[0] || "Summer";
                const gradientVar = `--${primarySeason.toLowerCase()}-primary`;
                
                let badgeHTML = `<span class="badge">${tour.region}</span>`;
                tour.seasons.forEach(s => {
                    badgeHTML += `<span class="badge badge-season" style="color: var(--${s.toLowerCase()}-primary); border-color: var(--${s.toLowerCase()}-primary)">${s}</span>`;
                });

                // Uses Unsplash Image URL directly
                card.innerHTML = `
                    <div class="tour-card-visual" style="background-image: url('${tour.image_url}');">
                        <div class="tour-card-badges">${badgeHTML}</div>
                    </div>
                    <div class="tour-card-body">
                        <h3>${tour.title}</h3>
                        <div class="tour-meta-row">
                            <span><i data-lucide="clock"></i> ${tour.duration}</span>
                            <span><i data-lucide="map-pin"></i> ${tour.segment}</span>
                        </div>
                        <div class="tour-card-footer">
                            <div class="price-box">
                                <label>Starts At</label>
                                <span>${tour.price}</span>
                            </div>
                            <button class="btn btn-primary btn-sm btn-view-itinerary">
                                Details <i data-lucide="arrow-right" style="width:0.85rem; height:0.85rem"></i>
                            </button>
                        </div>
                    </div>
                `;

                card.addEventListener("click", () => openDetailSheet(tour));
                toursGrid.appendChild(card);
            });
        }
        
        lucide.createIcons();
    }

    // PLACE HIGHLIGHTING PARSER
    function highlightPlaces(text) {
        if (!text) return "";
        const placeKeywords = [
            'Maldives', 'Malé', 'Agatti', 'Bangaram', 'Kavaratti', 'Lakshadweep', 'Goa', 'Srinagar', 'Gulmarg', 'Pahalgam',
            'Sonamarg', 'Kashmir', 'Manali', 'Shimla', 'Kullu', 'Solang Valley', 'Hadimba', 'Rohtang Pass', 'Darjeeling',
            'Gangtok', 'Sikkim', 'Tsomgo Lake', 'Baba Mandir', 'Pelling', 'Shillong', 'Guwahati', 'Kaziranga', 'Meghalaya',
            'Assam', 'Cherrapunji', 'Mawsynram', 'Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar', 'Ajmer', 'Amber Fort',
            'Hawa Mahal', 'City Palace', 'Munnar', 'Alleppey', 'Cochin', 'Thekkady', 'Wayanad', 'Kovalam', 'Kumarakom', 'Puri',
            'Konark', 'Bhubaneswar', 'Gopalpur', 'Rishikesh', 'Haridwar', 'Nainital', 'Corbett', 'Mussoorie', 'Kedarnath',
            'Badrinath', 'Chardham', 'Dubai', 'Burj Khalifa', 'Abu Dhabi', 'Athens', 'Santorini', 'Mykonos', 'Singapore',
            'Sentosa', 'Bali', 'Ubud', 'Kuta', 'Seminyak', 'Switzerland', 'Zurich', 'Geneva', 'Lucerne', 'Interlaken',
            'Bangkok', 'Phuket', 'Pattaya', 'Krabi', 'Hanoi', 'Halong Bay', 'Saigon', 'Tokyo', 'Kyoto', 'Osaka', 'Mount Fuji',
            'Istanbul', 'Cappadocia', 'Machu Picchu', 'Cancun', 'Seoul', 'Busan', 'Jeju Island', 'Taj Mahal', 'Agra',
            'Fort', 'Palace', 'Temple', 'Lake', 'Beach', 'Valley', 'Pass', 'Gardens', 'Houseboat', 'Pyramids', 'Sphinx',
            'Safari', 'National Park', 'Monastery', 'Museum', 'Cathedral', 'Cruise', 'Bridge', 'Gorge', 'Waterfalls'
        ];
        const pattern = new RegExp(`\\b(${placeKeywords.join('|')})\\b`, 'gi');
        return text.replace(pattern, '<span class="highlight-place">$1</span>');
    }

    // DRAWER PANEL MANAGEMENT
    function openDetailSheet(tour) {
        currentSelectedTour = tour;
        
        // Populate layout
        sheetSegment.textContent = tour.segment;
        sheetRegion.textContent = tour.region;
        sheetTitle.textContent = tour.title;
        sheetDuration.textContent = tour.duration;
        sheetPrice.textContent = tour.price;
        sheetSeasons.textContent = tour.seasons.join(", ");
        
        // High-res Image mapping
        sheetHeroImage.src = tour.image_url;
        sheetHeroImage.alt = tour.title;

        switchTab("itinerary");

        // Warnings list
        sheetWarningsList.innerHTML = "";
        if (tour.warnings && tour.warnings.length > 0) {
            sheetWarningsContainer.classList.remove("hidden");
            tour.warnings.forEach(w => {
                const li = document.createElement("li");
                li.textContent = w;
                sheetWarningsList.appendChild(li);
            });
        } else {
            sheetWarningsContainer.classList.add("hidden");
        }

        // Itinerary Days (Collapsible Accordion Panels)
        sheetTimeline.innerHTML = "";
        const cleanedDays = filterAndExtractDays(tour.days);

        if (cleanedDays.length === 0) {
            sheetTimeline.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;padding:1rem 0;">No day-by-day itinerary available for this package.</p>`;
        } else {
            cleanedDays.forEach((day, index) => {
                const item = document.createElement("div");
                item.className = "timeline-item";
                if (index === 0) item.classList.add("open"); // Pre-expand Day 1

                const dayLabel = `Day ${String(index + 1).padStart(2, '0')}`;
                const formattedDesc = formatItineraryDescription(day.description);

                item.innerHTML = `
                    <div class="timeline-header">
                        <div class="timeline-header-left">
                            <span class="timeline-day-badge">${dayLabel}</span>
                            <span class="timeline-title">${day.title || dayLabel}</span>
                        </div>
                        <i data-lucide="chevron-down" class="timeline-toggle-icon"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-desc">${formattedDesc}</div>
                    </div>
                `;

                const header = item.querySelector(".timeline-header");
                header.addEventListener("click", () => {
                    const isOpen = item.classList.contains("open");
                    if (!isOpen) {
                        sheetTimeline.querySelectorAll(".timeline-item").forEach(otherItem => {
                            otherItem.classList.remove("open");
                        });
                    }
                    item.classList.toggle("open");
                });

                sheetTimeline.appendChild(item);
            });
        }

        // Inclusions & Exclusions
        sheetInclusions.innerHTML = "";
        tour.inclusions.forEach(i => {
            const li = document.createElement("li");
            li.textContent = i;
            sheetInclusions.appendChild(li);
        });

        sheetExclusions.innerHTML = "";
        tour.exclusions.forEach(e => {
            const li = document.createElement("li");
            li.textContent = e;
            sheetExclusions.appendChild(li);
        });

        updateMarketingFields();

        // Show Backdrop and Drawer
        sheetBackdrop.classList.add("open");
        detailSheet.classList.add("open");
        document.body.style.overflow = "hidden";

        lucide.createIcons();
    }

    function closeDetailSheet() {
        sheetBackdrop.classList.remove("open");
        detailSheet.classList.remove("open");
        document.body.style.overflow = "";
    }

    sheetCloseBtn.addEventListener("click", closeDetailSheet);
    sheetBackdrop.addEventListener("click", closeDetailSheet);

    // TABS SYSTEM IN SHEET
    function switchTab(tabId) {
        if (tabId === "itinerary") {
            tabItinerary.classList.add("active");
            tabMarketing.classList.remove("active");
            panelItinerary.classList.add("active");
            panelMarketing.classList.remove("active");
        } else {
            tabItinerary.classList.remove("active");
            tabMarketing.classList.add("active");
            panelItinerary.classList.remove("active");
            panelMarketing.classList.add("active");
        }
    }

    tabItinerary.addEventListener("click", () => switchTab("itinerary"));
    tabMarketing.addEventListener("click", () => switchTab("marketing"));

    // LINK TOUR TO CHAT AGENT
    btnLoadInAgent.addEventListener("click", () => {
        if (!currentSelectedTour) return;
        
        linkedTourContext = currentSelectedTour;
        contextTourTitle.textContent = currentSelectedTour.title;
        contextIndicatorBar.classList.remove("hidden");
        
        // Auto switch view to flyagent chat
        setView("agent");
        closeDetailSheet();

        // Print system alert bubble in chat
        appendMessage("system", `🔗 **Connected Context**: Loaded itinerary details for **${linkedTourContext.title}** (${linkedTourContext.duration}). FlyAgent is now contextually optimized for this package!`);
    });

    btnUnlinkContext.addEventListener("click", () => {
        if (linkedTourContext) {
            appendMessage("system", `🔓 **Disconnected Context**: Unlinked **${linkedTourContext.title}**. Chat is now running in general consultation mode.`);
            linkedTourContext = null;
            contextIndicatorBar.classList.add("hidden");
        }
    });

    // MARKETING TONE HANDLER
    function updateMarketingFields() {
        if (!currentSelectedTour) return;

        const tone = toneSelect.value;
        const marketing = currentSelectedTour.marketing;

        marketingCaption.value = marketing.captions[tone] || marketing.captions["adventure"];
        marketingHashtags.value = marketing.hashtags;
        promptImage.value = marketing.image_prompt;
        promptVideo.value = marketing.video_prompt;

        simulatedGradient.style.opacity = "0.6";
        simulatedText.classList.remove("hidden");
        generatedVisual.classList.add("hidden");
        generatedVisual.innerHTML = "";
    }

    toneSelect.addEventListener("change", updateMarketingFields);

    // COPY CLIPBOARD UTILITY
    const copyBtns = document.querySelectorAll(".copy-btn");
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;

            targetEl.select();
            targetEl.setSelectionRange(0, 99999);

            navigator.clipboard.writeText(targetEl.value).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" style="color: var(--success); width: 1rem; height: 1rem;"></i>`;
                lucide.createIcons();
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    lucide.createIcons();
                }, 1500);
            }).catch(err => {
                console.error("Failed to copy text:", err);
            });
        });
    });

    // SIMULATED CREATIVE GENERATOR ENGINE
    btnGenerateCreative.addEventListener("click", () => {
        if (!currentSelectedTour) return;

        btnGenerateCreative.disabled = true;
        const originalHTML = btnGenerateCreative.innerHTML;
        btnGenerateCreative.innerHTML = `<div class="spinner" style="width: 1rem; height: 1rem; margin: 0 0.5rem 0 0; border-width: 2px;"></div> Generating Art...`;
        simulatedText.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> Rendering Midjourney canvas...`;
        lucide.createIcons();

        setTimeout(() => {
            const destination = currentSelectedTour.title.split("Tour")[0].split("Package")[0].strip();
            const svgArt = createDynamicSVG(destination);
            
            generatedVisual.innerHTML = svgArt;
            generatedVisual.classList.remove("hidden");
            simulatedText.classList.add("hidden");
            simulatedGradient.style.opacity = "0.1";
            
            btnGenerateCreative.disabled = false;
            btnGenerateCreative.innerHTML = originalHTML;
            lucide.createIcons();
        }, 1800);
    });

    // =========================================
    // CHAT CONSOLE LOGIC & API ROUTING
    // =========================================

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatMarkdown(text) {
        if (!text) return "";
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Compile markdown tables
        const lines = escaped.split("\n");
        let inTable = false;
        let tableHtml = "";
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("|") && line.endsWith("|")) {
                const cells = line.split("|").slice(1, -1).map(c => c.trim());
                const isSeparator = cells.every(c => c.match(/^:?-+:?$/));
                
                if (isSeparator) {
                    lines[i] = "";
                    continue;
                }
                
                if (!inTable) {
                    inTable = true;
                    tableHtml = '<div class="table-container"><table><thead><tr>';
                    cells.forEach(c => {
                        tableHtml += `<th>${c}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                } else {
                    tableHtml += '<tr>';
                    cells.forEach(c => {
                        tableHtml += `<td>${c}</td>`;
                    });
                    tableHtml += '</tr>';
                }
                lines[i] = "";
            } else {
                if (inTable) {
                    tableHtml += '</tbody></table></div>';
                    inTable = false;
                    lines[i] = tableHtml + "\n" + lines[i];
                    tableHtml = "";
                }
            }
        }
        if (inTable) {
            tableHtml += '</tbody></table></div>';
            lines[lines.length - 1] = lines[lines.length - 1] + "\n" + tableHtml;
        }
        
        let html = lines.filter(l => l !== "").join("\n");
        
        // Bold headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold inline text
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
        
        // Lists
        const listLines = html.split("\n");
        let inList = false;
        for (let i = 0; i < listLines.length; i++) {
            const line = listLines[i].trim();
            if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
                const content = "<li>" + line.replace(/^[\*\-\•]\s*/, "") + "</li>";
                if (!inList) {
                    listLines[i] = "<ul>" + content;
                    inList = true;
                } else {
                    listLines[i] = content;
                }
            } else {
                if (inList) {
                    listLines[i-1] = listLines[i-1] + "</ul>";
                    inList = false;
                }
            }
        }
        if (inList) {
            listLines[listLines.length-1] = listLines[listLines.length-1] + "</ul>";
        }
        
        html = listLines.join("\n");
        
        // STRIP ANY REMAINING ASTERISKS (*) FROM HTML OUTPUT
        html = html.replace(/\*/g, "");

        // Paragraph splits
        html = html.split("\n\n").map(p => {
            const trimmed = p.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith("<ul") || trimmed.startsWith("<li") || trimmed.startsWith("<h") || trimmed.startsWith("<div class=\"table-container\"")) return trimmed;
            return `<p>${trimmed}</p>`;
        }).join("\n");

        return html;
    }

    function appendMessage(role, content) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${role}-msg`;
        
        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        
        if (role === "system") {
            bubble.innerHTML = formatMarkdown(content);
        } else {
            bubble.innerHTML = formatMarkdown(content);
        }
        
        msgDiv.appendChild(bubble);
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendTypingIndicator() {
        const indicator = document.createElement("div");
        indicator.className = "message agent-msg typing-bubble";
        indicator.id = "agent-typing-indicator";
        indicator.innerHTML = `
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById("agent-typing-indicator");
        if (indicator) indicator.remove();
    }

    async function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Clear input area
        chatInput.value = "";
        
        // Add to user console
        appendMessage("user", text);
        chatHistory.push({ role: "user", content: text });

        // Add typing indicator
        appendTypingIndicator();

        try {
            // POST request to backend Express routing (Streaming SSE)
            const response = await fetch("/api/agent/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: chatHistory,
                    selectedTourId: linkedTourContext ? linkedTourContext.id : null
                })
            });

            removeTypingIndicator();

            if (!response.ok) {
                const textErr = await response.text();
                let errMsg = "Failed to communicate with agent.";
                try {
                    const errJson = JSON.parse(textErr);
                    errMsg = errJson.error || errMsg;
                } catch (e) {}
                throw new Error(errMsg);
            }

            // Create agent message bubble placeholder
            const msgDiv = document.createElement("div");
            msgDiv.className = "message agent-msg";
            const bubble = document.createElement("div");
            bubble.className = "msg-bubble";
            msgDiv.appendChild(bubble);
            chatMessages.appendChild(msgDiv);
            scrollToBottom();

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedReply = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop(); // Hold partial line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                        try {
                            const json = JSON.parse(trimmed.slice(6));
                            const content = json.choices[0]?.delta?.content || "";
                            accumulatedReply += content;
                            bubble.innerHTML = formatMarkdown(accumulatedReply);
                            scrollToBottom();
                        } catch (e) {
                            // ignore json parse errors
                        }
                    }
                }
            }

            // Handle any remaining buffer contents
            if (buffer.trim().startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
                try {
                    const json = JSON.parse(buffer.trim().slice(6));
                    const content = json.choices[0]?.delta?.content || "";
                    accumulatedReply += content;
                    bubble.innerHTML = formatMarkdown(accumulatedReply);
                    scrollToBottom();
                } catch (e) {}
            }

            // Save complete response in frontend chat history
            chatHistory.push({ role: "assistant", content: accumulatedReply });
        } catch (error) {
            removeTypingIndicator();
            const friendlyErr = (error.message && error.message.includes("Failed to fetch"))
                ? "TravelIntell server is connecting. If testing locally, please verify server is running."
                : (error.message || "Failed to reach FlyAgent.");
            appendMessage("system", `⚠️ ${escapeHTML(friendlyErr)}`);
        }
    }

    btnSendMessage.addEventListener("click", handleSendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    btnClearChat.addEventListener("click", () => {
        chatHistory = [];
        chatMessages.innerHTML = `
            <div class="message system-msg">
                <div class="msg-bubble">
                    <p>👋 Welcome to the <strong>FlyAgent Strategy Hub</strong>! I am your sales and marketing consultant for HappyFlying Travels.</p>
                    <p>Select any itinerary from the <strong>Discovery Hub</strong> to load its context directly, or pick one of the quick templates on the left. You can ask me to draft advertisements, plan campaigns, or generate sales scripts based on our travel database!</p>
                </div>
            </div>
        `;
        scrollToBottom();
    });

    // TEMPLATE CLICKS AUTO-TRIGGERS
    document.querySelectorAll(".template-btn, .template-btn-pill").forEach(btn => {
        btn.addEventListener("click", () => {
            const promptText = btn.dataset.prompt;
            chatInput.value = promptText;
            chatInput.focus();
            
            // Auto trigger send for optimal UX
            handleSendMessage();
        });
    });

    // CUSTOM DYNAMIC LANDSCAPE GENERATOR (SVG BASED)
    function createDynamicSVG(dest) {
        const lower = dest.toLowerCase();
        let colors = ["#1e3a8a", "#0d9488", "#111827"];
        let shapes = "";

        if (lower.match(/kerala|bali|beach|island|agatti|goa|andaman|srilanka/)) {
            colors = ["#0284c7", "#0d9488", "#fbbf24"];
            shapes = `
                <rect x="0" y="140" width="100%" height="80" fill="#0284c7" />
                <circle cx="200" cy="110" r="35" fill="#f59e0b" filter="drop-shadow(0 0 10px rgba(245,158,11,0.5))" />
                <path d="M 0 160 Q 100 130 200 160 T 400 160 L 400 220 L 0 220 Z" fill="#065f46" />
                <path d="M 150 170 Q 280 140 400 175" stroke="#047857" stroke-width="4" fill="none" />
                <path d="M 50 170 Q 60 110 90 90" stroke="#78350f" stroke-width="5" fill="none" />
                <path d="M 90 90 Q 70 80 50 90 M 90 90 Q 80 70 90 50 M 90 90 Q 110 80 130 90 M 90 90 Q 100 100 110 120" stroke="#047857" stroke-width="4" fill="none" />
            `;
        } else if (lower.match(/mountain|trek|kashmir|himachal|kullu|manali|gangtok|darjeeling|sikkim|alpine|peru|nepal|kailash/)) {
            colors = ["#312e81", "#1e1b4b", "#f3f4f6"];
            shapes = `
                <circle cx="80" cy="80" r="25" fill="#fef08a" opacity="0.9" />
                <polygon points="-50,220 150,60 350,220" fill="#374151" />
                <polygon points="150,60 120,96 180,96" fill="#f9fafb" />
                <polygon points="100,220 280,30 450,220" fill="#1f2937" />
                <polygon points="280,30 240,80 320,80" fill="#f9fafb" />
                <polygon points="20,220 180,90 320,220" fill="#4b5563" opacity="0.8" />
                <polygon points="40,220 40,200 30,200 40,180 50,200 40,200" fill="#064e3b" />
                <polygon points="280,220 280,195 270,195 280,175 290,195 280,195" fill="#064e3b" />
            `;
        } else if (lower.match(/temple|heritage|egypt|pyramid|dwarka|somnath|shirdi|ujjain|aurangabad|hampi|cambodia|angkor/)) {
            colors = ["#78350f", "#451a03", "#fef3c7"];
            shapes = `
                <circle cx="200" cy="130" r="45" fill="#ea580c" opacity="0.85" />
                <rect x="0" y="170" width="100%" height="50" fill="#451a03" />
                <polygon points="50,170 150,70 250,170" fill="#7c2d12" />
                <polygon points="50,170 150,70 120,170" fill="#9a3412" opacity="0.9" />
                <polygon points="200,170 290,90 380,170" fill="#7c2d12" />
                <polygon points="200,170 290,90 260,170" fill="#9a3412" opacity="0.9" />
                <rect x="20" y="120" width="15" height="50" fill="#451a03" />
                <polygon points="12,120 27,90 42,120" fill="#451a03" />
            `;
        } else {
            colors = ["#09090b", "#172554", "#3b82f6"];
            shapes = `
                <circle cx="320" cy="60" r="20" fill="#f8fafc" opacity="0.9" />
                <rect x="20" y="100" width="40" height="120" fill="#1e293b" />
                <rect x="80" y="60" width="50" height="160" fill="#0f172a" />
                <rect x="90" y="80" width="5" height="5" fill="#fef08a" />
                <rect x="100" y="80" width="5" height="5" fill="#fef08a" />
                <rect x="110" y="100" width="5" height="5" fill="#fef08a" />
                <rect x="90" y="120" width="5" height="5" fill="#fef08a" />
                <rect x="160" y="110" width="45" height="110" fill="#1e293b" />
                <rect x="230" y="40" width="60" height="180" fill="#0f172a" />
                <line x1="260" y1="40" x2="260" y2="10" stroke="#3b82f6" stroke-width="3" />
                <circle cx="260" cy="10" r="4" fill="#ef4444" />
                <rect x="310" y="130" width="70" height="90" fill="#334155" />
            `;
        }

        const svg = `
            <svg width="100%" height="100%" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style="background: linear-gradient(180deg, ${colors[0]}, ${colors[1]}); display: block;">
                ${shapes}
                <rect x="0" y="200" width="100%" height="20" fill="#0c0c0f" opacity="0.9" />
                <text x="15" y="30" fill="#ffffff" font-family="'DM Sans', sans-serif" font-weight="800" font-size="12" letter-spacing="1" opacity="0.8">AI GENERATED MOCKUP</text>
                <text x="15" y="45" fill="#ffffff" font-family="'DM Sans', sans-serif" font-weight="500" font-size="10" opacity="0.6">${dest.toUpperCase()}</text>
            </svg>
        `;
        return svg;
    }

    if (!String.prototype.strip) {
        String.prototype.strip = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    function showLoader(show) {
        if (show) {
            loader.classList.remove("hidden");
            toursGrid.classList.add("hidden");
        } else {
            loader.classList.add("hidden");
            toursGrid.classList.remove("hidden");
        }
    }

    // =========================================
    // MULTI-SELECT TRAVEL THEMES LOGIC
    // =========================================
    function getSelectedThemes() {
        if (!plannerThemesContainer) return ["Leisure & Relaxation"];
        const activePills = plannerThemesContainer.querySelectorAll(".theme-pill-chip.active");
        const themes = Array.from(activePills).map(pill => pill.dataset.theme);
        return themes.length > 0 ? themes : ["Leisure & Relaxation"];
    }

    function updateThemeSelectedCount() {
        const themes = getSelectedThemes();
        if (themeSelectedCount) {
            themeSelectedCount.textContent = `${themes.length} Theme${themes.length > 1 ? 's' : ''} Selected`;
        }
    }

    if (plannerThemesContainer) {
        plannerThemesContainer.querySelectorAll(".theme-pill-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const isActive = chip.classList.contains("active");
                const currentThemes = getSelectedThemes();

                // Prevent unselecting the last remaining theme
                if (isActive && currentThemes.length === 1) return;

                chip.classList.toggle("active");
                const icon = chip.querySelector("i");
                if (chip.classList.contains("active")) {
                    if (icon) icon.setAttribute("data-lucide", "check-circle-2");
                } else {
                    if (icon) icon.setAttribute("data-lucide", "circle");
                }
                lucide.createIcons();
                updateThemeSelectedCount();
            });
        });
    }

    // =========================================
    // AI CUSTOM ITINERARY PLANNER LOGIC
    // =========================================

    async function handleGenerateItinerary() {
        const start = plannerStart.value.trim();
        const dest = plannerDest.value.trim();
        const days = plannerDays.value;
        const selectedThemesList = getSelectedThemes();
        const theme = selectedThemesList.join(", ");

        if (!start || !dest) {
            alert("Please enter both Starting Point and Destination!");
            return;
        }

        btnGenerateItinerary.disabled = true;
        const originalHTML = btnGenerateItinerary.innerHTML;
        btnGenerateItinerary.innerHTML = `<div class="spinner" style="width: 1rem; height: 1rem; margin: 0 0.5rem 0 0; border-width: 2px;"></div> Generating Custom Itinerary...`;
        
        plannerResultsSection.classList.add("hidden");
        plannerTimeline.innerHTML = "";

        try {
            const response = await fetch("/api/agent/generate-itinerary", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ start, destination: dest, days, theme })
            });

            if (!response.ok) {
                const text = await response.text();
                let errMsg = "Failed to generate itinerary.";
                try {
                    const errJson = JSON.parse(text);
                    errMsg = errJson.error || errMsg;
                } catch (e) {}
                throw new Error(errMsg);
            }

            const data = await response.json();
            const itinerary = data.itinerary;
            const referenceTours = data.referenceTours || [];

            if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
                throw new Error("AI returned an empty or invalid itinerary payload.");
            }

            const capitalize = (str) => str.replace(/\b\w/g, c => c.toUpperCase());
            plannerResultsRoute.textContent = `${capitalize(start)} → ${capitalize(dest)} (${days} Days, ${theme})`;
            resultsThemeBadge.textContent = selectedThemesList.join(" • ");

            // Show reference sources if available
            const existingRef = plannerResultsSection.querySelector('.planner-ref-sources');
            if (existingRef) existingRef.remove();
            if (referenceTours.length > 0) {
                const refEl = document.createElement('p');
                refEl.className = 'planner-ref-sources';
                refEl.innerHTML = `<i data-lucide="database" style="width:0.85rem;height:0.85rem;vertical-align:middle;"></i> Based on HappyFlying DB: ${referenceTours.map(t => `<strong>${t.title}</strong>`).join(', ')}`;
                plannerResultsSection.querySelector('.planner-results-header').after(refEl);
            }

            const currentCustomItinerary = [];

            // Helper to rebuild WhatsApp message payload dynamically
            function updateWhatsappLink() {
                let waMessage = `*Hello HappyFlying Travels LLP!*\n`;
                waMessage += `I planned a custom trip on TravelIntell:\n\n`;
                waMessage += `✈️ *Route*: ${capitalize(start)} to ${capitalize(dest)}\n`;
                waMessage += `📅 *Duration*: ${days} Days\n`;
                waMessage += `🎭 *Theme*: ${theme}\n\n`;
                waMessage += `📍 *AI-Generated Itinerary*:\n`;

                currentCustomItinerary.forEach((day) => {
                    waMessage += `\n*${day.day}: ${day.title}*\n`;
                    
                    const descLines = day.description.split("\n")
                        .map(l => l.trim())
                        .filter(l => l !== "")
                        .map(l => {
                            if (l.startsWith("-") || l.startsWith("*") || l.startsWith("•")) {
                                return `• ` + l.replace(/^[\-\*\•]\s*/, "");
                            }
                            return l;
                        });
                    waMessage += descLines.join("\n") + `\n`;
                });

                waMessage += `\nCan you please check availability and provide pricing for this custom itinerary? Thank you!`;
                btnWhatsappShare.href = `https://api.whatsapp.com/send?phone=919900113691&text=${encodeURIComponent(waMessage)}`;
            }

            itinerary.forEach((day, index) => {
                const item = document.createElement("div");
                item.className = "timeline-item";
                if (index === 0) item.classList.add("open");

                const dayLabel = `Day ${String(index + 1).padStart(2, '0')}`;
                // Store initial text (use AI day title directly — already clean from AI)
                const cleanTitle = cleanDayTitle(day.title || '') || day.title || dayLabel;
                currentCustomItinerary.push({
                    day: dayLabel,
                    title: cleanTitle,
                    description: day.description
                });

                const formattedDesc = formatItineraryDescription(day.description);

                item.innerHTML = `
                    <div class="timeline-header">
                        <div class="timeline-header-left">
                            <span class="timeline-day-badge">${dayLabel}</span>
                            <span class="timeline-title" contenteditable="true" data-index="${index}" data-field="title">${cleanTitle}</span>
                        </div>
                        <i data-lucide="chevron-down" class="timeline-toggle-icon"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-desc" contenteditable="true" data-index="${index}" data-field="description">${formattedDesc}</div>
                    </div>
                `;

                // Stop toggle propagation on editable title element
                const editableTitle = item.querySelector(".timeline-title");
                editableTitle.addEventListener("click", (e) => {
                    e.stopPropagation();
                });

                // Update data and WhatsApp link dynamically as user types
                const handleEdit = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    const field = e.target.dataset.field;
                    if (field === "title") {
                        currentCustomItinerary[idx].title = e.target.textContent.trim();
                    } else {
                        currentCustomItinerary[idx].description = e.target.innerText.trim();
                    }
                    updateWhatsappLink();
                };

                editableTitle.addEventListener("input", handleEdit);
                
                const editableDesc = item.querySelector(".timeline-desc");
                editableDesc.addEventListener("input", handleEdit);

                const header = item.querySelector(".timeline-header");
                header.addEventListener("click", () => {
                    const isOpen = item.classList.contains("open");
                    if (!isOpen) {
                        plannerTimeline.querySelectorAll(".timeline-item").forEach(otherItem => {
                            otherItem.classList.remove("open");
                        });
                    }
                    item.classList.toggle("open");
                });

                plannerTimeline.appendChild(item);
            });

            // Set initial link
            updateWhatsappLink();

            // Render Interactive Flowchart
            renderItineraryFlowchart(currentCustomItinerary, start, dest, updateWhatsappLink);

            lucide.createIcons();
            plannerResultsSection.classList.remove("hidden");

            // Initial SVG connector draw after DOM update
            setTimeout(() => {
                drawFlowchartConnectors();
            }, 100);

        } catch (error) {
            console.error("Itinerary planning error:", error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            btnGenerateItinerary.disabled = false;
            btnGenerateItinerary.innerHTML = originalHTML;
            lucide.createIcons();
        }
    }

    btnGenerateItinerary.addEventListener("click", handleGenerateItinerary);

    // =========================================
    // FLOWCHART VIEW TABS & CONNECTORS LOGIC
    // =========================================
    if (btnShowFlowchart && btnShowTimeline) {
        btnShowFlowchart.addEventListener("click", () => {
            btnShowFlowchart.classList.add("active");
            btnShowTimeline.classList.remove("active");
            plannerFlowchartWrapper.classList.remove("hidden");
            plannerTimeline.classList.add("hidden");
            setTimeout(drawFlowchartConnectors, 50);
        });

        btnShowTimeline.addEventListener("click", () => {
            btnShowTimeline.classList.add("active");
            btnShowFlowchart.classList.remove("active");
            plannerTimeline.classList.remove("hidden");
            plannerFlowchartWrapper.classList.add("hidden");
        });
    }

    // Window Resize Handler for Flowchart SVG Connectors
    window.addEventListener("resize", () => {
        if (plannerFlowchartWrapper && !plannerFlowchartWrapper.classList.contains("hidden")) {
            drawFlowchartConnectors();
        }
    });

    // =========================================
    // DYNAMIC PLACE PHOTOS ENGINE (PHOTOS & VISUAL HIGHLIGHTS)
    // =========================================
    function getDynamicPlaceImages(placeName, destCity = '') {
        const query = `${placeName} ${destCity}`.toLowerCase().trim();

        // 1. If currently selected tour has a local asset (e.g. /assets/international/...), prioritize it in popups!
        let tourAsset = (currentSelectedTour && currentSelectedTour.image_url && currentSelectedTour.image_url.startsWith('/assets/')) ? currentSelectedTour.image_url : null;

        // Destination & Attraction Photo Mapping Dictionary
        const DESTINATION_PHOTO_MAP = {
            "bhutan": [
                "/assets/international/bhutan-bhumtan.jpeg",
                "/assets/international/exeperience bhutan.jpeg",
                "/assets/international/bhutan-kingdom in sky.jpeg",
                "/assets/international/bhutan-paro festival.jpeg"
            ],
            "bumthang": [
                "/assets/international/bhutan-bhumtan.jpeg",
                "/assets/international/journey to heart if bhutan.jpeg",
                "/assets/international/bhutan-druk path.jpeg",
                "/assets/international/exeperience bhutan.jpeg"
            ],
            "brazil": [
                "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80",
                "/assets/international/argentina.jpeg",
                "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"
            ],
            "gangtok": [
                "/assets/images/gangtok_love_sign.png",
                "/assets/images/darjeeling_gangtok_town.png",
                "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80"
            ],
            "darjeeling": [
                "/assets/images/darjeeling_gangtok_town.png",
                "/assets/images/gangtok_love_sign.png",
                "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80"
            ],
            "tbilisi": [
                "https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80"
            ],
            "uplistsikhe": [
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80"
            ],
            "gori": [
                "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80"
            ],
            "yerevan": [
                "https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80"
            ],
            "garni": [
                "https://images.unsplash.com/photo-1548625361-1823758b7337?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80"
            ],
            "geghard": [
                "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1548625361-1823758b7337?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80"
            ],
            "srinagar": [
                "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=600&q=80"
            ],
            "gulmarg": [
                "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=600&q=80"
            ],
            "pahalgam": [
                "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
            ],
            "manali": [
                "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=600&q=80"
            ],
            "shimla": [
                "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=600&q=80"
            ],
            "athens": [
                "https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80"
            ],
            "santorini": [
                "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80"
            ],
            "mykonos": [
                "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
            ],
            "rajasthan": [
                "/assets/images/rajasthan.jpg",
                "/assets/images/majestic tour rajasthan.jpg",
                "/assets/images/rajasthan temple.jpg",
                "/assets/images/rajasthan1.jpg"
            ],
            "shillong": [
                "/assets/images/shillong.jpeg",
                "/assets/images/guwahati.jpeg",
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80"
            ],
            "guwahati": [
                "/assets/images/guwahati.jpeg",
                "/assets/images/shillong.jpeg",
                "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
            ],
            "jaipur": [
                "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1603201667141-5a2d4c673378?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80"
            ],
            "udaipur": [
                "https://images.unsplash.com/photo-1603201667141-5a2d4c673378?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80"
            ],
            "hyderabad": [
                "/assets/images/hyderbad.jpeg",
                "/assets/images/madurai.jpeg",
                "/assets/images/tirupati.jpeg",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80"
            ],
            "kerala": [
                "/assets/images/kerala houseboat.jpeg",
                "/assets/images/kerala yoga.jpeg",
                "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80"
            ],
            "coorg": [
                "/assets/images/coorg.jpeg",
                "/assets/images/karnataka heritage.jpeg",
                "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80"
            ],
            "mysore": [
                "/assets/images/mysore.jpeg",
                "/assets/images/royal mysore and heritage.jpeg",
                "/assets/images/karnataka heritage.jpeg",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80"
            ],
            "hampi": [
                "/assets/images/Hampi – Badami – Aihole – Pattadakal.jpeg",
                "/assets/images/karnataka heritage.jpeg",
                "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80"
            ],
            "madurai": [
                "/assets/images/madurai.jpeg",
                "/assets/images/tirupati.jpeg",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"
            ],
            "tirupati": [
                "/assets/images/tirupati.jpeg",
                "/assets/images/madurai.jpeg",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"
            ],
            "gujarat": [
                "/assets/images/gujarat.jpeg",
                "/assets/images/gujarat-kutch.jpeg",
                "/assets/images/dwaraka.jpeg",
                "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80"
            ],
            "kutch": [
                "/assets/images/gujarat-kutch.jpeg",
                "/assets/images/gujarat.jpeg",
                "/assets/images/dwaraka.jpeg",
                "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80"
            ],
            "dwarka": [
                "/assets/images/dwaraka.jpeg",
                "/assets/images/gujarat.jpeg",
                "/assets/images/gujarat-kutch.jpeg",
                "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80"
            ],
            "madhya pradesh": [
                "/assets/images/madhya-pradesh.jpeg",
                "/assets/images/ujjain.jpeg",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80"
            ],
            "ujjain": [
                "/assets/images/ujjain.jpeg",
                "/assets/images/madhya-pradesh.jpeg",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80"
            ],
            "maharashtra": [
                "/assets/images/ajanta.jpeg",
                "/assets/images/shiradi.jpeg",
                "/assets/images/triambakeshwar-maharashtra.jpeg",
                "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80"
            ],
            "ajanta": [
                "/assets/images/ajanta.jpeg",
                "/assets/images/triambakeshwar-maharashtra.jpeg",
                "/assets/images/shiradi.jpeg",
                "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80"
            ],
            "shirdi": [
                "/assets/images/shiradi.jpeg",
                "/assets/images/triambakeshwar-maharashtra.jpeg",
                "/assets/images/ajanta.jpeg",
                "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80"
            ],
            "uttarakhand": [
                "/assets/images/uttarkhand.jpeg",
                "/assets/images/uttarkhand1.jpeg",
                "/assets/images/kedarnath-uttarkhand.jpeg",
                "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80"
            ],
            "kedarnath": [
                "/assets/images/kedarnath-uttarkhand.jpeg",
                "/assets/images/uttarkhand.jpeg",
                "/assets/images/uttarkhand1.jpeg",
                "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80"
            ],
            "odisha": [
                "/assets/images/odisha.jpeg",
                "/assets/images/odisha1.jpeg",
                "/assets/images/odisha-tribe.jpeg",
                "/assets/images/puri-jagannath odisha.jpeg"
            ],
            "puri": [
                "/assets/images/puri-jagannath odisha.jpeg",
                "/assets/images/odisha.jpeg",
                "/assets/images/odisha1.jpeg",
                "/assets/images/odisha-tribe.jpeg"
            ],
            "sikkim": [
                "/assets/images/sikkim.jpeg",
                "/assets/images/gangtok.jpeg",
                "/assets/images/darjleeng.jpeg",
                "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80"
            ]
        };

        let resultPhotos = null;

        for (const [key, photos] of Object.entries(DESTINATION_PHOTO_MAP)) {
            if (query.includes(key)) {
                resultPhotos = [...photos];
                break;
            }
        }

        if (!resultPhotos) {
            if (query.match(/mountain|hill|peak|snow|trek|valley|glacier/)) {
                resultPhotos = [
                    "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=600&q=80"
                ];
            } else if (query.match(/beach|island|sea|water|lake|river|coast|ocean|waterfall/)) {
                resultPhotos = [
                    "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=600&q=80"
                ];
            } else if (query.match(/fort|palace|temple|monument|castle|heritage|ruins|church|cathedral|cave/)) {
                resultPhotos = [
                    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1603201667141-5a2d4c673378?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80"
                ];
            } else {
                resultPhotos = [
                    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
                ];
            }
        }

        if (tourAsset && !resultPhotos.includes(tourAsset)) {
            resultPhotos.unshift(tourAsset);
        }

        return resultPhotos;
    }

    // =========================================
    // PLACE DETAILS POP-UP DRAWER HANDLERS (IMG2 DESIGN)
    // =========================================`

    function closePlacePopup() {
        if (placePopupBackdrop) placePopupBackdrop.classList.remove("open");
        if (placePopupDrawer) placePopupDrawer.classList.remove("open");
        document.body.style.overflow = "auto";
    }

    if (placePopupCloseBtn) placePopupCloseBtn.addEventListener("click", closePlacePopup);
    if (placePopupBackdrop) placePopupBackdrop.addEventListener("click", closePlacePopup);
    if (btnPlaceClose) btnPlaceClose.addEventListener("click", closePlacePopup);

    function openPlaceDetailsPopup(placeName, dayTag, fullDescription, destCity) {
        if (!placePopupDrawer) return;

        placePopupDayTag.textContent = (dayTag || "DAY ATTRACTION").toUpperCase();
        placePopupCategoryTag.textContent = (destCity || "DESTINATION HIGHLIGHT").toUpperCase();
        placePopupTitle.textContent = placeName;
        placePopupLocationText.textContent = `${destCity || "Tourist Hub"}, Travel Destination`;

        // Description
        placePopupDesc.textContent = fullDescription || `Explore ${placeName}, a key highlight on this itinerary featuring stunning sights, culture, and memorable experiences.`;

        // Recommended Activities (img2 layout)
        placePopupActivities.innerHTML = "";
        const activities = [
            { text: `Sightseeing & Landmark Photography at ${placeName}`, icon: "camera" },
            { text: `Local Culinary & Refreshment Experience`, icon: "utensils" },
            { text: `Guided Scenic & Heritage Walking Exploration`, icon: "footprints" },
            { text: `Souvenir Shopping & Local Handicrafts`, icon: "shopping-bag" }
        ];

        activities.forEach(act => {
            const item = document.createElement("div");
            item.className = "place-activity-item";
            item.innerHTML = `<i data-lucide="${act.icon}"></i> <span>${act.text}</span>`;
            placePopupActivities.appendChild(item);
        });

        // DYNAMIC PLACE-SPECIFIC PHOTO ENGINE (PHOTOS & VISUAL HIGHLIGHTS)
        placePopupGallery.innerHTML = "";
        const photoUrls = getDynamicPlaceImages(placeName, destCity);

        photoUrls.forEach((url, idx) => {
            const card = document.createElement("div");
            card.className = "place-gallery-card";
            card.innerHTML = `
                <img src="${url}" alt="${placeName} Photo ${idx + 1}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80';">
                <div class="place-gallery-caption">${placeName} View #${idx + 1}</div>
            `;
            placePopupGallery.appendChild(card);
        });

        placePopupBackdrop.classList.add("open");
        placePopupDrawer.classList.add("open");
        document.body.style.overflow = "hidden";
        lucide.createIcons();
    }

    // =========================================
    // FLOWCHART RENDERER & SVG CONNECTORS
    // =========================================
    function renderItineraryFlowchart(customItinerary, startCity, destCity, onEditCallback) {
        if (!flowchartNodesTree) return;
        flowchartNodesTree.innerHTML = "";

        // 1. START NODE (Trip Origin Checkpoint)
        const startNode = document.createElement("div");
        startNode.className = "fc-node fc-start";
        startNode.innerHTML = `
            <div class="fc-node-header">
                <span class="fc-badge">✈️ TRIP ORIGIN</span>
                <span style="font-size: 0.72rem; color: #34d399; font-weight: 700;">START CHECKPOINT</span>
            </div>
            <div class="fc-node-title">Departure from ${startCity}</div>
            <div class="fc-node-desc">Transfers, airport check-in, and official commencement of journey to ${destCity}.</div>
        `;
        flowchartNodesTree.appendChild(startNode);

        // 2. DAY MILESTONES & SIGHT CHIPS NODES
        customItinerary.forEach((day, index) => {
            const node = document.createElement("div");
            node.className = "fc-node fc-day";
            node.dataset.index = index;

            // Extract sights/places keywords from description
            const placeMatches = day.description.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
            const commonWords = new Set(["After", "Breakfast", "Hotel", "Reach", "Proceed", "Visit", "Enjoy", "Check", "Overnight", "Stay", "Enroute", "Return", "Direct", "Tour", "Drive", "Arrive", "Airport", "Station"]);
            const sightsSet = new Set();
            
            placeMatches.forEach(p => {
                if (p.length > 3 && !commonWords.has(p)) {
                    sightsSet.add(p);
                }
            });

            const sightsList = Array.from(sightsSet).slice(0, 4);

            let sightsHTML = "";
            if (sightsList.length > 0) {
                sightsHTML = `<div class="fc-sights-grid">`;
                sightsList.forEach(sight => {
                    sightsHTML += `<span class="fc-sight-chip" data-sight="${sight}" data-day="${day.day}"><i data-lucide="map-pin"></i> ${sight}</span>`;
                });
                sightsHTML += `</div>`;
            }

            node.innerHTML = `
                <div class="fc-node-header">
                    <span class="fc-badge">${day.day} MILESTONE</span>
                    <span style="font-size: 0.7rem; color: var(--accent); font-weight: 700; display: inline-flex; align-items: center; gap: 0.2rem;">
                        <i data-lucide="info" style="width:0.7rem;height:0.7rem"></i> Click place for details
                    </span>
                </div>
                <div class="fc-node-title" contenteditable="true" data-index="${index}">${day.title}</div>
                <div class="fc-node-desc">${day.description.substring(0, 130)}...</div>
                ${sightsHTML}
            `;

            // Inline editing listener on node title
            const titleEl = node.querySelector(".fc-node-title");
            titleEl.addEventListener("click", (e) => e.stopPropagation());
            titleEl.addEventListener("input", (e) => {
                const idx = parseInt(e.target.dataset.index);
                customItinerary[idx].title = e.target.textContent.trim();
                onEditCallback();
            });

            // Node click listener to open place popup for main title
            node.addEventListener("click", () => {
                openPlaceDetailsPopup(day.title, day.day, day.description, destCity);
            });

            // Sight chips click listeners
            node.querySelectorAll(".fc-sight-chip").forEach(chip => {
                chip.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const sightName = chip.dataset.sight;
                    openPlaceDetailsPopup(sightName, day.day, day.description, destCity);
                });
            });

            flowchartNodesTree.appendChild(node);
        });

        // 3. END NODE (Trip Destination Checkpoint)
        const endNode = document.createElement("div");
        endNode.className = "fc-node fc-end";
        endNode.innerHTML = `
            <div class="fc-node-header">
                <span class="fc-badge">🏁 DESTINATION RETURN</span>
                <span style="font-size: 0.72rem; color: #f472b6; font-weight: 700;">END CHECKPOINT</span>
            </div>
            <div class="fc-node-title">Return to ${startCity}</div>
            <div class="fc-node-desc">Final souvenir shopping, hotel check-out, and return journey home.</div>
        `;
        flowchartNodesTree.appendChild(endNode);

        lucide.createIcons();
    }

    // DRAW SVG CONNECTOR LINES BETWEEN NODES
    function drawFlowchartConnectors() {
        if (!flowchartSvgConnectors || !flowchartNodesTree) return;
        
        const canvasRect = plannerFlowchartCanvas.getBoundingClientRect();
        flowchartSvgConnectors.setAttribute("width", canvasRect.width);
        flowchartSvgConnectors.setAttribute("height", canvasRect.height);

        const nodes = flowchartNodesTree.querySelectorAll(".fc-node");
        if (nodes.length < 2) return;

        let pathSvg = "";

        for (let i = 0; i < nodes.length - 1; i++) {
            const current = nodes[i].getBoundingClientRect();
            const next = nodes[i + 1].getBoundingClientRect();

            const x1 = (current.left + current.right) / 2 - canvasRect.left;
            const y1 = current.bottom - canvasRect.top;
            const x2 = (next.left + next.right) / 2 - canvasRect.left;
            const y2 = next.top - canvasRect.top;

            // Vertical line with subtle control curves
            const midY = (y1 + y2) / 2;
            pathSvg += `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6 4" fill="none" opacity="0.75" />`;
        }

        flowchartSvgConnectors.innerHTML = pathSvg;
    }

    init();
});

