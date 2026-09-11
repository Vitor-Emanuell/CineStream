// ==========================================================================
// 1. CONFIGURAÇÕES DA API TMDB
// ==========================================================================
const API_KEY = "be999c73dc0668feef43ede8535d2c39";
const BASE_API_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

// SVG Puro codificado via URL para nunca quebrar aspas nem atributos HTML
const SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750" width="500" height="750">
  <rect width="500" height="750" fill="#0d2538"/>
  <g transform="translate(190, 270)">
    <rect x="4" y="8" width="112" height="90" rx="16" fill="#e63946"/>
    <path d="M4 30H116" stroke="#011627" stroke-width="8"/>
    <path d="M32 8L22 30" stroke="#011627" stroke-width="8" stroke-linecap="round"/>
    <path d="M66 8L56 30" stroke="#011627" stroke-width="8" stroke-linecap="round"/>
    <path d="M100 8L90 30" stroke="#011627" stroke-width="8" stroke-linecap="round"/>
    <polygon points="50,48 80,64 50,80" fill="#ffffff"/>
  </g>
  <text x="50%" y="420" fill="#90e0ef" font-family="Arial, sans-serif" font-size="22" font-weight="bold" text-anchor="middle">SEM PÔSTER</text>
  <text x="50%" y="450" fill="#e0e1dd" font-family="Arial, sans-serif" font-size="14" text-anchor="middle">CineStream</text>
</svg>`;

const FALLBACK_POSTER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG_RAW)}`;

// Função global segura para lidar com erro de imagem sem quebrar atributos HTML
window.handleImageError = function (img) {
  img.onerror = null; // Evita loop infinito caso o fallback falhe
  img.src = FALLBACK_POSTER;
};

const GENRES_MAP = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  18: "Drama",
  14: "Fantasia",
  878: "Ficção Científica",
  53: "Suspense",
};

// Variáveis de Estado
let movies = [];
let featuredMovie = null;
let activeCategory = "Todos";
let debounceTimer = null;

// Estado da Paginação Infinita
let currentPage = 1;
let totalPages = 1;
let currentSearchQuery = "";
let isLoadingMore = false;

// ==========================================================================
// 2. SELEÇÃO DE ELEMENTOS DO DOM
// ==========================================================================
const moviesGrid = document.querySelector(".movies-grid");
const categoryButtons = document.querySelectorAll(".category-pill");
const searchInput = document.querySelector(".search-bar");
const sentinel = document.getElementById("infinite-sentinel");

// Modal de Trailer
const trailerModal = document.getElementById("trailer-modal");
const modalTitle = trailerModal.querySelector(".modal-header h2");
const modalIframe = trailerModal.querySelector(".video-container iframe");
const modalClose = trailerModal.querySelector(".modal-close");
const modalOverlay = trailerModal.querySelector(".modal-overlay");

// Modal de Detalhes
const detailsModal = document.getElementById("details-modal");
const detailsTitle = document.getElementById("details-title");
const detailsBody = document.getElementById("details-body");
const detailsClose = document.querySelector(".details-close");
const detailsOverlay = document.querySelector(".details-overlay");

// Hero Banner
const heroSection = document.querySelector(".featured-hero");
const heroTitle = document.querySelector(".featured-title");
const heroSynopsis = document.querySelector(".featured-synopsis");
const heroTrailerBtn = document.querySelector(".btn-primary");
const heroInfoBtn = document.querySelector(".btn-secondary");

// ==========================================================================
// 3. PERSISTÊNCIA: FAVORITOS SALVOS COMO OBJETOS COMPLETOS
// ==========================================================================
let favorites = JSON.parse(localStorage.getItem("cinestream_favs_v2")) || [];

function saveFavorites() {
  localStorage.setItem("cinestream_favs_v2", JSON.stringify(favorites));
}

// ==========================================================================
// 4. ATUALIZAÇÃO DO BANNER PRINCIPAL
// ==========================================================================
function updateHeroBanner(movie) {
  if (!movie) return;
  featuredMovie = movie;

  heroTitle.textContent = movie.title;
  heroSynopsis.textContent =
    movie.overview || "Sinopse não disponível no momento.";

  if (movie.backdrop) {
    heroSection.style.backgroundImage = `
      linear-gradient(
        to right,
        rgba(1, 22, 39, 0.95) 20%,
        rgba(1, 22, 39, 0.6) 55%,
        rgba(1, 22, 39, 0.15) 100%
      ),
      url("${movie.backdrop}")
    `;
  }
}

