# 🎬 CineStream

Uma aplicação web moderna para exploração de filmes e trailers em tempo real, construída com **JavaScript Vanilla**, consumindo a API oficial do **The Movie Database (TMDb)**.

---

## 🚀 Demonstração

🔗 **Acesse online:** [https://SEU_USUARIO.github.io/cinestream/](https://SEU_USUARIO.github.io/cinestream/)

---

## 📌 Funcionalidades

* **Catálogo Dinâmico & Hero Banner:** Destaque automático da estreia da semana com sinopse e backdrop oficial em alta resolução.
* **Busca Global com Debounce:** Pesquisa integrada a todo o catálogo do TMDb com delay de digitação (400ms) para otimizar requisições de rede.
* **Filtro Combinado:** Filtragem por categorias de gênero (*Ação, Animação, Drama, Ficção Científica*) combinada em tempo real com o termo de busca.
* **Persistência de Favoritos (`localStorage`):** Armazenamento de objetos completos de filmes, permitindo navegar pelos títulos favoritados offline ou fora da lista de populares.
* **Modal de Trailer & Ficha Técnica:**
  * Reprodução de trailers oficiais do YouTube com busca inteligente de chaves de vídeo.
  * Modal informativo com duração em minutos, ano de lançamento, nota e gêneros detalhados.
* **Rolagem Infinita (*Infinite Scroll*):** Paginação contínua e assíncrona gerenciada via `IntersectionObserver`.
* **Resiliência Visual & UI:**
  * *Skeleton Loading* animado com efeito shimmer durante o carregamento de páginas.
  * Fallback nativo em SVG inline para filmes sem cartaz ou com falha de carregamento (404).
  * Animações suaves de entrada nos modais com `backdrop-filter` e curvas cúbicas.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5:** Estrutura semântica e acessibilidade básica.
* **CSS3 Moderno:** CSS Grid, Flexbox, variáveis, animações nativas (`@keyframes`) e efeito de vidro fosco (`backdrop-filter`).
* **JavaScript (ES6+):** Manipulação de DOM, `async/await`, Fetch API, `IntersectionObserver`, `localStorage` e eventos delegados.
* **TMDb API:** Fonte de dados para filmes, imagens e trailers.

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone [https://github.com/SEU_USUARIO/cinestream.git](https://github.com/SEU_USUARIO/cinestream.git)
