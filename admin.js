// Supabase — mesma conexão usada no site de agendamento
const SUPABASE_URL = "https://ppmhkjxhqtldaimlwjbx.supabase.co";
const SUPABASE_KEY = "sb_publishable_V7wts_Jpiq6RgaDbjaBPrg_zUgwqfo1";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login (Supabase Auth) — o barbeiro precisa existir como usuário no
// Supabase (Authentication → Users → Add user). Só quem loga com
// e-mail/senha válidos recebe sessão "authenticated", exigida pelas
// policies de escrita.
const telaLogin = document.getElementById("tela-login");
const painel = document.getElementById("painel");
const formLogin = document.getElementById("formLogin");
const campoEmail = document.getElementById("emailAdmin");
const campoSenha = document.getElementById("senhaAdmin");
const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");
const erroLogin = document.getElementById("erroLogin");

function entrarNoPainel() {
  telaLogin.classList.remove("is-active");
  painel.hidden = false;
  carregarDashboard();
}

function voltarParaLogin() {
  painel.hidden = true;
  telaLogin.classList.add("is-active");
}

function limparErrosLogin() {
  erroEmail.textContent = "";
  erroSenha.textContent = "";
  erroLogin.textContent = "";
}

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparErrosLogin();

  const email = campoEmail.value.trim();
  const senha = campoSenha.value;

  if (!email) {
    erroEmail.textContent = "Informe seu e-mail.";
    return;
  }

  if (!senha) {
    erroSenha.textContent = "Informe sua senha.";
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    console.log("Erro ao entrar:", error);
    erroLogin.textContent = "E-mail ou senha incorretos.";
    return;
  }

  campoSenha.value = "";
  entrarNoPainel();
});

document.getElementById("btnSair").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  voltarParaLogin();
});

// sessão do Supabase persiste sozinha (localStorage) — se já tiver uma
// válida, entra direto sem pedir login de novo
async function verificarSessaoAtiva() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) entrarNoPainel();
}

verificarSessaoAtiva();

// reage a expiração/logout disparado em outra aba, por exemplo
supabaseClient.auth.onAuthStateChange((_evento, session) => {
  if (!session) voltarParaLogin();
});

// Tema — reaproveita a mesma chave de localStorage do site de agendamento
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

// Navegação entre seções
const TITULOS_SECAO = {
  dashboard: "Dashboard",
  agenda: "Agenda",
  clientes: "Clientes",
  mensalistas: "Mensalistas",
  servicos: "Serviços",
  configuracoes: "Configurações",
};

