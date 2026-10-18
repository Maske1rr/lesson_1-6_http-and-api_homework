// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.

console.log('API storefront starter is ready');

const API_URL = "http://localhost:3000/movies";
const REQUEST_TIMEOUT_MS = 5000;
const JSON_HEADERS = { "Content-Type": "application/json" };
const STATUS_MODIFIERS = ["status--loading", "status--success", "status--error"];

const endpointValue = document.querySelector('[data-ui="endpoint"]');
const statusBox = document.querySelector('[data-ui="status"]');
const statusTitle = statusBox.querySelector(".status__title");
const statusText = statusBox.querySelector(".status__text");
const collection = document.querySelector('[data-ui="collection"]');
const reloadButton = document.querySelector('[data-action="reload"]');
const filtersForm = document.querySelector('[data-form="filters"]');
const filterGenre = filtersForm.elements["genre"];
const resetFiltersButton = filtersForm.querySelector('[data-action="reset-filters"]');
const form = document.querySelector('[data-form="entry"]');
const formGenre = form.elements["genre"];
const submitButton = form.querySelector('[data-action="submit"]');
const formMessage = form.querySelector('[data-ui="form-message"]');

let movies = [];
let lastLoadId = 0;
let isLoading = false;
const pendingIds = new Set();

function setStatus(type, title, text) {
  statusBox.classList.remove(...STATUS_MODIFIERS);

  if (type) {
    statusBox.classList.add(`status--${type}`);
  }

  statusTitle.textContent = title;
  statusText.textContent = text;
}

function showFormMessage(type, text) {
  formMessage.classList.remove("entry-form__message--success", "entry-form__message--error");
  formMessage.classList.add(`entry-form__message--${type}`);
  formMessage.textContent = text;
  formMessage.hidden = false;
}

