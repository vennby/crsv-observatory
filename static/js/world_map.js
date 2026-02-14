/* ============================================
   Map Initialization
   ============================================ */
const map = L.map("map", {
  center: [20, 0],
  zoom: 2,
  minZoom: 2,
  worldCopyJump: true,
  zoomAnimation: true,
});

// Dark base (empty tile layer)
L.tileLayer("", {}).addTo(map);

/* ============================================
   Global Variables
   ============================================ */
let countryLayer;
let allLayers = [];
let countryCodeMap = {};
let currentlyHoveredLayer = null;
let selectedCountry = null;
let timelineData = [];
let tooltip = null;

/* ============================================
   Country Styles
   ============================================ */
const baseCountryStyle = {
  color: "#ffffff40",
  weight: 1,
  fillColor: "#1a1a1a",
  fillOpacity: 0.8,
};

const searchHighlightStyle = {
  color: "#ff6a00",
  weight: 2.5,
  fillColor: "#ff6a00",
  fillOpacity: 0.3,
};

const hoverStyle = {
  color: "#fff",
  weight: 2,
  fillOpacity: 0.15,
};

/* ============================================
   Country Event Mapping
   ============================================ */
const countryEventMap = {
  "Japan": ["comfort_women_wwii", "nanjing_massacre"],
  "China": ["nanjing_massacre"],
  "India": ["partition_india", "hyderabad_massacres"],
  "Pakistan": ["partition_india"],
  "Bangladesh": ["partition_india"]
};

/* ============================================
   Map Loading and Initialization
   ============================================ */
function initializeMap() {
  Promise.all([
    fetch("/api/country-codes").then((res) => res.json()),
    fetch("/static/world.geojson").then((res) => res.json()),
  ]).then(([codeMap, geoData]) => {
    countryCodeMap = codeMap;
    enrichGeoDataWithNames(geoData);
    createCountryLayer(geoData);
  });
}

function enrichGeoDataWithNames(geoData) {
  geoData.features.forEach((feature) => {
    const code = feature.properties.cca2?.toUpperCase();
    if (code && countryCodeMap[code]) {
      feature.properties.name = countryCodeMap[code];
    } else {
      feature.properties.name = code || "Unknown";
    }
  });
}

function createCountryLayer(geoData) {
  countryLayer = L.geoJSON(geoData, {
    style: baseCountryStyle,
    onEachFeature: (feature, layer) => {
      allLayers.push({ layer, feature });
      attachCountryLayerEvents(feature, layer);
    },
  }).addTo(map);
}

function attachCountryLayerEvents(feature, layer) {
  layer.on({
    click: () => handleCountryClick(feature, layer),
    mousemove: (e) => handleCountryHover(e, layer),
    mouseleave: () => handleCountryLeave(layer),
  });
}

/* ============================================
   Country Interaction Handlers
   ============================================ */
function handleCountryClick(feature, layer) {
  selectedCountry = feature.properties.name;
  const bounds = layer.getBounds();
  map.flyToBounds(bounds, {
    duration: 1.5,
    easeLinearity: 0.25,
  });
  openPanel(feature.properties.name);
}

function handleCountryHover(e, layer) {
  const name = layer.feature.properties.name;
  createTooltip(name, e.originalEvent.clientX + 10, e.originalEvent.clientY - 20);

  // Reset previously hovered layer
  if (currentlyHoveredLayer && currentlyHoveredLayer !== layer) {
    resetLayerStyle(currentlyHoveredLayer);
  }

  // Apply hover style
  if (!layer.isSearchHighlighted) {
    layer.setStyle(hoverStyle);
  }
  currentlyHoveredLayer = layer;
}

function handleCountryLeave(layer) {
  removeTooltip();
  if (currentlyHoveredLayer === layer) {
    currentlyHoveredLayer = null;
  }
  resetLayerStyle(layer);
}

function resetLayerStyle(layer) {
  if (!layer.isSearchHighlighted) {
    layer.setStyle(baseCountryStyle);
  } else {
    layer.setStyle(searchHighlightStyle);
  }
}

/* ============================================
   Side Panel Functions
   ============================================ */
function openPanel(countryName) {
  selectedCountry = countryName;
  const panel = document.getElementById("sidePanel");

  // Set country name
  document.getElementById("panelCountryName").textContent = countryName;

  // Fetch and display country description
  fetchCountryDescription(countryName);

  // Display related events
  if (timelineData.length === 0) {
    // Timeline data not pre-loaded, fetch it
    fetch("/data/timeline.json")
      .then(res => res.json())
      .then(data => {
        timelineData = data;
        displayRelatedEvents(countryName);
      });
  } else {
    displayRelatedEvents(countryName);
  }

  // Show the panel
  panel.classList.add("active");
}

function closePanel() {
  document.getElementById("sidePanel").classList.remove("active");
  selectedCountry = null;
}