// carregador de cada seção — as vazias serão implementadas nas próximas etapas
const CARREGADORES_SECAO = {
  dashboard: () => carregarDashboard(),
  agenda: () => carregarAgenda(),
  clientes: () => carregarClientes(),
  mensalistas: () => carregarMensalistas(),
  servicos: () => {},
  configuracoes: () => carregarConfiguracoes(),
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

// Toast (mesmo padrão visual do site de agendamento)
const toastAdmin = document.getElementById("toastAdmin");

function mostrarToastAdmin(mensagem) {
  toastAdmin.textContent = mensagem;
  toastAdmin.classList.add("is-visible");
  setTimeout(() => toastAdmin.classList.remove("is-visible"), 3000);
}

// Dashboard
// preço por serviço — enquanto não existe tabela "servicos" no Supabase
// (próxima etapa do painel), replica os data-preco do index.html
const MAPA_PRECOS_SERVICOS = {
  "Corte": 40,
  "Corte + Sobrancelha": 50,
  "Corte + Cavanhaque + Sobrancelha": 60,
  "Corte + Barba + Sobrancelha": 70,
  "Barba": 25,
  "Cavanhaque": 15,
  "Sobrancelha": 15,
  "Pezinho": 20,
  "Infantil (06 até 10 anos)": 35,
  "Hidratação": 30,
  "Luzes": 70,
  "Alisante": 50,
  "Platinado": 0, // "Consultar valor" — sem preço fixo
};

// data local YYYY-MM-DD (mesma lógica do site público, sem UTC)
function obterDataISO(dataObjeto) {
  const ano = dataObjeto.getFullYear();
  const mes = String(dataObjeto.getMonth() + 1).padStart(2, "0");
  const dia = String(dataObjeto.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// intervalo da semana atual (segunda a domingo) contendo a data informada
function obterIntervaloSemana(dataBase) {
  const diaSemana = dataBase.getDay(); // 0=domingo...6=sábado
  const deslocamentoSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

  const segunda = new Date(dataBase);
  segunda.setDate(dataBase.getDate() + deslocamentoSegunda);

  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  return { inicio: obterDataISO(segunda), fim: obterDataISO(domingo) };
}

// intervalo do mês atual (dia 1 até o último dia)
function obterIntervaloMes(dataBase) {
  const primeiroDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1);
  const ultimoDia = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0);

  return { inicio: obterDataISO(primeiroDia), fim: obterDataISO(ultimoDia) };
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

// busca agendamentos (não cancelados) dentro de um intervalo de datas
async function buscarAgendamentosPorIntervalo(dataInicio, dataFim) {
  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("data, servico, status")
    .gte("data", dataInicio)
    .lte("data", dataFim)
    .neq("status", "cancelado");

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar agendamentos");
    return [];
  }

  return data || [];
}

// soma o valor de cada agendamento pelo preço do serviço correspondente
function calcularFaturamento(agendamentos) {
  return agendamentos.reduce((total, agendamento) => {
    const preco = MAPA_PRECOS_SERVICOS[agendamento.servico] || 0;
    return total + preco;
  }, 0);
}

async function contarClientesCadastrados() {
  const { count, error } = await supabaseClient
    .from("clientes")
    .select("*", { count: "exact", head: true });

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar clientes");
    return 0;
  }

  return count || 0;
}

async function contarMensalistasAtivos() {
  const { count, error } = await supabaseClient
    .from("mensalistas")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true);

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar mensalistas");
    return 0;
  }

  return count || 0;
}

async function carregarDashboard() {
  const hoje = new Date();
  const hojeISO = obterDataISO(hoje);
  const semana = obterIntervaloSemana(hoje);
  const mes = obterIntervaloMes(hoje);

  const [agendamentosHoje, agendamentosSemana, agendamentosMes, totalClientes, totalMensalistas] =
    await Promise.all([
      buscarAgendamentosPorIntervalo(hojeISO, hojeISO),
      buscarAgendamentosPorIntervalo(semana.inicio, semana.fim),
      buscarAgendamentosPorIntervalo(mes.inicio, mes.fim),
      contarClientesCadastrados(),
      contarMensalistasAtivos(),
    ]);

  document.getElementById("statHoje").textContent = agendamentosHoje.length;
  document.getElementById("statSemana").textContent = agendamentosSemana.length;
  document.getElementById("statClientes").textContent = totalClientes;
  document.getElementById("statMensalistas").textContent = totalMensalistas;
  document.getElementById("statFaturamentoDia").textContent = formatarMoeda(
    calcularFaturamento(agendamentosHoje),
  );
  document.getElementById("statFaturamentoMes").textContent = formatarMoeda(
    calcularFaturamento(agendamentosMes),
  );
}

// Auxiliar de escrita autenticada — reutilizado pelas próximas etapas
// (confirmar/cancelar agendamento, editar cliente, pausar mensalista, CRUD
// de serviços, salvar configurações). Se a sessão expirar no meio do uso,
// o Supabase recusa a escrita; aqui isso é detectado e o usuário volta
// pro login em vez de só ver um erro genérico.
function tratarErroSupabase(error, mensagemPadrao) {
  console.log(error);

  const sessaoExpirada =
    error?.code === "PGRST301" ||
    (error?.message || "").toLowerCase().includes("jwt");

  if (sessaoExpirada) {
    mostrarToastAdmin("Sua sessão expirou. Faça login novamente.");
    voltarParaLogin();
    return;
  }

  mostrarToastAdmin(mensagemPadrao || "Não foi possível concluir a ação.");
}

// Agenda
const agendaListaEl = document.getElementById("agendaLista");
const agendaFiltrosEl = document.getElementById("agendaFiltros");
const campoBuscaAgenda = document.getElementById("agendaBusca");
const campoDataEspecificaAgenda = document.getElementById("agendaDataEspecifica");