// ==========================================================================
// 5. SKELETON LOADING
// ==========================================================================
function renderSkeletons(count = 8) {
  const skeletonCard = `
    <article class="skeleton-card">
      <div class="skeleton-poster"></div>
      <div class="skeleton-info">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line genre"></div>
        <div class="skeleton-btn"></div>
      </div>
    </article>
  `;

  moviesGrid.innerHTML = skeletonCard.repeat(count);
}

// ==========================================================================
// 6. RENDERIZAÇÃO DOS CARDS
// ==========================================================================
function createMovieCardHTML(movie) {
  const isFav = favorites.some((fav) => fav.id === movie.id);
  return `
    <article class="movie-card" data-genre="${movie.genre}">
      <button type="button" class="btn-fav ${isFav ? "active" : ""}" data-fav-id="${movie.id}" aria-label="Favoritar">
        ${isFav ? "♥" : "♡"}
      </button>
      <img 
        src="${movie.poster}" 
        alt="Pôster de ${movie.title}" 
        class="poster"
        loading="lazy"
        onerror="handleImageError(this)"
      >
      <span class="rating">${movie.rating}</span>
      <div class="movie-info">
        <h2>${movie.title}</h2>
        <span class="genre">${movie.genre}</span>
        <div class="movie-actions">
          <button type="button" class="btn-ticket" data-id="${movie.id}">▶ Trailer</button>
          <button type="button" class="btn-card-info" data-info-id="${movie.id}">ℹ Info</button>
        </div>
      </div>
    </article>
  `;
}

function renderMovies(movieList) {
  if (movieList.length === 0) {
    moviesGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎬</span>
        <h3>Nenhum filme encontrado</h3>
        <p>Tente ajustar sua busca ou selecionar outra categoria no catálogo.</p>
      </div>
    `;
    return;
  }

  moviesGrid.innerHTML = movieList.map(createMovieCardHTML).join("");
}

function appendMovies(newMovies) {
  const newHTML = newMovies.map(createMovieCardHTML).join("");
  moviesGrid.insertAdjacentHTML("beforeend", newHTML);
}

// ==========================================================================
// 7. TRAILER DO YOUTUBE (API TMDB)
// ==========================================================================
async function getMovieTrailer(movieId) {
  try {
    let response = await fetch(
      `${BASE_API_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=pt-BR`,
    );
    let data = await response.json();
    let video = data.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer",
    );

    if (!video) {
      response = await fetch(
        `${BASE_API_URL}/movie/${movieId}/videos?api_key=${API_KEY}`,
      );
      data = await response.json();
      video =
        data.results.find(
          (v) => v.site === "YouTube" && v.type === "Trailer",
        ) || data.results.find((v) => v.site === "YouTube");
    }

    return video ? `https://www.youtube-nocookie.com/embed/${video.key}` : null;
  } catch (error) {
    console.error("Erro ao buscar trailer:", error);
    return null;
  }
}

async function openModal(movie) {
  if (!movie) return;

  modalTitle.textContent = `${movie.title} — Trailer Oficial`;
  modalIframe.src = "";
  trailerModal.classList.add("open");

  const trailerUrl = await getMovieTrailer(movie.id);

  if (trailerUrl) {
    modalIframe.src = `${trailerUrl}?autoplay=1`;
  } else {
    modalIframe.src =
      "https://www.youtube-nocookie.com/embed/zSWdZVtXT7E?autoplay=1";
  }
}

function closeModal() {
  trailerModal.classList.remove("open");
  modalIframe.src = "";

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }
}

