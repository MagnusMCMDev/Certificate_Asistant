import { login, restore, logout } from "./auth.js";
import { cryptoAvailable } from "./crypto.js";
import { parseHash, onRoute } from "./router.js";
import * as portal from "./views/portal.js";
import * as review from "./views/review.js";
import * as browse from "./views/browse.js";
import * as practice from "./views/practice.js";
import * as exam from "./views/exam.js";

const ROUTES = { "": portal, review, browse, practice, exam };

const $ = (id) => document.getElementById(id);

function route() {
  const { path, params } = parseHash();
  const view = ROUTES[path] || portal;
  const main = $("app-main");
  try {
    view.render(main, params);
  } catch (e) {
    main.replaceChildren(Object.assign(document.createElement("section"), {
      className: "card",
      textContent: "Error al renderizar: " + (e && e.message ? e.message : e),
    }));
    console.error(e);
  }
  window.scrollTo(0, 0);
}

function enterApp(username) {
  $("brand-link").textContent = "🎓 Portal de estudio";
  $("app-footer").textContent = "Solo preguntas verificadas contra documentación oficial";
  document.title = "Portal de estudio";
  $("login-screen").hidden = true;
  $("app").hidden = false;
  if (username) $("app-user").textContent = username;
  $("logout-btn").addEventListener("click", logout);
  onRoute(route);
  route();
}

function showLogin(message) {
  $("app").hidden = true;
  $("login-screen").hidden = false;
  const err = $("login-error");
  if (message) err.textContent = message;

  const form = $("login-form");
  const btn = $("login-btn");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const user = $("login-user").value.trim();
    const pass = $("login-pass").value;
    if (!user || !pass) { err.textContent = "Introduce usuario y contraseña."; return; }
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = "Descifrando…";
    try {
      await login(user, pass);
      enterApp(user);
    } catch (ex) {
      console.error(ex);
      err.textContent = ex && ex.kind === "load" ? ex.message : "Usuario o contraseña incorrectos.";
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
}

async function boot() {
  if (!cryptoAvailable()) {
    $("login-error").textContent =
      "No se puede iniciar. Usa un navegador actualizado y accede por HTTPS.";
    return;
  }
  const content = await restore(); // silent re-decrypt if a session key is present
  if (content) enterApp();
  else showLogin();
}

boot();