const STATUS_INFO = {
  confirmado: { label: "Confirmado", classe: "confirmado" },
  pendente: { label: "Pendente", classe: "pausado" },
  cancelado: { label: "Cancelado", classe: "cancelado" },
};

let AGENDAMENTOS_CACHE = [];
let filtroAgendaAtivo = "hoje";
let dataEspecificaAgenda = "";

function obterStatusInfo(status) {
  return STATUS_INFO[status] || { label: status || "—", classe: "pausado" };
}

function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

// busca todos os agendamentos já trazendo nome/telefone do cliente
// relacionado (join via cliente_id), ordenados por data e depois horário
async function buscarAgendamentos() {
  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("id, data, horario, servico, status, clientes(nome, telefone)")
    .order("data", { ascending: true })
    .order("horario", { ascending: true });

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar agenda");
    return [];
  }

  return data || [];
}

// decide se um agendamento aparece com o filtro (chip ou data específica) atual
function agendamentoAtendeFiltro(agendamento, filtro, dataEspecifica, hojeISO, amanhaISO) {
  if (dataEspecifica) return agendamento.data === dataEspecifica;

  switch (filtro) {
    case "hoje":
      return agendamento.data === hojeISO;
    case "amanha":
      return agendamento.data === amanhaISO;
    case "confirmado":
    case "pendente":
    case "cancelado":
      return agendamento.status === filtro;
    default:
      return true; // "todos"
  }
}

// compara nome/telefone com um termo buscado — usado pela Agenda e por Clientes
function correspondeABusca(nome, telefone, termo) {
  if (!termo) return true;

  const termoLimpo = termo.trim().toLowerCase();
  const termoDigitos = termoLimpo.replace(/\D/g, "");
  const nomeNormalizado = (nome || "").toLowerCase();
  const telefoneDigitos = (telefone || "").replace(/\D/g, "");

  if (nomeNormalizado.includes(termoLimpo)) return true;
  if (termoDigitos && telefoneDigitos.includes(termoDigitos)) return true;
  return false;
}

// decide se um agendamento bate com o texto buscado (nome ou telefone do cliente)
function agendamentoAtendeBusca(agendamento, termo) {
  const cliente = agendamento.clientes || {};
  return correspondeABusca(cliente.nome, cliente.telefone, termo);
}

function criarCardAgendamento(agendamento) {
  const cliente = agendamento.clientes || {};
  const statusInfo = obterStatusInfo(agendamento.status);
  const desabilitarConfirmar = agendamento.status === "confirmado" ? "disabled" : "";
  const desabilitarCancelar = agendamento.status === "cancelado" ? "disabled" : "";

  return `
    <div class="admin-card">
      <div class="admin-card-topo">
        <div>
          <div class="admin-card-titulo">${cliente.nome || "Cliente não identificado"}</div>
          <div class="admin-card-sub">${agendamento.servico} · ${formatarDataBR(agendamento.data)} às ${agendamento.horario}</div>
          <div class="admin-card-sub">${cliente.telefone || "—"}</div>
        </div>
        <span class="admin-badge admin-badge--${statusInfo.classe}">${statusInfo.label}</span>
      </div>
      <div class="admin-card-acoes">
        <button type="button" class="admin-acao-confirmar" data-acao="confirmar" data-id="${agendamento.id}" ${desabilitarConfirmar}>Confirmar</button>
        <button type="button" class="admin-acao-cancelar" data-acao="cancelar" data-id="${agendamento.id}" ${desabilitarCancelar}>Cancelar</button>
      </div>
    </div>
  `;
}

// reaplica filtro + busca sobre o cache já carregado e redesenha a lista
function renderizarAgenda() {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const hojeISO = obterDataISO(hoje);
  const amanhaISO = obterDataISO(amanha);

  const listaFiltrada = AGENDAMENTOS_CACHE.filter(
    (agendamento) =>
      agendamentoAtendeFiltro(agendamento, filtroAgendaAtivo, dataEspecificaAgenda, hojeISO, amanhaISO) &&
      agendamentoAtendeBusca(agendamento, campoBuscaAgenda.value),
  );

  agendaListaEl.innerHTML = listaFiltrada.length
    ? listaFiltrada.map(criarCardAgendamento).join("")
    : '<p class="admin-empty">Nenhum agendamento encontrado.</p>';
}

