# Student Learning API Integration Documentation

This document describes the external APIs integrated into the backend and their corresponding routes. All external APIs are encapsulated behind backend endpoints to protect secrets and ensure standardized error handling and caching.

## 1. Open Library
- **Purpose:** Search books and retrieve book details.
- **Endpoint:** GET /api/resources/books/search?q={query}&limit={limit} and GET /api/resources/books/:id\n- **Authentication:** None required.
- **Environment:** OPENLIBRARY_BASE_URL=https://openlibrary.org\n- **Caching:** Responses are cached via Supabase pi_cache for 24 hours.

## 2. Gutendex
- **Purpose:** Search for free public domain ebooks.
- **Endpoint:** GET /api/resources/ebooks/search?q={query}\n- **Authentication:** None required.
- **Environment:** GUTENDEX_BASE_URL=https://gutendex.com\n- **Caching:** Responses are cached for 24 hours.

## 3. Free Dictionary
- **Purpose:** Fetch definitions, phonetics, and synonyms.
- **Endpoint:** GET /api/learning/dictionary/:word\n- **Authentication:** None required.
- **Environment:** DICTIONARY_BASE_URL=https://api.dictionaryapi.dev\n- **Caching:** Responses are cached for 7 days.

## 4. OpenAlex
- **Purpose:** Search for scientific/scholarly works.
- **Endpoint:** GET /api/research/search?q={query}&limit={limit}\n- **Authentication:** Polite pool email specified via OPENALEX_MAILTO.
- **Environment:** OPENALEX_BASE_URL=https://api.openalex.org\n- **Caching:** Responses are cached for 24 hours.

## 5. arXiv
- **Purpose:** Search computer science, physics, and math preprints.
- **Endpoint:** GET /api/research/arxiv?q={query}&max_results={limit}\n- **Authentication:** None required.
- **Environment:** ARXIV_BASE_URL=https://export.arxiv.org/api/query\n- **Caching:** Responses are cached for 24 hours.

## 6. Newton
- **Purpose:** Deterministic math operations (simplify, factor, derive, etc.)
- **Endpoint:** POST /api/learning/math/solve\n- **Authentication:** None required.
- **Environment:** NEWTON_BASE_URL=https://newton.vercel.app/api/v2\n
## 7. Judge0 CE
- **Purpose:** Securely execute code submissions.
- **Endpoint:** GET /api/code/languages, POST /api/code/submit, GET /api/code/submissions/:token\n- **Authentication:** API keys or tokens passed in headers
- **Environment:** JUDGE0_BASE_URL, JUDGE0_API_KEY, JUDGE0_AUTH_USER, JUDGE0_AUTH_TOKEN\n