async function request(url, options = {}) {
  const method = options.method ?? "GET";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });

    if (!response.ok) {
      const error = new Error(`${method} ${url} вернул статус ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`${method} ${url} не ответил за ${REQUEST_TIMEOUT_MS} мс`);
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function describeError(error) {
  if (error.name === "TimeoutError") {
    return `Сервер не ответил за ${REQUEST_TIMEOUT_MS / 1000} секунд.`;
  }

  if (error.status === 404) {
    return "Запись или ресурс не найдены (ошибка 404).";
  }

  if (error.status) {
    return `Сервер вернул ошибку ${error.status}.`;
  }

  return "API недоступен. Проверьте, что он запущен командой npm run dev.";
}

function movieUrl(id) {
  return `${API_URL}/${encodeURIComponent(id)}`;
}

function fetchMovies(params) {
  const query = params.toString();
  return request(query ? `${API_URL}?${query}` : API_URL);
}

function createMovie(movie) {
  return request(API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(movie),
  });
}

function updateMovie(id, changes) {
  return request(movieUrl(id), {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(changes),
  });
}

function deleteMovie(id) {
  return request(movieUrl(id), { method: "DELETE" });
}

function readFilterParams() {
  const formData = new FormData(filtersForm);
  const params = new URLSearchParams();

  if (formData.get("genre")) {
    params.set("genre", formData.get("genre"));
  }

  if (formData.get("sort")) {
    params.set("_sort", formData.get("sort"));
  }

  return params;
}

function createMovieCard(movie) {
  const isPending = pendingIds.has(movie.id);

  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = movie.title;

  const meta = document.createElement("ul");
  meta.className = "card__meta";

  [`Жанр: ${movie.genre}`, `Год выхода: ${movie.year}`, `Рейтинг: ${movie.rating} из 10`].forEach(
    (text) => {
      const item = document.createElement("li");
      item.textContent = text;
      meta.append(item);
    },
  );

  const actions = document.createElement("div");
  actions.className = "card__actions";

  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = movie.watched ? "card__badge card__badge--watched" : "card__badge";
  badge.textContent = movie.watched ? "Просмотрен" : "Хочу посмотреть";
  badge.title = "Нажмите, чтобы изменить статус";
  badge.dataset.action = "toggle-watched";
  badge.dataset.id = movie.id;
  badge.setAttribute("aria-pressed", String(movie.watched));
  badge.disabled = isPending;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "card__delete";
  deleteButton.textContent = "Удалить";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = movie.id;
  deleteButton.setAttribute("aria-label", `Удалить фильм «${movie.title}»`);
  deleteButton.disabled = isPending;

  actions.append(badge, deleteButton);
  card.append(title, meta, actions);
  return card;
}

function renderMovies() {
  collection.replaceChildren(...movies.map(createMovieCard));
}

async function loadMovies() {
  const loadId = ++lastLoadId;
  const params = readFilterParams();
  const hasFilters = params.toString() !== "";

  isLoading = true;
  reloadButton.disabled = true;
  collection.replaceChildren();
  setStatus("loading", "Загрузка", "Получаем список фильмов с сервера.");

  try {
    const data = await fetchMovies(params);

    if (loadId !== lastLoadId) {
      return;
    }

    movies = data;
    renderMovies();

    if (movies.length > 0) {
      setStatus("success", "Фильмы загружены", `Показано фильмов: ${movies.length}.`);
    } else if (hasFilters) {
      setStatus("", "Ничего не найдено", "По выбранным условиям фильмов нет. Нажмите «Сбросить».");
    } else {
      setStatus("", "Список пуст", "В коллекции пока нет фильмов. Добавьте первый через форму.");
    }
  } catch (error) {
    if (loadId !== lastLoadId) {
      return;
    }

    movies = [];
    console.error("Не удалось загрузить фильмы:", error);
    setStatus(
      "error",
      "Не удалось загрузить фильмы",
      `${describeError(error)} Нажмите «Обновить», чтобы повторить.`,
    );
  } finally {
    if (loadId === lastLoadId) {
      isLoading = false;
      reloadButton.disabled = false;
    }
  }
}

function findMovie(id) {
  return movies.find((movie) => movie.id === id);
}

async function toggleWatched(id) {
  const movie = findMovie(id);

  if (!movie || pendingIds.has(id)) {
    return;
  }

  const previousWatched = movie.watched;
  movie.watched = !previousWatched;
  pendingIds.add(id);
  renderMovies();

  try {
    const savedMovie = await updateMovie(id, { watched: movie.watched });
    const currentMovie = findMovie(id);

    if (currentMovie) {
      Object.assign(currentMovie, savedMovie);
    }
  } catch (error) {
    const currentMovie = findMovie(id);

    if (currentMovie) {
      currentMovie.watched = previousWatched;
    }

    console.error("Не удалось изменить статус фильма:", error);
    setStatus("error", `Статус фильма «${movie.title}» не изменен`, describeError(error));
  } finally {
    pendingIds.delete(id);

    if (!isLoading) {
      renderMovies();
    }
  }
}

async function removeMovie(id) {
  const movie = findMovie(id);

  if (!movie || pendingIds.has(id)) {
    return;
  }

  if (!confirm(`Удалить фильм «${movie.title}»?`)) {
    return;
  }

  pendingIds.add(id);
  renderMovies();

  try {
    await deleteMovie(id);
    await loadMovies();
  } catch (error) {
    console.error("Не удалось удалить фильм:", error);
    setStatus("error", `Фильм «${movie.title}» не удален`, describeError(error));
  } finally {
    pendingIds.delete(id);

    if (!isLoading) {
      renderMovies();
    }
  }
}

function readMovieFromForm() {
  const formData = new FormData(form);

  return {
    title: formData.get("title").trim(),
    genre: formData.get("genre"),
    year: Number(formData.get("year")),
    rating: Number(formData.get("rating")),
    watched: formData.has("watched"),
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  const movie = readMovieFromForm();

  submitButton.disabled = true;
  formMessage.hidden = true;

  try {
    await createMovie(movie);
    form.reset();
    showFormMessage("success", `Фильм «${movie.title}» добавлен.`);
    await loadMovies();
  } catch (error) {
    console.error("Не удалось добавить фильм:", error);
    showFormMessage(
      "error",
      `${describeError(error)} Фильм не отправлен, данные в форме сохранены.`,
    );
  } finally {
    submitButton.disabled = false;
  }
}

function handleCollectionClick(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  if (button.dataset.action === "toggle-watched") {
    toggleWatched(button.dataset.id);
  }

  if (button.dataset.action === "delete") {
    removeMovie(button.dataset.id);
  }
}

function resetFilters() {
  filtersForm.reset();
  loadMovies();
}

[...formGenre.options]
  .filter((option) => option.value)
  .forEach((option) => filterGenre.append(new Option(option.text, option.value)));

endpointValue.textContent = API_URL;
reloadButton.addEventListener("click", loadMovies);
filtersForm.addEventListener("change", loadMovies);
resetFiltersButton.addEventListener("click", resetFilters);
collection.addEventListener("click", handleCollectionClick);
form.addEventListener("submit", handleSubmit);

loadMovies();