async function atualizarStatusAgendamento(id, novoStatus) {
  const { error } = await supabaseClient
    .from("agendamentos")
    .update({ status: novoStatus })
    .eq("id", id);

  if (error) {
    tratarErroSupabase(error, "Erro ao atualizar agendamento");
    return;
  }

  const agendamento = AGENDAMENTOS_CACHE.find((item) => item.id === id);
  if (agendamento) agendamento.status = novoStatus;

  renderizarAgenda();
  carregarDashboard(); // reflete a mudança nos cards do Dashboard, sem recarregar a página

  mostrarToastAdmin(
    novoStatus === "confirmado" ? "Agendamento confirmado." : "Agendamento cancelado.",
  );
}

async function carregarAgenda() {
  agendaListaEl.innerHTML = '<p class="admin-empty">Carregando agendamentos…</p>';
  AGENDAMENTOS_CACHE = await buscarAgendamentos();
  renderizarAgenda();
}

agendaFiltrosEl.querySelectorAll(".admin-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filtroAgendaAtivo = chip.dataset.filtro;
    dataEspecificaAgenda = "";
    campoDataEspecificaAgenda.value = "";

    agendaFiltrosEl
      .querySelectorAll(".admin-chip")
      .forEach((c) => c.classList.toggle("is-active", c === chip));

    renderizarAgenda();
  });
});

campoDataEspecificaAgenda.addEventListener("change", () => {
  dataEspecificaAgenda = campoDataEspecificaAgenda.value;
  agendaFiltrosEl.querySelectorAll(".admin-chip").forEach((c) => c.classList.remove("is-active"));
  renderizarAgenda();
});

campoBuscaAgenda.addEventListener("input", () => renderizarAgenda());

agendaListaEl.addEventListener("click", (event) => {
  const botao = event.target.closest("button[data-acao]");
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const novoStatus = botao.dataset.acao === "confirmar" ? "confirmado" : "cancelado";
  atualizarStatusAgendamento(id, novoStatus);
});

// Clientes
const clientesListaEl = document.getElementById("clientesLista");
const clientesFiltrosEl = document.getElementById("clientesFiltros");
const campoBuscaClientes = document.getElementById("clientesBusca");
const modalOverlayEl = document.getElementById("modalOverlay");
const formEditarCliente = document.getElementById("formEditarCliente");

let CLIENTES_CACHE = [];
let filtroClientesAtivo = "todos";
let clienteSelecionadoId = null;

// busca clientes já trazendo o histórico de agendamentos relacionado
// (join via cliente_id), usado tanto no card quanto no modal de detalhes
async function buscarClientes() {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome, telefone, tipo_cliente, agendamentos(data, horario, servico, status)")
    .order("nome", { ascending: true });

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar clientes");
    return [];
  }

  return data || [];
}

// quantidade de agendamentos realizados e data do último, ignorando cancelados
function calcularResumoCliente(cliente) {
  const validos = (cliente.agendamentos || []).filter((item) => item.status !== "cancelado");

  const ultimaData = validos.reduce(
    (recente, item) => (!recente || item.data > recente ? item.data : recente),
    null,
  );

  return { quantidade: validos.length, ultimaData };
}

function clienteAtendeFiltro(cliente, filtro) {
  return filtro === "todos" || cliente.tipo_cliente === filtro;
}

function clienteAtendeBusca(cliente, termo) {
  return correspondeABusca(cliente.nome, cliente.telefone, termo);
}

