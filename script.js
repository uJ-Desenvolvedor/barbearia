// Supabase
const SUPABASE_URL = "https://ppmhkjxhqtldaimlwjbx.supabase.co";
const SUPABASE_KEY = "sb_publishable_V7wts_Jpiq6RgaDbjaBPrg_zUgwqfo1";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// função apenas para confirmar a conexão — pode ser removida depois do teste
async function testarBanco() {
  const { data, error } = await supabaseClient
    .from('clientes')
    .select('*');

  console.log(data);
  console.log(error);
}

testarBanco();

// Estado da aplicação
const state = {
  servico: null,
  preco: null,
  tempo: null,
  duracaoMinutos: null,
  data: null,
  dataLabel: null,
  diaSemana: null,
  horario: null,
  horarioTermino: null,
  nome: '',
  whatsapp: '',
  tipoCliente: null,
  pagamento: null
};

let historico = ['tela-servico'];

// Configurações
const WHATSAPP_NUMERO = '5511999999999';
const PIX_CHAVE = 'contato@barbeariaelite.com.br';

const DIAS_FECHADOS = [0, 1]; // domingo e segunda
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HORARIOS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

const ALMOCO_INICIO = horaParaMinutos('13:00');
const ALMOCO_FIM = horaParaMinutos('14:00');
const FECHAMENTO = horaParaMinutos('21:00');

// telas que entram na barra de progresso — pagamento e sucesso ficam de fora
const ETAPAS = ['tela-servico', 'tela-data', 'tela-horario', 'tela-dados', 'tela-resumo'];

const screens = document.getElementById('screens');
const backBtn = document.getElementById('backBtn');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const toast = document.getElementById('toast');

// Navegação
function irPara(id) {
  const atual = document.querySelector('.screen.is-active');
  const proxima = document.getElementById(id);
  if (!proxima || atual === proxima) return;

  atual?.classList.remove('is-active', 'enter-forward', 'enter-back');
  proxima.classList.add('is-active', 'enter-forward');

  historico.push(id);
  atualizarTopbar(id);
  screens.scrollTop = 0;
}

function voltar() {
  if (historico.length <= 1) return;
  historico.pop();
  const anterior = historico[historico.length - 1];

  document.querySelector('.screen.is-active')?.classList.remove('is-active', 'enter-forward', 'enter-back');
  document.getElementById(anterior).classList.add('is-active', 'enter-back');

  atualizarTopbar(anterior);
  screens.scrollTop = 0;
}

function atualizarTopbar(id) {
  const passo = ETAPAS.indexOf(id);

  if (passo === -1) {
    progress.style.opacity = 0;
  } else {
    progress.style.opacity = 1;
    progressBar.style.width = `${((passo + 1) / ETAPAS.length) * 100}%`;
    progressLabel.textContent = `Etapa ${passo + 1} de ${ETAPAS.length}`;
  }

  backBtn.hidden = historico.length <= 1 || id === 'tela-sucesso';
}

backBtn.addEventListener('click', voltar);

// Tema
const themeBtn = document.getElementById('themeBtn');
const themeIcon = themeBtn.querySelector('i');

