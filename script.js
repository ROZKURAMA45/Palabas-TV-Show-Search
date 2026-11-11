
/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// STEP 6 — Favorites feature
const favoritesContainer = document.getElementById("favorites");

// Load saved favorites from localStorage.
let favorites = [];

try {
  favorites = JSON.parse(
    localStorage.getItem("palabasFavorites") || "[]"
  );
} catch (error) {
  favorites = [];
}

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// STEP 6 — Save and display favorite shows

// Save the current favorites to localStorage.
function saveFavorites() {
  localStorage.setItem("palabasFavorites", JSON.stringify(favorites));
}

// Display all saved favorite shows.
function renderFavorites() {
  favoritesContainer.innerHTML = "";

  if (favorites.length === 0) {
    favoritesContainer.appendChild(
      el("p", "", "No favorite shows yet.")
    );
    return;
  }

  favorites.forEach((show) => {
    const card = el("button", "card");
    card.type = "button";
    card.dataset.id = show.id;

    const rating = show.rating?.average;

    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el(
        "span",
        "rating",
        rating ? `★ ${rating}` : "Not rated yet"
      )
    );

    favoritesContainer.appendChild(card);
  });
}

// Add or remove a show from the favorites list.
function toggleFavorite(show) {
  const existingIndex = favorites.findIndex(
    (favorite) => favorite.id === show.id
  );

  if (existingIndex !== -1) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push(show);
  }

  saveFavorites();
  renderFavorites();

  const favoriteButton = detailsBody.querySelector(".favorite-toggle");

  if (favoriteButton) {
    favoriteButton.textContent = favorites.some(
      (favorite) => favorite.id === show.id
    )
      ? "Remove from Favorites"
      : "Add to Favorites";
  }
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array



// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form

function renderResults(items) {
  results.innerHTML = "";

  items.forEach((item) => {
    const show = item.show;

    const card = el("button", "card");
    card.type = "button";
    card.dataset.id = show.id;

    const rating = show.rating?.average;

    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", (show.genres || []).join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );

    results.appendChild(card);
  });
}

// This function searches for TV shows using the provided search term.
async function searchShows(query) {
  setStatus(`Searching for "${query}"...`, "loading");

  results.innerHTML = "";

  try {
    const data = await getJSON(searchURL(query));

    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }

    renderResults(data);

    setStatus(
      `${data.length} ${data.length === 1 ? "show" : "shows"} found for "${query}".`
    );

  } catch (error) {
    setStatus(error.message, "error");
  }
}

// This listener handles the search form when the user submits it.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const query = input.value.trim();

  if (query === "") return;

  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check

async function getJSON(url) {
  let response;

  // Handle network connection errors.
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      "Can't reach the server. Please check your internet connection."
    );
  }

  // Handle too many requests.
  if (response.status === 429) {
    throw new Error(
      "Too many requests (429). Please wait 10 seconds and try again."
    );
  }

  // Handle other unsuccessful responses.
  if (!response.ok) {
    if (USE_SAMPLE_DATA) {
      throw new Error(
        "Sample mode does not have this show. Try friends, office, breaking bad, stranger things, sherlock, or thrones."
      );
    }

    throw new Error(`Request failed (HTTP ${response.status}).`);
  }

  return response.json();
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)

// STEP 5 — Display show details, cast, and seasons.
function renderDetails(show, cast, seasons) {
  detailsBody.innerHTML = "";

  const container = el("div", "detail-content");

  // Display the show title and poster.
  container.appendChild(el("h2", "", show.name));
  container.appendChild(createPoster(show, "original"));

  // Get the network or web channel name.
  const network =
    show.network?.name || show.webChannel?.name || "Not available";

  // Get the runtime, including the average runtime when available.
  const runtime =
    show.averageRuntime ?? show.runtime ?? "Not available";

  // Display the show's basic information.
  container.appendChild(
    el(
      "p",
      "",
      `${yearRange(show)} · ${network} · ${
        (show.genres || []).join(", ") || "No genres available"
      } · ${runtime} minutes`
    )
  );

  // Display the show's rating.
  container.appendChild(
    el(
      "p",
      "",
      `Rating: ${show.rating?.average ?? "Not rated yet"}`
    )
  );

  // Display the show summary.
  container.appendChild(el("h3", "", "Summary"));
  container.appendChild(
    el("p", "", stripTags(show.summary || "No summary available."))
  );

  // STEP 6 — Add or remove the show from favorites.
  const favoriteButton = el(
    "button",
    "favorite-toggle",
    favorites.some((favorite) => favorite.id === show.id)
      ? "Remove from Favorites"
      : "Add to Favorites"
  );

  favoriteButton.type = "button";

  favoriteButton.addEventListener("click", () => {
    toggleFavorite(show);
  });

  container.appendChild(favoriteButton);

  // Display the total number of seasons.
  container.appendChild(el("h3", "", "Seasons"));

  const seasonCount = seasons.length;

  container.appendChild(
    el(
      "p",
      "",
      `${seasonCount} ${seasonCount === 1 ? "season" : "seasons"}`
    )
  );

  // Display up to 6 cast members and their characters.
  container.appendChild(el("h3", "", "Cast"));

  const castList = el("ul", "");

  cast.slice(0, 6).forEach((person) => {
    const actor = person.person?.name || "Unknown actor";
    const character = person.character?.name || "Unknown character";

    castList.appendChild(
      el("li", "", `${actor} as ${character}`)
    );
  });

  if (cast.length === 0) {
    castList.appendChild(
      el("li", "", "No cast information available.")
    );
  }

  container.appendChild(castList);

  // Add a link to the show's TVmaze page.
  if (show.url) {
    const link = el("a", "", "View on TVmaze");
    link.href = show.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    container.appendChild(link);
  }

  detailsBody.appendChild(container);
}

// This function loads show details, cast, and seasons simultaneously.
async function showDetails(id) {
  detailsBody.innerHTML = "<p>Loading show details...</p>";
  dialog.showModal();

  const startTime = performance.now();

  try {
    // Send all three requests at the same time.
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id))
    ]);

    // Calculate and display the total request time.
    const duration = Math.round(performance.now() - startTime);
    console.log(`3 requests in ${duration} ms`);

    // Display the retrieved information.
    renderDetails(show, cast, seasons);

  } catch (error) {
    detailsBody.innerHTML = "";

    detailsBody.appendChild(
      el("p", "error", error.message)
    );
  }
}

// This listener detects clicks on TV show cards.
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");

  if (!card) return;

  const id = card.dataset.id;

  showDetails(id);
});

// STEP 6 — Open show details from the favorites list.
favoritesContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".card");

  if (!card) return;

  showDetails(card.dataset.id);
});

// Display saved favorites when the page loads.
renderFavorites();