function criarCardCliente(cliente) {
  const { quantidade, ultimaData } = calcularResumoCliente(cliente);
  const tipoClasse = cliente.tipo_cliente === "Mensalista" ? "ativo" : "pausado";
  const ultimoTexto = ultimaData ? formatarDataBR(ultimaData) : "—";

  return `
    <div class="admin-card admin-card--clicavel" data-id="${cliente.id}">
      <div class="admin-card-topo">
        <div>
          <div class="admin-card-titulo">${cliente.nome}</div>
          <div class="admin-card-sub">${cliente.telefone || "—"}</div>
        </div>
        <span class="admin-badge admin-badge--${tipoClasse}">${cliente.tipo_cliente || "—"}</span>
      </div>
      <div class="admin-card-sub">${quantidade} agendamento${quantidade === 1 ? "" : "s"} · Último: ${ultimoTexto}</div>
    </div>
  `;
}

function renderizarClientes() {
  const listaFiltrada = CLIENTES_CACHE.filter(
    (cliente) =>
      clienteAtendeFiltro(cliente, filtroClientesAtivo) &&
      clienteAtendeBusca(cliente, campoBuscaClientes.value),
  );

  clientesListaEl.innerHTML = listaFiltrada.length
    ? listaFiltrada.map(criarCardCliente).join("")
    : '<p class="admin-empty">Nenhum cliente encontrado.</p>';
}

async function carregarClientes() {
  clientesListaEl.innerHTML = '<p class="admin-empty">Carregando clientes…</p>';
  CLIENTES_CACHE = await buscarClientes();
  renderizarClientes();
}

// mais recente primeiro, pra ficar fácil ver o último atendimento no topo
function ordenarAgendamentosRecentesPrimeiro(agendamentos) {
  return [...agendamentos].sort((a, b) =>
    `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`),
  );
}