// ==========================================================================
// 8. DETALHES COMPLETOS (MODAL "MAIS INFORMAÇÕES")
// ==========================================================================
async function getMovieDetails(movieId) {
  try {
    const response = await fetch(
      `${BASE_API_URL}/movie/${movieId}?api_key=${API_KEY}&language=pt-BR`,
    );
    if (!response.ok) throw new Error("Erro ao consultar detalhes");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function openDetailsModal(movieId) {
  detailsTitle.textContent = "Carregando...";
  detailsBody.innerHTML = `
    <div class="empty-state" style="border: none; padding: 40px 0;">
      <span class="empty-icon">⏳</span>
      <p>Buscando ficha técnica...</p>
    </div>
  `;
  detailsModal.classList.add("open");

  const movie = await getMovieDetails(movieId);

  if (!movie) {
    detailsBody.innerHTML = `<p class="details-overview">Não foi possível carregar as informações do filme.</p>`;
    return;
  }

  const posterImg = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : FALLBACK_POSTER;

  const releaseYear = movie.release_date
    ? movie.release_date.split("-")[0]
    : "N/A";
  const duration = movie.runtime
    ? `${movie.runtime} min`
    : "Duração indisponível";
  const genreList =
    movie.genres.map((g) => g.name).join(", ") || "Gênero não informado";
  const ratingScore = movie.vote_average
    ? `★ ${movie.vote_average.toFixed(1)}`
    : "★ 0.0";

  detailsTitle.textContent = movie.title;
  detailsBody.innerHTML = `
    <img src="${posterImg}" alt="${movie.title}" class="details-poster" onerror="handleImageError(this)">
    <div class="details-info">
      <div class="details-badges">
        <span class="badge-tag rating-badge">${ratingScore}</span>
        <span class="badge-tag">${releaseYear}</span>
        <span class="badge-tag">${duration}</span>
      </div>
      <p class="badge-tag" style="align-self: flex-start; border-radius: 6px;">${genreList}</p>
      <p class="details-overview">
        ${movie.overview || "Nenhuma sinopse disponível para este título."}
      </p>
    </div>
  `;
}

function closeDetailsModal() {
  detailsModal.classList.remove("open");
  detailsBody.innerHTML = "";
}

// ==========================================================================
// 9. FUNÇÃO CENTRAL DE REQUISIÇÃO (PRIMEIRA PÁGINA)
// ==========================================================================
function buildApiEndpoint(page = 1) {
  if (currentSearchQuery) {
    return `${BASE_API_URL}/search/movie?api_key=${API_KEY}&language=pt-BR&query=${encodeURIComponent(currentSearchQuery)}&page=${page}`;
  }
  return `${BASE_API_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${page}`;
}

async function fetchMovies(isInitialLoad = false) {
  currentPage = 1;
  renderSkeletons(8);

  try {
    const url = buildApiEndpoint(currentPage);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Falha na requisição: ${response.status}`);
    }

    const data = await response.json();
    totalPages = data.total_pages || 1;

    movies = data.results.map((item) => {
      const firstGenreId = item.genre_ids && item.genre_ids[0];
      const genreName = GENRES_MAP[firstGenreId] || "Outro";

      return {
        id: item.id,
        title: item.title,
        overview: item.overview,
        backdrop: item.backdrop_path
          ? `${BACKDROP_BASE_URL}${item.backdrop_path}`
          : null,
        genre: genreName,
        rating: `★ ${item.vote_average ? item.vote_average.toFixed(1) : "0.0"}`,
        poster: item.poster_path
          ? `${IMAGE_BASE_URL}${item.poster_path}`
          : FALLBACK_POSTER,
      };
    });

    if (isInitialLoad && movies.length > 0) {
      updateHeroBanner(movies[0]);
    }

    applyCategoryFilter();
  } catch (error) {
    console.error("Erro ao carregar dados do TMDb:", error);
    moviesGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Erro ao conectar à API</h3>
        <p>Não foi possível carregar os títulos no momento. Verifique sua conexão.</p>
      </div>
    `;
  }
}

// ==========================================================================
// 10. CARREGAMENTO DE PRÓXIMAS PÁGINAS (ROLAGEM INFINITA)
// ==========================================================================
async function loadMoreMovies() {
  if (
    isLoadingMore ||
    currentPage >= totalPages ||
    activeCategory === "Favoritos"
  ) {
    return;
  }

  isLoadingMore = true;
  if (sentinel) sentinel.classList.add("loading");

  try {
    currentPage += 1;
    const url = buildApiEndpoint(currentPage);
    const response = await fetch(url);
    const data = await response.json();

    const newMovies = data.results.map((item) => {
      const firstGenreId = item.genre_ids && item.genre_ids[0];
      const genreName = GENRES_MAP[firstGenreId] || "Outro";

      return {
        id: item.id,
        title: item.title,
        overview: item.overview,
        backdrop: item.backdrop_path
          ? `${BACKDROP_BASE_URL}${item.backdrop_path}`
          : null,
        genre: genreName,
        rating: `★ ${item.vote_average ? item.vote_average.toFixed(1) : "0.0"}`,
        poster: item.poster_path
          ? `${IMAGE_BASE_URL}${item.poster_path}`
          : FALLBACK_POSTER,
      };
    });

    movies = movies.concat(newMovies);

    let moviesToAppend = newMovies;
    if (activeCategory !== "Todos") {
      moviesToAppend = newMovies.filter((m) =>
        m.genre.includes(activeCategory),
      );
    }

    appendMovies(moviesToAppend);
  } catch (error) {
    console.error("Erro ao carregar mais filmes:", error);
  } finally {
    isLoadingMore = false;
    if (sentinel) sentinel.classList.remove("loading");
  }
}

// ==========================================================================
// 11. OBSERVADOR DE INTERSEÇÃO (INTERSECTION OBSERVER)
// ==========================================================================
if (sentinel) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMoreMovies();
      }
    },
    { rootMargin: "200px" },
  );

  observer.observe(sentinel);
}