function aplicarTema(tema) {
  document.body.dataset.theme = tema === 'light' ? 'light' : '';
  themeIcon.className = tema === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

aplicarTema(localStorage.getItem('tema') || 'dark');

themeBtn.addEventListener('click', () => {
  const novoTema = document.body.dataset.theme === 'light' ? 'dark' : 'light';
  aplicarTema(novoTema);
  localStorage.setItem('tema', novoTema);
});

// Serviços
const quimicaAviso = document.getElementById('quimicaAviso');

function selecionarServico(botao) {
  const categoria = botao.dataset.categoria;

  if (categoria === 'quimica') {
    mostrarAvisoQuimica(botao);
    return;
  }

  esconderAvisoQuimica();
  marcarServicoSelecionado(botao);

  state.servico = botao.dataset.servico;
  state.preco = Number(botao.dataset.preco);
  state.tempo = botao.dataset.tempo;
  state.duracaoMinutos = Number(botao.dataset.duracao);

  carregarDatas();
  irPara('tela-data');
}

function marcarServicoSelecionado(botao) {
  document.querySelectorAll('.card-option').forEach(b => b.classList.remove('is-selected'));
  botao.classList.add('is-selected');
}

// químicas dependem de avaliação presencial, então não entram no fluxo automático de agendamento
function mostrarAvisoQuimica(botao) {
  marcarServicoSelecionado(botao);

  const nomeServico = botao.dataset.servico;
  const mensagem = `Olá! Gostaria de consultar a disponibilidade para o serviço: ${nomeServico}.`;

  document.getElementById('btnConsultarDisponibilidade').href =
    `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

  quimicaAviso.hidden = false;
  quimicaAviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function esconderAvisoQuimica() {
  quimicaAviso.hidden = true;
}

document.querySelectorAll('.card-option').forEach(botao => {
  botao.addEventListener('click', () => selecionarServico(botao));
});

// Calendário
const dateList = document.getElementById('dateList');

function carregarDatas() {
  dateList.innerHTML = '';
  document.getElementById('dataSubtitle').textContent = `${state.servico} · R$${state.preco}`;

  const hoje = new Date();
  let adicionadas = 0;
  let offset = 0;

  while (adicionadas < 5) {
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() + offset);

    if (!DIAS_FECHADOS.includes(dia.getDay())) {
      dateList.appendChild(criarBotaoData(dia, offset));
      adicionadas++;
    }
    offset++;
  }
}

function criarBotaoData(dia, offset) {
  const iso = dia.toISOString().split('T')[0];
  const dataCurta = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const nomeDia = DIAS_SEMANA[dia.getDay()];
  const rotulo = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : nomeDia;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'date-btn';
  btn.innerHTML = `<span>${rotulo}</span><small>${dataCurta}</small>`;
  btn.addEventListener('click', () => selecionarData(btn, iso, rotulo, dataCurta, nomeDia, offset));

  return btn;
}

function selecionarData(btn, iso, rotulo, dataCurta, nomeDia, offset) {
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('is-selected'));
  btn.classList.add('is-selected');

  state.data = iso;
  state.dataLabel = `${rotulo} · ${dataCurta}`;
  state.diaSemana = `${nomeDia}-feira`;

  carregarHorarios(iso, offset === 0);
  setTimeout(() => irPara('tela-horario'), 150);
}

// Horários
const timeGrid = document.getElementById('timeGrid');

function horaParaMinutos(horario) {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

function minutosParaHora(minutos) {
  const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
  const restante = String(minutos % 60).padStart(2, '0');
  return `${horas}:${restante}`;
}

// calcula automaticamente o horário em que o serviço termina, a partir da duração escolhida
function calcularHorarioTermino(horarioInicio, duracaoMinutos) {
  return minutosParaHora(horaParaMinutos(horarioInicio) + duracaoMinutos);
}

function estaNoHorarioAlmoco(minutos) {
  return minutos >= ALMOCO_INICIO && minutos < ALMOCO_FIM;
}

// simulação de ocupação — no futuro isso vem de uma consulta ao banco
function horarioOcupado(data, horario) {
  const soma = (data + horario).split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return soma % 100 < 30;
}

// verifica se o intervalo inteiro do serviço está livre, considerando ocupação e almoço
function intervaloDisponivel(data, horarioInicio, duracaoMinutos) {
  const inicio = horaParaMinutos(horarioInicio);
  const fim = inicio + duracaoMinutos;

  if (fim > FECHAMENTO) return false;

  for (let minutos = inicio; minutos < fim; minutos += 30) {
    if (estaNoHorarioAlmoco(minutos) || horarioOcupado(data, minutosParaHora(minutos))) {
      return false;
    }
  }

  return true;
}

function carregarHorarios(data, ehHoje) {
  timeGrid.innerHTML = '';
  state.horario = null;
  document.getElementById('horarioSubtitle').textContent = `${state.servico} · ${state.dataLabel}`;

  const agora = new Date();
  const minutoAtual = agora.getHours() * 60 + agora.getMinutes();

  HORARIOS.forEach(horario => {
    const minutoHorario = horaParaMinutos(horario);
    const almoco = estaNoHorarioAlmoco(minutoHorario);
    const jaPassou = ehHoje && minutoHorario < minutoAtual + 30;
    const indisponivel = jaPassou || almoco || !intervaloDisponivel(data, horario, state.duracaoMinutos);

    timeGrid.appendChild(criarBotaoHorario(horario, indisponivel, almoco));
  });
}

function criarBotaoHorario(horario, indisponivel, almoco) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'time-btn';
  btn.disabled = indisponivel;
  btn.innerHTML = almoco ? `${horario}<small>Almoço</small>` : horario;

  if (!indisponivel) {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.horario = horario;
      state.horarioTermino = calcularHorarioTermino(horario, state.duracaoMinutos);
      setTimeout(() => irPara('tela-dados'), 150);
    });
  }

  return btn;
}

// Dados do cliente
const formDados = document.getElementById('formDados');
const campoNome = document.getElementById('nome');
const campoWhatsapp = document.getElementById('whatsapp');

function validarFormulario() {
  const erros = {};

  if (campoNome.value.trim().length < 3) {
    erros.nome = 'Digite seu nome completo.';
  }

  if (campoWhatsapp.value.replace(/\D/g, '').length < 10) {
    erros.whatsapp = 'Informe um WhatsApp válido com DDD.';
  }

  if (!formDados.querySelector('[name="tipoCliente"]:checked')) {
    erros.tipoCliente = 'Selecione o tipo de cliente.';
  }

  return erros;
}

function exibirErros(erros) {
  const campos = { nome: campoNome, whatsapp: campoWhatsapp };

  Object.entries(campos).forEach(([chave, campo]) => {
    const mensagem = erros[chave] || '';
    const rotulo = chave[0].toUpperCase() + chave.slice(1);
    campo.closest('.field').classList.toggle('has-error', Boolean(mensagem));
    document.getElementById(`erro${rotulo}`).textContent = mensagem;
  });

  document.getElementById('erroTipoCliente').textContent = erros.tipoCliente || '';
}

formDados.addEventListener('submit', async event => {
  event.preventDefault();

  const erros = validarFormulario();
  exibirErros(erros);

  if (Object.keys(erros).length > 0) return;

  state.nome = campoNome.value.trim();
  state.whatsapp = campoWhatsapp.value.trim();
  state.tipoCliente = formDados.querySelector('[name="tipoCliente"]:checked').value;


  const { data, error } = await supabaseClient
    .from("clientes")
    .insert([
      {
        nome: state.nome,
        telefone: state.whatsapp,
        tipo_cliente: state.tipoCliente
      }
    ])
    .select();


  if (error) {
    console.log("Erro ao salvar cliente:", error);
    mostrarToast("Erro ao salvar cliente");
    return;
  }


  console.log("Cliente salvo:", data);


  gerarResumo();
  irPara('tela-resumo');
});

// os cards de tipo de cliente e pagamento usam radio inputs nativos por baixo
document.querySelectorAll('.radio-card input').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll(`input[name="${input.name}"]`).forEach(irmao => {
      irmao.closest('.radio-card').classList.toggle('is-checked', irmao.checked);
    });
  });
});

// Resumo
const summaryCard = document.getElementById('summaryCard');

function gerarResumo() {
  const linhas = [
    ['Nome', state.nome],
    ['WhatsApp', state.whatsapp],
    ['Serviço', state.servico],
    ['Valor', `R$${state.preco}`],
    ['Tempo', state.tempo],
    ['Tipo de cliente', state.tipoCliente],
    ['Data', state.diaSemana],
    ['Horário', `${state.horario} às ${state.horarioTermino}`]
  ];

  summaryCard.innerHTML = linhas
    .map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`)
    .join('');
}

