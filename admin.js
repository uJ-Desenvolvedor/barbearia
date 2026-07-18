// Supabase — mesma conexão usada no site de agendamento
const SUPABASE_URL = "https://ppmhkjxhqtldaimlwjbx.supabase.co";
const SUPABASE_KEY = "sb_publishable_V7wts_Jpiq6RgaDbjaBPrg_zUgwqfo1";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================================================
// Login
// ==========================================================================
// Proteção simples no front-end: a senha nunca fica em texto puro no código,
// só o hash SHA-256 dela. Isso NÃO substitui autenticação real (qualquer
// pessoa com acesso ao navegador ainda consegue ver os dados, já que a
// chave do Supabase usada aqui é pública) — é só uma trava de acesso básica
// pra afastar curiosos. Pra proteção de verdade no futuro, o caminho é
// Supabase Auth + políticas de RLS restritas a usuário autenticado.
//
// Senha atual: trocar123
// Pra trocar a senha: gere o novo hash rodando no console do navegador
//   crypto.subtle.digest("SHA-256", new TextEncoder().encode("novaSenha"))
//     .then(buf => console.log(Array.from(new Uint8Array(buf))
//       .map(b => b.toString(16).padStart(2, "0")).join("")))
// e substitua o valor de SENHA_HASH abaixo.
const SENHA_HASH =
  "b0857a7c7d3178e44ca0d8836786ae18ee806f7625e589b98c5bad307813eaf6";

const SESSAO_CHAVE = "painelAutenticado";

async function gerarHash(texto) {
  const dados = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const telaLogin = document.getElementById("tela-login");
const painel = document.getElementById("painel");
const formLogin = document.getElementById("formLogin");
const campoSenha = document.getElementById("senhaAdmin");
const erroSenha = document.getElementById("erroSenha");

function entrarNoPainel() {
  telaLogin.classList.remove("is-active");
  painel.hidden = false;
}

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const hashDigitado = await gerarHash(campoSenha.value.trim());

  if (hashDigitado !== SENHA_HASH) {
    erroSenha.textContent = "Senha incorreta.";
    return;
  }

  erroSenha.textContent = "";
  sessionStorage.setItem(SESSAO_CHAVE, "true");
  campoSenha.value = "";
  entrarNoPainel();
});

document.getElementById("btnSair").addEventListener("click", () => {
  sessionStorage.removeItem(SESSAO_CHAVE);
  painel.hidden = true;
  telaLogin.classList.add("is-active");
});

// sessão já ativa nesta aba? entra direto, sem pedir senha de novo
if (sessionStorage.getItem(SESSAO_CHAVE) === "true") {
  entrarNoPainel();
}

// ==========================================================================
// Tema
// ==========================================================================
// reaproveita a mesma chave de localStorage do site de agendamento, então o
// tema escolhido em um lugar já vem aplicado no outro
const themeBtnAdmin = document.getElementById("themeBtnAdmin");
const themeIconAdmin = themeBtnAdmin.querySelector("i");

function aplicarTemaAdmin(tema) {
  document.body.dataset.theme = tema === "light" ? "light" : "";
  themeIconAdmin.className =
    tema === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

aplicarTemaAdmin(localStorage.getItem("tema") || "dark");

themeBtnAdmin.addEventListener("click", () => {
  const novoTema = document.body.dataset.theme === "light" ? "dark" : "light";
  aplicarTemaAdmin(novoTema);
  localStorage.setItem("tema", novoTema);
});

// ==========================================================================
// Navegação entre seções
// ==========================================================================
const TITULOS_SECAO = {
  dashboard: "Dashboard",
  agenda: "Agenda",
  clientes: "Clientes",
  mensalistas: "Mensalistas",
  servicos: "Serviços",
  configuracoes: "Configurações",
};

// funções de carregamento de cada seção — por enquanto vazias, cada uma
// será implementada na sua própria etapa (Dashboard, Agenda, etc.)
const CARREGADORES_SECAO = {
  dashboard: () => {},
  agenda: () => {},
  clientes: () => {},
  mensalistas: () => {},
  servicos: () => {},
  configuracoes: () => {},
};

const tituloSecaoEl = document.getElementById("admin-titulo-secao");

function irParaSecao(secao) {
  document
    .querySelectorAll(".admin-nav-item, .admin-bottom-item")
    .forEach((btn) => btn.classList.toggle("is-active", btn.dataset.secao === secao));

  document
    .querySelectorAll(".admin-secao")
    .forEach((el) => el.classList.toggle("is-active", el.dataset.secao === secao));

  tituloSecaoEl.textContent = TITULOS_SECAO[secao] || "";

  const carregar = CARREGADORES_SECAO[secao];
  if (carregar) carregar();
}

document
  .querySelectorAll(".admin-nav-item, .admin-bottom-item")
  .forEach((btn) => {
    btn.addEventListener("click", () => irParaSecao(btn.dataset.secao));
  });

// ==========================================================================
// Utilitário de toast (mesmo padrão visual do site de agendamento)
// ==========================================================================
const toastAdmin = document.getElementById("toastAdmin");

function mostrarToastAdmin(mensagem) {
  toastAdmin.textContent = mensagem;
  toastAdmin.classList.add("is-visible");
  setTimeout(() => toastAdmin.classList.remove("is-visible"), 3000);
}