// ==========================================================================
// 12. FILTROS E EXIBIÇÃO DE FAVORITOS
// ==========================================================================

function applyCategoryFilter() {
  const searchTerm = currentSearchQuery.toLowerCase().trim();

  // Se a categoria for Favoritos, a fonte de dados é o array de favoritos
  let sourceList = activeCategory === "Favoritos" ? favorites : movies;

  const filtered = sourceList.filter((movie) => {
    // 1. Checagem de texto (título do filme)
    const matchesSearch = movie.title.toLowerCase().includes(searchTerm);

    // 2. Checagem de gênero
    let matchesCategory = true;
    if (activeCategory !== "Todos" && activeCategory !== "Favoritos") {
      matchesCategory = movie.genre.includes(activeCategory);
    }

    return matchesSearch && matchesCategory;
  });

  renderMovies(filtered);
}

// ==========================================================================
// 13. OUVINTES DE EVENTOS (INTERAÇÕES)
// ==========================================================================

// Busca Global com Debounce
searchInput.addEventListener("input", (event) => {
  currentSearchQuery = event.target.value.trim();

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    // Se estiver em 'Favoritos', não faz chamada à API: filtra apenas os favoritados salvos
    if (activeCategory === "Favoritos") {
      applyCategoryFilter();
      return;
    }

    // Se estiver em qualquer outra categoria, busca na API e depois aplica os filtros
    fetchMovies();
  }, 400);
});

// Filtro de Categorias
categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.textContent.trim();
    applyCategoryFilter();
  });
});

// Cliques na Grade (Trailer, Informações e Favoritos)
moviesGrid.addEventListener("click", (event) => {
  const trailerBtn = event.target.closest(".btn-ticket");
  if (trailerBtn) {
    const movieId = Number(trailerBtn.getAttribute("data-id"));
    const selectedMovie =
      movies.find((item) => item.id === movieId) ||
      favorites.find((item) => item.id === movieId);

    if (selectedMovie) openModal(selectedMovie);
    return;
  }

  const infoBtn = event.target.closest(".btn-card-info");
  if (infoBtn) {
    const movieId = Number(infoBtn.getAttribute("data-info-id"));
    openDetailsModal(movieId);
    return;
  }

  const favBtn = event.target.closest(".btn-fav");
  if (favBtn) {
    const movieId = Number(favBtn.getAttribute("data-fav-id"));
    const isAlreadyFav = favorites.some((fav) => fav.id === movieId);

    if (isAlreadyFav) {
      favorites = favorites.filter((fav) => fav.id !== movieId);
    } else {
      const movieToAdd =
        movies.find((item) => item.id === movieId) ||
        favorites.find((item) => item.id === movieId);

      if (movieToAdd) favorites.push(movieToAdd);
    }

    saveFavorites();
    applyCategoryFilter();
  }
});

// Cliques nos Botões do Hero Banner
if (heroTrailerBtn) {
  heroTrailerBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (featuredMovie) openModal(featuredMovie);
  });
}

if (heroInfoBtn) {
  heroInfoBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (featuredMovie) openDetailsModal(featuredMovie.id);
  });
}

// Fechamento dos Modais
modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

detailsClose.addEventListener("click", closeDetailsModal);
detailsOverlay.addEventListener("click", closeDetailsModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (trailerModal.classList.contains("open")) closeModal();
    if (detailsModal.classList.contains("open")) closeDetailsModal();
  }
});

// ==========================================================================
// 14. INICIALIZAÇÃO
// ==========================================================================
fetchMovies(true);