document.getElementById('btnEditar').addEventListener('click', voltar);
document.getElementById('btnParaPagamento').addEventListener('click', () => irPara('tela-pagamento'));

// Pagamento
const pixPanel = document.getElementById('pixPanel');
const btnConfirmar = document.getElementById('btnConfirmar');

document.querySelectorAll('input[name="pagamento"]').forEach(input => {
  input.addEventListener('change', () => {
    state.pagamento = input.value;
    pixPanel.hidden = input.value !== 'PIX';
    btnConfirmar.disabled = false;
  });
});

document.getElementById('btnCopiarPix').addEventListener('click', function () {
  const botao = this;

  navigator.clipboard?.writeText(PIX_CHAVE)
    .then(() => marcarChaveCopiada(botao))
    .catch(() => mostrarToast('Não foi possível copiar. Copie manualmente.'));
});

function marcarChaveCopiada(botao) {
  botao.textContent = 'Copiado!';
  botao.classList.add('is-copied');

  setTimeout(() => {
    botao.textContent = 'Copiar chave';
    botao.classList.remove('is-copied');
  }, 2000);
}

// WhatsApp
function gerarMensagemWhatsApp() {
  const [ano, mes, dia] = state.data.split('-');

  return [
    'Olá!',
    '',
    'Novo agendamento.',
    '',
    'Cliente:',
    state.nome,
    '',
    'WhatsApp:',
    state.whatsapp,
    '',
    'Serviço:',
    state.servico,
    '',
    'Tempo:',
    state.tempo,
    '',
    'Tipo de cliente:',
    state.tipoCliente,
    '',
    'Pagamento:',
    state.pagamento,
    '',
    'Data:',
    `${dia}/${mes}/${ano}`,
    '',
    'Horário:',
    state.horario,
    '',
    'Obrigado.'
  ].join('\n');
}