function gerarHistoricoCliente(cliente) {
  const agendamentos = ordenarAgendamentosRecentesPrimeiro(cliente.agendamentos || []);

  if (!agendamentos.length) {
    return '<p class="admin-empty">Nenhum agendamento ainda.</p>';
  }

  return agendamentos
    .map((agendamento) => {
      const statusInfo = obterStatusInfo(agendamento.status);
      return `
        <div class="admin-card">
          <div class="admin-card-topo">
            <div>
              <div class="admin-card-titulo">${agendamento.servico}</div>
              <div class="admin-card-sub">${formatarDataBR(agendamento.data)} às ${agendamento.horario}</div>
            </div>
            <span class="admin-badge admin-badge--${statusInfo.classe}">${statusInfo.label}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function abrirModalCliente(id) {
  const cliente = CLIENTES_CACHE.find((item) => item.id === id);
  if (!cliente) return;

  clienteSelecionadoId = id;

  document.getElementById("modalClienteTitulo").textContent = cliente.nome;
  document.getElementById("clienteEditNome").value = cliente.nome || "";
  document.getElementById("clienteEditWhatsapp").value = cliente.telefone || "";

  document.querySelectorAll('input[name="clienteEditTipo"]').forEach((input) => {
    input.checked = input.value === cliente.tipo_cliente;
  });

  document.getElementById("modalClienteHistorico").innerHTML = gerarHistoricoCliente(cliente);

  modalOverlayEl.hidden = false;
}

function fecharModalCliente() {
  modalOverlayEl.hidden = true;
  clienteSelecionadoId = null;
}

// só atualiza clientes; se o tipo virar Mensalista, o vínculo de horário fixo
// fica pra próxima etapa (não é criado automaticamente aqui)
async function salvarEdicaoCliente(id, dados) {
  const { error } = await supabaseClient.from("clientes").update(dados).eq("id", id);

  if (error) {
    tratarErroSupabase(error, "Erro ao salvar cliente");
    return;
  }

  const cliente = CLIENTES_CACHE.find((item) => item.id === id);
  if (cliente) Object.assign(cliente, dados);

  renderizarClientes();
  fecharModalCliente();
  mostrarToastAdmin("Cliente atualizado com sucesso.");
}

clientesFiltrosEl.querySelectorAll(".admin-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filtroClientesAtivo = chip.dataset.filtro;

    clientesFiltrosEl
      .querySelectorAll(".admin-chip")
      .forEach((c) => c.classList.toggle("is-active", c === chip));

    renderizarClientes();
  });
});

campoBuscaClientes.addEventListener("input", () => renderizarClientes());

clientesListaEl.addEventListener("click", (event) => {
  const card = event.target.closest(".admin-card[data-id]");
  if (!card) return;
  abrirModalCliente(Number(card.dataset.id));
});

document.getElementById("modalClienteFechar").addEventListener("click", fecharModalCliente);

modalOverlayEl.addEventListener("click", (event) => {
  if (event.target === modalOverlayEl) fecharModalCliente();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalOverlayEl.hidden) fecharModalCliente();
});

formEditarCliente.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!clienteSelecionadoId) return;

  const nome = document.getElementById("clienteEditNome").value.trim();
  const telefone = document.getElementById("clienteEditWhatsapp").value.trim();
  const tipoSelecionado = document.querySelector('input[name="clienteEditTipo"]:checked');

  if (!nome || !telefone || !tipoSelecionado) {
    mostrarToastAdmin("Preencha nome, WhatsApp e tipo de cliente.");
    return;
  }

  salvarEdicaoCliente(clienteSelecionadoId, {
    nome,
    telefone,
    tipo_cliente: tipoSelecionado.value,
  });
});

// Mensalistas
// espelha o mesmo padrão de salvarMensalista()/cancelarMensalista() do
// site público (mesma tabela, mesmos campos, nunca apagar — só atualizar
// dia_semana/horario/ativo). Fica reimplementado aqui porque admin.js e
// script.js são páginas separadas e não compartilham escopo.
const mensalistasListaEl = document.getElementById("mensalistasLista");
const mensalistasFiltrosEl = document.getElementById("mensalistasFiltros");
const campoBuscaMensalistas = document.getElementById("mensalistasBusca");
const modalMensalistaOverlayEl = document.getElementById("modalMensalistaOverlay");
const formEditarMensalista = document.getElementById("formEditarMensalista");
const btnAlternarStatusMensalista = document.getElementById("btnAlternarStatusMensalista");
const erroMensalistaHorarioEl = document.getElementById("erroMensalistaHorario");

const DIAS_SEMANA_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

let MENSALISTAS_CACHE = [];
let filtroMensalistasAtivo = "todos";
let mensalistaSelecionadoId = null;

// busca mensalistas trazendo o cliente e, dentro dele, o histórico de
// agendamentos — reaproveitado depois por gerarHistoricoCliente()
async function buscarMensalistas() {
  const { data, error } = await supabaseClient
    .from("mensalistas")
    .select("id, dia_semana, horario, ativo, clientes(id, nome, telefone, agendamentos(data, horario, servico, status))")
    .order("dia_semana", { ascending: true })
    .order("horario", { ascending: true });

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar mensalistas");
    return [];
  }

  return data || [];
}

function mensalistaAtendeFiltro(mensalista, filtro) {
  if (filtro === "ativos") return mensalista.ativo;
  if (filtro === "pausados") return !mensalista.ativo;
  return true; // todos
}

function mensalistaAtendeBusca(mensalista, termo) {
  const cliente = mensalista.clientes || {};
  return correspondeABusca(cliente.nome, cliente.telefone, termo);
}

function criarCardMensalista(mensalista) {
  const cliente = mensalista.clientes || {};
  const diaLabel = DIAS_SEMANA_LABELS[mensalista.dia_semana] || "—";
  const statusClasse = mensalista.ativo ? "ativo" : "pausado";
  const statusLabel = mensalista.ativo ? "Ativo" : "Pausado";

  return `
    <div class="admin-card admin-card--clicavel" data-id="${mensalista.id}">
      <div class="admin-card-topo">
        <div>
          <div class="admin-card-titulo">${cliente.nome || "Cliente não identificado"}</div>
          <div class="admin-card-sub">${cliente.telefone || "—"}</div>
        </div>
        <span class="admin-badge admin-badge--${statusClasse}">${statusLabel}</span>
      </div>
      <div class="admin-card-sub">${diaLabel} · ${mensalista.horario}</div>
    </div>
  `;
}

function renderizarMensalistas() {
  const listaFiltrada = MENSALISTAS_CACHE.filter(
    (mensalista) =>
      mensalistaAtendeFiltro(mensalista, filtroMensalistasAtivo) &&
      mensalistaAtendeBusca(mensalista, campoBuscaMensalistas.value),
  );

  mensalistasListaEl.innerHTML = listaFiltrada.length
    ? listaFiltrada.map(criarCardMensalista).join("")
    : '<p class="admin-empty">Nenhum mensalista encontrado.</p>';
}

async function carregarMensalistas() {
  mensalistasListaEl.innerHTML = '<p class="admin-empty">Carregando mensalistas…</p>';
  MENSALISTAS_CACHE = await buscarMensalistas();
  renderizarMensalistas();
}

// só considera conflito com quem está ativo — um mensalista pausado libera
// o horário pra qualquer outro, inclusive pra ele mesmo ser reativado nele
async function existeConflitoDeHorario(diaSemana, horario, ignorarId) {
  const { data, error } = await supabaseClient
    .from("mensalistas")
    .select("id")
    .eq("dia_semana", diaSemana)
    .eq("horario", horario)
    .eq("ativo", true)
    .neq("id", ignorarId);

  if (error) {
    tratarErroSupabase(error, "Erro ao verificar conflito de horário");
    return true; // não conseguiu confirmar → bloqueia por segurança
  }

  return (data || []).length > 0;
}

function abrirModalMensalista(id) {
  const mensalista = MENSALISTAS_CACHE.find((item) => item.id === id);
  if (!mensalista) return;

  mensalistaSelecionadoId = id;
  const cliente = mensalista.clientes || {};

  document.getElementById("modalMensalistaTitulo").textContent = cliente.nome || "Mensalista";
  document.getElementById("mensalistaEditDia").value = String(mensalista.dia_semana);
  document.getElementById("mensalistaEditHorario").value = mensalista.horario;
  erroMensalistaHorarioEl.textContent = "";

  btnAlternarStatusMensalista.textContent = mensalista.ativo
    ? "Pausar mensalista"
    : "Reativar mensalista";

  document.getElementById("modalMensalistaHistorico").innerHTML = gerarHistoricoCliente(cliente);

  modalMensalistaOverlayEl.hidden = false;
}

function fecharModalMensalista() {
  modalMensalistaOverlayEl.hidden = true;
  mensalistaSelecionadoId = null;
}

async function salvarEdicaoMensalista(id, diaSemana, horario) {
  const conflito = await existeConflitoDeHorario(diaSemana, horario, id);

  if (conflito) {
    erroMensalistaHorarioEl.textContent = "Já existe um mensalista ativo nesse dia e horário.";
    return;
  }

  const { error } = await supabaseClient
    .from("mensalistas")
    .update({ dia_semana: diaSemana, horario })
    .eq("id", id);

  if (error) {
    tratarErroSupabase(error, "Erro ao salvar mensalista");
    return;
  }

  const mensalista = MENSALISTAS_CACHE.find((item) => item.id === id);
  if (mensalista) {
    mensalista.dia_semana = diaSemana;
    mensalista.horario = horario;
  }

  renderizarMensalistas();
  fecharModalMensalista();
  mostrarToastAdmin("Mensalista atualizado com sucesso.");
}

// nunca apaga — só alterna o campo ativo (pausar/reativar). Ao reativar,
// reconfirma que ninguém ocupou o horário enquanto ele estava pausado.
async function alternarStatusMensalista(id, novoAtivo) {
  const mensalista = MENSALISTAS_CACHE.find((item) => item.id === id);

  if (novoAtivo && mensalista) {
    const conflito = await existeConflitoDeHorario(mensalista.dia_semana, mensalista.horario, id);
    if (conflito) {
      mostrarToastAdmin("Não é possível reativar: já existe outro mensalista ativo nesse horário.");
      return;
    }
  }

  const { error } = await supabaseClient
    .from("mensalistas")
    .update({ ativo: novoAtivo })
    .eq("id", id);

  if (error) {
    tratarErroSupabase(error, "Erro ao atualizar status do mensalista");
    return;
  }

  if (mensalista) mensalista.ativo = novoAtivo;

  renderizarMensalistas();
  carregarDashboard(); // "Mensalistas ativos" muda no Dashboard, sem recarregar a página
  fecharModalMensalista();
  mostrarToastAdmin(novoAtivo ? "Mensalista reativado." : "Mensalista pausado.");
}

mensalistasFiltrosEl.querySelectorAll(".admin-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filtroMensalistasAtivo = chip.dataset.filtro;

    mensalistasFiltrosEl
      .querySelectorAll(".admin-chip")
      .forEach((c) => c.classList.toggle("is-active", c === chip));

    renderizarMensalistas();
  });
});

campoBuscaMensalistas.addEventListener("input", () => renderizarMensalistas());

mensalistasListaEl.addEventListener("click", (event) => {
  const card = event.target.closest(".admin-card[data-id]");
  if (!card) return;
  abrirModalMensalista(Number(card.dataset.id));
});

document.getElementById("modalMensalistaFechar").addEventListener("click", fecharModalMensalista);

modalMensalistaOverlayEl.addEventListener("click", (event) => {
  if (event.target === modalMensalistaOverlayEl) fecharModalMensalista();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalMensalistaOverlayEl.hidden) fecharModalMensalista();
});

formEditarMensalista.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!mensalistaSelecionadoId) return;

  const diaSemana = Number(document.getElementById("mensalistaEditDia").value);
  const horario = document.getElementById("mensalistaEditHorario").value;

  if (!horario) {
    erroMensalistaHorarioEl.textContent = "Escolha um horário.";
    return;
  }

  salvarEdicaoMensalista(mensalistaSelecionadoId, diaSemana, horario);
});

btnAlternarStatusMensalista.addEventListener("click", () => {
  if (!mensalistaSelecionadoId) return;

  const mensalista = MENSALISTAS_CACHE.find((item) => item.id === mensalistaSelecionadoId);
  if (!mensalista) return;

  alternarStatusMensalista(mensalistaSelecionadoId, !mensalista.ativo);
});

// Configurações
const formConfiguracoes = document.getElementById("formConfiguracoes");
const campoCfgNome = document.getElementById("cfgNomeBarbearia");
const campoCfgWhatsapp = document.getElementById("cfgWhatsapp");
const campoCfgPix = document.getElementById("cfgPix");
const campoCfgAbertura = document.getElementById("cfgAbertura");
const campoCfgFechamento = document.getElementById("cfgFechamento");
const campoCfgAlmocoInicio = document.getElementById("cfgAlmocoInicio");
const campoCfgAlmocoFim = document.getElementById("cfgAlmocoFim");

// preenche o formulário com os dados vindos do Supabase (ou recém-salvos)
function preencherFormularioConfiguracoes(config) {
  campoCfgNome.value = config.nome_barbearia || "";
  campoCfgWhatsapp.value = config.whatsapp_numero || "";
  campoCfgPix.value = config.pix_chave || "";
  campoCfgAbertura.value = config.horario_abertura || "";
  campoCfgFechamento.value = config.horario_fechamento || "";
  campoCfgAlmocoInicio.value = config.almoco_inicio || "";
  campoCfgAlmocoFim.value = config.almoco_fim || "";
}

async function carregarConfiguracoes() {
  const { data, error } = await supabaseClient
    .from("configuracoes")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    tratarErroSupabase(error, "Erro ao carregar configurações");
    return;
  }

  preencherFormularioConfiguracoes(data);
}

async function salvarConfiguracoes() {
  const dados = {
    nome_barbearia: campoCfgNome.value.trim(),
    whatsapp_numero: campoCfgWhatsapp.value.trim(),
    pix_chave: campoCfgPix.value.trim(),
    horario_abertura: campoCfgAbertura.value,
    horario_fechamento: campoCfgFechamento.value,
    almoco_inicio: campoCfgAlmocoInicio.value,
    almoco_fim: campoCfgAlmocoFim.value,
  };

  const { data, error } = await supabaseClient
    .from("configuracoes")
    .update(dados)
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    tratarErroSupabase(error, "Erro ao salvar configurações");
    return;
  }

  preencherFormularioConfiguracoes(data);
  mostrarToastAdmin("Configurações salvas com sucesso.");
}

formConfiguracoes.addEventListener("submit", (event) => {
  event.preventDefault();
  salvarConfiguracoes();
});