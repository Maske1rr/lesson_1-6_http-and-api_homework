// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.

console.log('API storefront starter is ready');

const API_URL = "http://localhost:3000/movies";
const JSON_HEADERS = { "Content-Type": "application/json" };
const STATUS_MODIFIERS = ["status--loading", "status--success", "status--error"];

const endpointValue = document.querySelector('[data-ui="endpoint"]');
const statusBox = document.querySelector('[data-ui="status"]');
const statusTitle = statusBox.querySelector(".status__title");
const statusText = statusBox.querySelector(".status__text");
const collection = document.querySelector('[data-ui="collection"]');
const reloadButton = document.querySelector('[data-action="reload"]');
const form = document.querySelector('[data-form="entry"]');
const submitButton = form.querySelector('[data-action="submit"]');
const formMessage = form.querySelector('[data-ui="form-message"]');

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

async function requestMovies() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`GET ${API_URL} вернул статус ${response.status}`);
  }

  return response.json();
}

async function createMovie(movie) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(movie),
  });

  if (!response.ok) {
    throw new Error(`POST ${API_URL} вернул статус ${response.status}`);
  }

  return response.json();
}

function createMovieCard(movie) {
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

  const badge = document.createElement("span");
  badge.className = movie.watched ? "card__badge card__badge--watched" : "card__badge";
  badge.textContent = movie.watched ? "Просмотрен" : "Хочу посмотреть";

  card.append(title, meta, badge);
  return card;
}

function renderMovies(movies) {
  collection.replaceChildren(...movies.map(createMovieCard));
}

async function loadMovies() {
  reloadButton.disabled = true;
  collection.replaceChildren();
  setStatus("loading", "Загрузка", "Получаем список фильмов с сервера.");

  try {
    const movies = await requestMovies();
    renderMovies(movies);

    if (movies.length === 0) {
      setStatus("", "Список пуст", "В коллекции пока нет фильмов. Добавьте первый через форму.");
    } else {
      setStatus("success", "Фильмы загружены", `Всего фильмов: ${movies.length}.`);
    }
  } catch (error) {
    console.error("Не удалось загрузить фильмы:", error);
    setStatus(
      "error",
      "Не удалось загрузить фильмы",
      "Проверьте, что API запущен командой npm run dev, и нажмите «Обновить».",
    );
  } finally {
    reloadButton.disabled = false;
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
      "Не удалось отправить фильм. Данные в форме сохранены, проверьте API и попробуйте еще раз.",
    );
  } finally {
    submitButton.disabled = false;
  }
}

endpointValue.textContent = API_URL;
reloadButton.addEventListener("click", loadMovies);
form.addEventListener("submit", handleSubmit);

loadMovies();