function fetchCountryDescription(countryName) {
  fetch("/api/country/" + encodeURIComponent(countryName))
    .then(res => res.json())
    .then(data => {
      // Display main description
      document.getElementById("panelCountryDescription").textContent =
        data.description || "No description available for this country.";

      // Display basic information
      const basicInfoSection = document.getElementById("basicInfoSection");
      const basicInfoContent = document.getElementById("basicInfoContent");
      
      const basicInfo = [];
      if (data.region) basicInfo.push({ label: "Region", value: data.region });
      if (data.capital) basicInfo.push({ label: "Capital", value: data.capital });
      if (data.population) basicInfo.push({ label: "Population", value: data.population });

      if (basicInfo.length > 0) {
        basicInfoContent.innerHTML = basicInfo.map(info => `
          <div class="info-item">
            <div class="info-item-label">${info.label}</div>
            <div class="info-item-value">${info.value}</div>
          </div>
        `).join("");
        basicInfoSection.style.display = "block";
      }

      // Display historical context
      const historicalContext = document.getElementById("historicalContext");
      const historicalText = document.getElementById("historicalText");
      
      if (data.historicalContext) {
        historicalText.textContent = data.historicalContext;
        historicalContext.style.display = "block";
      } else {
        historicalContext.style.display = "none";
      }
    })
    .catch(() => {
      document.getElementById("panelCountryDescription").textContent =
        "Information about this country is not available.";
      document.getElementById("basicInfoSection").style.display = "none";
      document.getElementById("historicalContext").style.display = "none";
    });
}

function displayRelatedEvents(countryName) {
  const relatedEventIds = countryEventMap[countryName] || [];
  const relatedEvents = timelineData.filter(e => relatedEventIds.includes(e.id));

  const container = document.getElementById("crsvEventsContainer");
  const eventsList = document.getElementById("crsvEventsList");

  if (relatedEvents.length > 0) {
    eventsList.innerHTML = relatedEvents.map(event => `
      <div class="timeline-event" onclick="navigateToEvent('${event.id}')">
        <div class="event-date">${event.date}</div>
        <div class="event-title">${event.text}</div>
        <div class="event-description">${event.description.substring(0, 100)}...</div>
      </div>
    `).join("");
    container.style.display = "block";
  } else {
    container.style.display = "none";
  }
}

function viewCountryDetails() {
  if (selectedCountry) {
    window.location.href = "/country/" + encodeURIComponent(selectedCountry);
  }
}

function navigateToEvent(eventId) {
  window.location.href = "/event/" + eventId;
}

/* ============================================
   Tooltip Functions
   ============================================ */
function createTooltip(text, x, y) {
  if (tooltip) {
    tooltip.remove();
  }
  tooltip = document.createElement("div");
  tooltip.className = "country-tooltip";
  tooltip.textContent = text;
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
  document.body.appendChild(tooltip);
}

function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

/* ============================================
   Search Functionality
   ============================================ */
const searchInput = document.getElementById("countrySearch");
const searchResults = document.getElementById("searchResults");
const searchResultsList = document.getElementById("searchResultsList");
let filteredLayers = [];

searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("focus", () => searchInput.select());
document.addEventListener("click", handleOutsideClick);

function handleSearchInput() {
  const query = searchInput.value.toLowerCase().trim();
  filteredLayers = [];
  let matchCount = 0;

  if (!countryLayer) return;

  // Filter countries matching search query
  countryLayer.eachLayer((layer) => {
    const name = layer.feature.properties.name?.toLowerCase() || "";
    const isMatch = query && name.includes(query);

    if (isMatch) {
      layer.setStyle(searchHighlightStyle);
      layer.isSearchHighlighted = true;
      filteredLayers.push({ layer, name: layer.feature.properties.name });
      matchCount++;
    } else {
      resetLayerStyle(layer);
      layer.isSearchHighlighted = false;
    }
  });

  // Update search results dropdown
  updateSearchResults(query, matchCount);
}

function updateSearchResults(query, matchCount) {
  if (query && matchCount > 0) {
    displaySearchResults();
  } else if (!query) {
    clearSearchHighlights();
  } else {
    searchResults.classList.remove("active");
  }
}

function displaySearchResults() {
  searchResults.classList.add("active");
  searchResultsList.innerHTML = filteredLayers
    .map((item, index) => `
      <li class="search-result-item" data-index="${index}">
        <span class="country-name">${item.name}</span>
        <span class="select-icon">→</span>
      </li>
    `)
    .join("");

  // Attach click handlers to dropdown items
  document.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => handleSearchResultClick(item));
  });
}

function handleSearchResultClick(item) {
  const index = parseInt(item.dataset.index);
  const selectedLayer = filteredLayers[index].layer;
  handleCountryClick(selectedLayer.feature, selectedLayer);
  searchInput.value = "";
  searchResults.classList.remove("active");
  currentlyHoveredLayer = null;
  clearSearchHighlights();
}

function clearSearchHighlights() {
  searchResults.classList.remove("active");
  currentlyHoveredLayer = null;
  countryLayer.eachLayer((layer) => {
    layer.setStyle(baseCountryStyle);
    layer.isSearchHighlighted = false;
  });
}

function handleOutsideClick(e) {
  if (!e.target.closest(".search-container") && !e.target.closest("#searchResults")) {
    searchResults.classList.remove("active");
  }
}

/* ============================================
   Page Initialization
   ============================================ */
window.addEventListener("load", () => {
  // Pre-load timeline data
  fetch("/data/timeline.json")
    .then(res => res.json())
    .then(data => {
      timelineData = data;
    })
    .catch(err => console.error("Failed to load timeline data:", err));
});

// Initialize map when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMap);
} else {
  initializeMap();
}