btnConfirmar.addEventListener('click', () => {
  const mensagem = gerarMensagemWhatsApp();
  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

  document.getElementById('btnWhatsapp').href = url;
  irPara('tela-sucesso');
  window.open(url, '_blank', 'noopener');
});

// Supabase — clientes e agendamentos
// preparado para a próxima etapa: ainda não é chamado pelo fluxo de confirmação acima

// busca o cliente pelo whatsapp e cria um novo caso não exista
async function buscarOuCriarCliente(nome, whatsapp, tipoCliente) {
  const { data: existente, error: erroBusca } = await supabaseClient
    .from('clientes')
    .select('id')
    .eq('whatsapp', whatsapp)
    .maybeSingle();

  if (erroBusca) return { erro: erroBusca };
  if (existente) return { id: existente.id };

  const { data: novoCliente, error: erroCriacao } = await supabaseClient
    .from('clientes')
    .insert({ nome, whatsapp, tipo_cliente: tipoCliente })
    .select('id')
    .single();

  if (erroCriacao) return { erro: erroCriacao };
  return { id: novoCliente.id };
}

async function salvarAgendamento(clienteId) {
  const { data, error } = await supabaseClient
    .from('agendamentos')
    .insert({
      cliente_id: clienteId,
      data: state.data,
      horario: state.horario,
      servico: state.servico,
      duracao: state.duracaoMinutos,
      status: 'confirmado'
    });

  return { data, error };
}

// vincula um horário fixo semanal ao cliente mensalista
async function criarMensalista(clienteId, diaSemana, horario) {
  const { data, error } = await supabaseClient
    .from('mensalistas')
    .insert({ cliente_id: clienteId, dia_semana: diaSemana, horario, ativo: true });

  return { data, error };
}

// libera o horário fixo ao desativar o mensalista, sem apagar o histórico
async function cancelarMensalista(mensalistaId) {
  const { data, error } = await supabaseClient
    .from('mensalistas')
    .update({ ativo: false })
    .eq('id', mensalistaId);

  return { data, error };
}

document.getElementById('btnNovoAgendamento').addEventListener('click', reiniciarFluxo);

function reiniciarFluxo() {
  Object.keys(state).forEach(chave => (state[chave] = null));
  state.nome = '';
  state.whatsapp = '';

  formDados.reset();
  document.querySelectorAll('input[type="radio"]').forEach(input => (input.checked = false));
  document.querySelectorAll('.is-selected, .is-checked').forEach(el => el.classList.remove('is-selected', 'is-checked'));
  esconderAvisoQuimica();
  pixPanel.hidden = true;
  btnConfirmar.disabled = true;

  historico = ['tela-servico'];
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active', 'enter-forward', 'enter-back'));
  document.getElementById('tela-servico').classList.add('is-active');
  atualizarTopbar('tela-servico');
}

// Utilitários
function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 3000);
}
async function testarBanco() {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*");

  console.log("Dados do banco:", data);
  console.log("Erro:", error);
}

testarBanco();

atualizarTopbar('tela-servico');