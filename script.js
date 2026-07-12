/* =========================================================
   BARBEARIA ELITE — APP DE AGENDAMENTO
   script.js — fluxo em etapas, sem alert(), transições suaves

   Fluxo: Serviço → Data → Horário → Nome/WhatsApp → Plano →
          Pagamento → (Método → PIX) → Resumo → WhatsApp

   O sistema reserva TEMPO, não apenas um horário fixo: cada
   serviço tem uma duração e o horário de término é calculado
   automaticamente, bloqueando o intervalo correspondente.

   Camada de dados isolada na seção 0, hoje simulada, mas já
   organizada para uma futura integração com Firebase/Supabase
   e para um futuro painel do barbeiro (agenda, cancelamentos,
   bloqueios manuais, receita etc.) sem precisar reescrever o
   restante do app.
   ========================================================= */

(() => {
  'use strict';

  /* =========================================================
     0. CAMADA DE DADOS (simulada — pronta para Firebase/Supabase)
     ========================================================= */

  /** Catálogo de serviços. Duração em minutos para cálculo de tempo. */
  const SERVICOS = {
    'Corte Masculino':               { preco: 45, duracaoMin: 60,  duracaoLabel: '1 hora',               emoji: '✂️' },
    'Barba':                         { preco: 35, duracaoMin: 30,  duracaoLabel: '30 minutos',           emoji: '🧔' },
    'Corte + Barba':                 { preco: 70, duracaoMin: 90,  duracaoLabel: '1 hora e 30 minutos',  emoji: '💈' },
    'Corte + Sobrancelha':           { preco: 55, duracaoMin: 90,  duracaoLabel: '1 hora e 30 minutos',  emoji: '✂️' },
    'Corte + Barba + Sobrancelha':   { preco: 80, duracaoMin: 120, duracaoLabel: '2 horas',              emoji: '💈' }
  };

  const ABERTURA_MIN = 8 * 60;   // 08:00
  const FECHAMENTO_MIN = 21 * 60; // 21:00
  const PASSO_GRADE_MIN = 30;     // granularidade dos horários de início

  /** Dias em que a barbearia NÃO funciona (0 = domingo, 1 = segunda). */
  const DIAS_FECHADOS = [0, 1];

  const NUMERO_WHATSAPP = '5511999999999';
  const CHAVE_PIX = 'contato@barbeariaelite.com.br';

  /** "Banco de dados" em memória dos horários já ocupados por data (simulação). */
  const RESERVAS_SESSAO = {};

  /* ---------- helpers de tempo ---------- */
  function horaParaMinutos(horaStr) {
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
  }
  function minutosParaHora(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Calcula o horário de término a partir de um início e uma duração.
   * Ex: calcularTempo('14:00', 90) → '15:30'
   */
  function calcularTempo(horaInicioStr, duracaoMin) {
    return minutosParaHora(horaParaMinutos(horaInicioStr) + duracaoMin);
  }

  /**
   * Retorna os blocos já ocupados de uma data: simulação determinística
   * (para a demo parecer uma agenda real) + agendamentos feitos nesta
   * sessão. Ao integrar com Firebase, troque a simulação por uma consulta
   * real e mantenha a mesma assinatura de retorno.
   */
  function obterReservasDoDia(isoData) {
    const seed = isoData.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const blocosSimulados = [];
    // gera 2 a 3 blocos de 1h ocupados, em horários pseudo-aleatórios porém fixos
    const quantidade = 2 + (seed % 2);
    for (let i = 0; i < quantidade; i++) {
      const inicio = ABERTURA_MIN + ((seed * (i + 3)) % 12) * 30;
      blocosSimulados.push({ inicio, fim: inicio + 60 });
    }
    const blocosSessao = RESERVAS_SESSAO[isoData] || [];
    return [...blocosSimulados, ...blocosSessao];
  }

  /**
   * Verifica se um intervalo [inicioMin, inicioMin + duracaoMin) está livre,
   * respeitando o horário de fechamento e as reservas existentes.
   */
  function verificarDisponibilidade(isoData, inicioMin, duracaoMin) {
    const fimMin = inicioMin + duracaoMin;
    if (fimMin > FECHAMENTO_MIN) return false;

    const reservas = obterReservasDoDia(isoData);
    return !reservas.some(r => inicioMin < r.fim && fimMin > r.inicio);
  }

  /**
   * Retorna a grade de horários de início possíveis para uma data + duração,
   * já marcando quais estão disponíveis.
   */
  function obterHorariosDisponiveis(isoData, duracaoMin, ehHoje) {
    const agora = new Date();
    const minutosAgora = ehHoje ? (agora.getHours() * 60 + agora.getMinutes() + 30) : 0; // 30min de folga

    const grade = [];
    for (let inicio = ABERTURA_MIN; inicio + duracaoMin <= FECHAMENTO_MIN; inicio += PASSO_GRADE_MIN) {
      const passou = inicio < minutosAgora;
      const disponivel = !passou && verificarDisponibilidade(isoData, inicio, duracaoMin);
      grade.push({ horario: minutosParaHora(inicio), inicioMin: inicio, disponivel });
    }
    return grade;
  }

  /**
   * Bloqueia um intervalo de tempo na "agenda" (simulação em memória).
   * No futuro, este é o ponto de integração com Firebase/Supabase.
   */
  function bloquearHorario(isoData, inicioMin, duracaoMin) {
    if (!RESERVAS_SESSAO[isoData]) RESERVAS_SESSAO[isoData] = [];
    RESERVAS_SESSAO[isoData].push({ inicio: inicioMin, fim: inicioMin + duracaoMin });
  }

  /**
   * Persiste o agendamento completo. Hoje bloqueia o horário em memória
   * e loga o objeto final; no futuro vira uma chamada real ao backend
   * (ex: `await db.collection('agendamentos').add(dados)`).
   */
  function salvarAgendamento(dados) {
    bloquearHorario(dados.data, dados.inicioMin, dados.duracaoMin);
    // eslint-disable-next-line no-console
    console.log('[agendamento salvo — simulação]', dados);
    return Promise.resolve({ ok: true, dados });
  }

  /* =========================================================
     1. ESTADO GLOBAL DO AGENDAMENTO
     ========================================================= */
  const state = {
    servico: null,
    preco: null,
    duracaoMin: null,
    duracaoLabel: null,
    data: null,          // ISO yyyy-mm-dd
    dataLabel: null,
    diaSemanaLabel: null,
    horario: null,        // "HH:MM" de início
    inicioMin: null,
    horarioFim: null,     // "HH:MM" de término (calculado)
    nome: '',
    whatsapp: '',
    plano: null,           // "Mensalista" | "Cliente Avulso"
    pagamentoTipo: null,   // "sinal" | "total" | "depois"
    pagamentoForma: null,  // "PIX" | "Cartão de Crédito" | null
    valorPagar: 0,
    statusPagamento: null  // "Sinal pago" | "Pago" | "Pendente"
  };

  /* ordem das telas principais (para a barra de progresso) */
  const ETAPAS = ['screen-servico', 'screen-data', 'screen-horario', 'screen-dados', 'screen-plano', 'screen-pagamento'];
  const TELAS_SEM_PROGRESSO = ['screen-metodo', 'screen-pix', 'screen-resumo', 'screen-sucesso'];
  let historico = ['screen-servico']; // pilha de navegação

  /* =========================================================
     2. ELEMENTOS
     ========================================================= */
  const screensEl = document.getElementById('screens');
  const backBtn = document.getElementById('backBtn');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const progressWrap = document.getElementById('progressWrap');
  const toast = document.getElementById('toast');

  /* =========================================================
     3. NAVEGAÇÃO ENTRE TELAS
     ========================================================= */
  function irPara(idTela, { registrar = true } = {}) {
    const atual = document.querySelector('.screen.active');
    const proxima = document.getElementById(idTela);
    if (!proxima || atual === proxima) return;

    atual?.classList.remove('active', 'enter-forward', 'enter-back');
    proxima.classList.add('active', 'enter-forward');

    if (registrar) historico.push(idTela);

    atualizarTopbar(idTela);
    screensEl.scrollTop = 0;
  }

  function voltar() {
    if (historico.length <= 1) return;
    historico.pop();
    const anterior = historico[historico.length - 1];

    const atual = document.querySelector('.screen.active');
    const alvo = document.getElementById(anterior);
    atual?.classList.remove('active', 'enter-forward', 'enter-back');
    alvo.classList.add('active', 'enter-back');

    atualizarTopbar(anterior);
    screensEl.scrollTop = 0;
  }

  function atualizarTopbar(idTela) {
    const indexEtapa = ETAPAS.indexOf(idTela);

    if (indexEtapa === -1) {
      progressWrap.style.opacity = TELAS_SEM_PROGRESSO.includes(idTela) ? '0' : '1';
    } else {
      progressWrap.style.opacity = '1';
      const percentual = ((indexEtapa + 1) / ETAPAS.length) * 100;
      progressFill.style.width = `${percentual}%`;
      progressLabel.textContent = `Etapa ${indexEtapa + 1} de ${ETAPAS.length}`;
    }

    backBtn.hidden = historico.length <= 1 || idTela === 'screen-sucesso';
  }

  backBtn.addEventListener('click', voltar);

  /* =========================================================
     4. TOAST (mensagens rápidas, sem alert())
     ========================================================= */
  let toastTimer;
  function mostrarToast(mensagem) {
    clearTimeout(toastTimer);
    toast.textContent = mensagem;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  /* =========================================================
     5. TEMA CLARO / ESCURO
     ========================================================= */
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('i');

  function aplicarTema(tema) {
    if (tema === 'light') {
      document.body.setAttribute('data-theme', 'light');
      themeIcon.className = 'fa-solid fa-sun';
    } else {
      document.body.removeAttribute('data-theme');
      themeIcon.className = 'fa-solid fa-moon';
    }
  }
  aplicarTema(localStorage.getItem('barbearia-theme') || 'dark');

  themeToggle.addEventListener('click', () => {
    const novo = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    aplicarTema(novo);
    localStorage.setItem('barbearia-theme', novo);
  });

  /* =========================================================
     6. ETAPA 1 — ESCOLHA DO SERVIÇO
     ========================================================= */
  document.querySelectorAll('#serviceList .option-card').forEach(card => {
    card.addEventListener('click', () => {
      const nome = card.dataset.servico;
      const info = SERVICOS[nome];

      state.servico = nome;
      state.preco = info.preco;
      state.duracaoMin = info.duracaoMin;
      state.duracaoLabel = info.duracaoLabel;

      document.getElementById('selectedServiceLabel').textContent =
        `${info.emoji} ${nome} · R$${info.preco}`;

      gerarDatas();
      irPara('screen-data');
    });
  });

  /* =========================================================
     7. ETAPA 2 — ESCOLHA DA DATA
     (pula automaticamente domingo e segunda-feira)
     ========================================================= */
  const dateList = document.getElementById('dateList');
  const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function gerarDatas() {
    dateList.innerHTML = '';
    const hoje = new Date();
    let diasAdicionados = 0;
    let offset = 0;

    while (diasAdicionados < 5) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() + offset);

      if (!DIAS_FECHADOS.includes(dia.getDay())) {
        criarBotaoData(dia, offset);
        diasAdicionados++;
      }
      offset++;
    }
  }

  function criarBotaoData(dia, offset) {
    const iso = dia.toISOString().split('T')[0];
    const dataFormatada = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const nomeDiaSemana = DIAS_SEMANA[dia.getDay()];

    let rotulo;
    if (offset === 0) rotulo = 'Hoje';
    else if (offset === 1) rotulo = 'Amanhã';
    else rotulo = nomeDiaSemana;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'date-btn';
    btn.dataset.iso = iso;
    btn.innerHTML = `<span class="date-day">${rotulo}</span><span class="date-num">${dataFormatada}</span>`;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      state.data = iso;
      state.dataLabel = `${rotulo} · ${dataFormatada}`;
      state.diaSemanaLabel = nomeDiaSemana + '-feira';
      document.getElementById('dateLabel').textContent = `${state.servico} · ${state.dataLabel}`;

      gerarHorarios(iso, offset === 0);

      setTimeout(() => irPara('screen-horario'), 180);
    });

    dateList.appendChild(btn);
  }

  /* =========================================================
     8. ETAPA 3 — ESCOLHA DO HORÁRIO
     (grade de início a cada 30 min; duração vem do serviço)
     ========================================================= */
  const timeGrid = document.getElementById('timeGrid');
  const nextSlot = document.getElementById('nextSlot');
  const nextSlotValue = document.getElementById('nextSlotValue');

  function gerarHorarios(isoData, ehHoje) {
    timeGrid.innerHTML = '';
    state.horario = null;

    const grade = obterHorariosDisponiveis(isoData, state.duracaoMin, ehHoje);
    let primeiroLivre = null;

    grade.forEach(({ horario, inicioMin, disponivel }) => {
      if (disponivel && primeiroLivre === null) primeiroLivre = horario;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-btn';

      if (!disponivel) {
        btn.classList.add('busy');
        btn.disabled = true;
        btn.innerHTML = `${horario}<span class="time-tag">ESGOTADO</span>`;
      } else {
        btn.textContent = horario;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');

          state.horario = horario;
          state.inicioMin = inicioMin;
          state.horarioFim = calcularTempo(horario, state.duracaoMin);

          setTimeout(() => irPara('screen-dados'), 180);
        });
      }

      timeGrid.appendChild(btn);
    });

    if (primeiroLivre) {
      const rotuloDia = ehHoje ? 'Hoje' : state.dataLabel.split(' · ')[0];
      nextSlotValue.textContent = `${rotuloDia} às ${primeiroLivre}`;
      nextSlot.hidden = false;
    } else {
      nextSlot.hidden = true;
      mostrarToast('Nenhum horário livre nesta data. Escolha outro dia.');
    }
  }

  /* =========================================================
     9. ETAPA 4 — NOME E WHATSAPP DO CLIENTE
     ========================================================= */
  const formDados = document.getElementById('formDados');
  const nomeInput = document.getElementById('nomeCliente');
  const telefoneInput = document.getElementById('telefoneCliente');

  function limparErroCampo(campo) {
    const grupo = campo.closest('.field');
    grupo.classList.remove('invalid');
    const erro = document.getElementById(`err-${campo.id}`);
    if (erro) erro.textContent = '';
  }

  function mostrarErroCampo(campo, mensagem) {
    const grupo = campo.closest('.field');
    grupo.classList.add('invalid');
    const erro = document.getElementById(`err-${campo.id}`);
    if (erro) erro.textContent = mensagem;
  }

  nomeInput.addEventListener('input', () => limparErroCampo(nomeInput));
  telefoneInput.addEventListener('input', () => limparErroCampo(telefoneInput));

  formDados.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = nomeInput.value.trim();
    const whatsapp = telefoneInput.value.trim();
    let valido = true;

    if (nome.length < 3) {
      mostrarErroCampo(nomeInput, 'Digite seu nome completo.');
      valido = false;
    } else {
      limparErroCampo(nomeInput);
    }

    if (whatsapp.replace(/\D/g, '').length < 10) {
      mostrarErroCampo(telefoneInput, 'Informe um WhatsApp válido com DDD.');
      valido = false;
    } else {
      limparErroCampo(telefoneInput);
    }

    if (!valido) return;

    state.nome = nome;
    state.whatsapp = whatsapp;

    irPara('screen-plano');
  });

  /* =========================================================
     10. ETAPA 5 — TIPO DE CLIENTE (mensalista ou avulso)
     ========================================================= */
  const btnPlanoSim = document.getElementById('btnPlanoSim');
  const btnPlanoNao = document.getElementById('btnPlanoNao');

  [btnPlanoSim, btnPlanoNao].forEach(btn => {
    btn.addEventListener('click', () => {
      [btnPlanoSim, btnPlanoNao].forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.plano = btn.dataset.plano;

      prepararTelaPagamento();
      setTimeout(() => irPara('screen-pagamento'), 220);
    });
  });

  /* =========================================================
     11. ETAPA 6 — DESEJA GARANTIR O HORÁRIO AGORA? (pagamento)
     ========================================================= */
  const btnPagarSinal = document.getElementById('btnPagarSinal');
  const btnPagarTotal = document.getElementById('btnPagarTotal');
  const btnPagarDepois = document.getElementById('btnPagarDepois');
  const valorSinalPreview = document.getElementById('valorSinalPreview');
  const valorTotalPreview = document.getElementById('valorTotalPreview');

  function formatarReais(valor) {
    return `R$${valor.toFixed(2).replace('.', ',')}`;
  }

  function prepararTelaPagamento() {
    const sinal = Math.round(state.preco * 0.10 * 100) / 100;
    valorSinalPreview.textContent = `${formatarReais(sinal)} (10%) via PIX`;
    valorTotalPreview.textContent = `${formatarReais(state.preco)} via PIX`;
    [btnPagarSinal, btnPagarTotal, btnPagarDepois].forEach(b => b.classList.remove('selected'));
  }

  btnPagarSinal.addEventListener('click', () => selecionarTipoPagamento('sinal', btnPagarSinal));
  btnPagarTotal.addEventListener('click', () => selecionarTipoPagamento('total', btnPagarTotal));
  btnPagarDepois.addEventListener('click', () => selecionarTipoPagamento('depois', btnPagarDepois));

  function selecionarTipoPagamento(tipo, btn) {
    [btnPagarSinal, btnPagarTotal, btnPagarDepois].forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.pagamentoTipo = tipo;

    if (tipo === 'depois') {
      state.pagamentoForma = null;
      state.valorPagar = 0;
      state.statusPagamento = 'Pendente';
      montarResumo();
      setTimeout(() => irPara('screen-resumo'), 200);
      return;
    }

    state.valorPagar = tipo === 'sinal'
      ? Math.round(state.preco * 0.10 * 100) / 100
      : state.preco;

    document.getElementById('valorMetodoLabel').textContent = formatarReais(state.valorPagar);
    setTimeout(() => irPara('screen-metodo'), 200);
  }

  /* =========================================================
     12. ETAPA 7 — FORMA DE PAGAMENTO (PIX ou Cartão)
     ========================================================= */
  document.getElementById('btnMetodoPix').addEventListener('click', () => {
    state.pagamentoForma = 'PIX';
    document.getElementById('valorPixLabel').textContent = formatarReais(state.valorPagar);
    irPara('screen-pix');
  });

  document.getElementById('btnMetodoCartao').addEventListener('click', () => {
    // apenas interface — sem integração de gateway de pagamento
    state.pagamentoForma = 'Cartão de Crédito';
    state.statusPagamento = 'Pendente';
    mostrarToast('Pagamento por cartão em breve. Você poderá pagar na barbearia.');
    montarResumo();
    setTimeout(() => irPara('screen-resumo'), 300);
  });

  /* =========================================================
     13. ETAPA 8 — PAGAMENTO PIX (QR code + chave)
     ========================================================= */
  document.getElementById('pixChaveValor').textContent = CHAVE_PIX;

  document.getElementById('btnCopiarPix').addEventListener('click', function () {
    const finalizarCopia = () => {
      this.textContent = 'Copiado!';
      this.classList.add('copiado');
      setTimeout(() => {
        this.textContent = 'Copiar chave';
        this.classList.remove('copiado');
      }, 2000);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(CHAVE_PIX).then(finalizarCopia).catch(() => {
        mostrarToast('Não foi possível copiar. Copie manualmente.');
      });
    } else {
      finalizarCopia();
    }
  });

  document.getElementById('btnPagamentoRealizado').addEventListener('click', () => {
    state.statusPagamento = state.pagamentoTipo === 'sinal' ? 'Sinal pago' : 'Pago';
    montarResumo();
    irPara('screen-resumo');
  });

  /* =========================================================
     14. ETAPA 9 — RESUMO E CONFIRMAÇÃO
     ========================================================= */
  const summaryCard = document.getElementById('summaryCard');

  function montarResumo() {
    const emoji = SERVICOS[state.servico].emoji;

    const linhaPagamento = state.pagamentoTipo === 'depois'
      ? 'Pendente'
      : `${state.pagamentoTipo === 'sinal' ? 'Sinal' : 'Total'} · ${state.pagamentoForma}`;

    summaryCard.innerHTML = `
      <div class="summary-row">
        <i class="fa-solid fa-user"></i>
        <span class="summary-row-text">
          <span class="summary-label">Cliente</span>
          <span class="summary-value">${state.nome}</span>
        </span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-brands fa-whatsapp"></i>
        <span class="summary-row-text">
          <span class="summary-label">WhatsApp</span>
          <span class="summary-value">${state.whatsapp}</span>
        </span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <span class="option-emoji" style="width:38px;height:38px;font-size:1.1rem;">${emoji}</span>
        <span class="summary-row-text">
          <span class="summary-label">Serviço</span>
          <span class="summary-value">${state.servico} · R$${state.preco}</span>
        </span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-solid fa-hourglass-half"></i>
        <span class="summary-row-text">
          <span class="summary-label">Tempo estimado</span>
          <span class="summary-value">${state.duracaoLabel}</span>
        </span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-solid fa-id-card"></i>
        <span class="summary-row-text">
          <span class="summary-label">Plano</span>
          <span class="summary-value">${state.plano}</span>
        </span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-solid fa-wallet"></i>
        <span class="summary-row-text">
          <span class="summary-label">Pagamento</span>
          <span class="summary-value">${linhaPagamento}</span>
        </span>
      </div>
      ${state.pagamentoTipo !== 'depois' ? `
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-solid fa-sack-dollar"></i>
        <span class="summary-row-text">
          <span class="summary-label">${state.pagamentoTipo === 'sinal' ? 'Valor do sinal' : 'Valor pago'}</span>
          <span class="summary-value">${formatarReais(state.valorPagar)}</span>
        </span>
      </div>` : ''}
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-solid fa-calendar-day"></i>
        <span class="summary-row-text">
          <span class="summary-label">Data</span>
          <span class="summary-value">${state.diaSemanaLabel}</span>
        </span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <i class="fa-solid fa-clock"></i>
        <span class="summary-row-text">
          <span class="summary-label">Horário</span>
          <span class="summary-value">${state.horario} às ${state.horarioFim}</span>
        </span>
      </div>
    `;
  }

  document.getElementById('btnEditar').addEventListener('click', voltar);

  document.getElementById('btnConfirmarFinal').addEventListener('click', () => {
    const [ano, mes, dia] = state.data.split('-');
    const dataBR = `${dia}/${mes}/${ano}`;

    const dadosFinais = {
      nome: state.nome,
      whatsapp: state.whatsapp,
      servico: state.servico,
      preco: state.preco,
      duracaoMin: state.duracaoMin,
      duracaoLabel: state.duracaoLabel,
      plano: state.plano,
      pagamentoTipo: state.pagamentoTipo,
      pagamentoForma: state.pagamentoForma,
      valorPagar: state.valorPagar,
      statusPagamento: state.statusPagamento,
      data: state.data,
      dataBR,
      horario: state.horario,
      horarioFim: state.horarioFim,
      inicioMin: state.inicioMin
    };

    const mensagem = montarMensagemWhatsApp(dadosFinais);
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
    document.getElementById('btnWhats').href = url;

    // salva o agendamento (bloqueia o intervalo de tempo correspondente)
    salvarAgendamento(dadosFinais);

    irPara('screen-sucesso');

    // abre o WhatsApp automaticamente — permitido pois parte de um clique do usuário
    window.open(url, '_blank', 'noopener');
  });

  /**
   * Monta a mensagem final do WhatsApp no formato acordado com o barbeiro.
   */
  function montarMensagemWhatsApp(d) {
    let linhaPagamento;
    let linhaValor = '';

    if (d.pagamentoTipo === 'depois') {
      linhaPagamento = 'Pendente';
    } else if (d.pagamentoTipo === 'sinal') {
      linhaPagamento = `Sinal ${d.pagamentoForma}`;
      linhaValor = `\n\nValor do sinal:\n${formatarReais(d.valorPagar)}`;
    } else {
      linhaPagamento = `Pago via ${d.pagamentoForma}`;
      linhaValor = `\n\nValor pago:\n${formatarReais(d.valorPagar)}`;
    }

    return (
`Olá!

Novo agendamento.

Cliente:
${d.nome}

WhatsApp:
${d.whatsapp}

Serviço:
${d.servico}

Tempo:
${d.duracaoLabel}

Plano:
${d.plano}

Pagamento:
${linhaPagamento}${linhaValor}

Data:
${d.dataBR}

Horário:
${d.horario}

Obrigado.`
    );
  }

  /* =========================================================
     15. NOVO AGENDAMENTO (reinicia o fluxo)
     ========================================================= */
  document.getElementById('btnNovo').addEventListener('click', () => {
    Object.assign(state, {
      servico: null, preco: null, duracaoMin: null, duracaoLabel: null,
      data: null, dataLabel: null, diaSemanaLabel: null,
      horario: null, inicioMin: null, horarioFim: null,
      nome: '', whatsapp: '', plano: null,
      pagamentoTipo: null, pagamentoForma: null, valorPagar: 0, statusPagamento: null
    });

    formDados.reset();
    document.querySelectorAll('.date-btn.selected, .time-btn.selected, .plano-card.selected')
      .forEach(b => b.classList.remove('selected'));

    historico = ['screen-servico'];
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'enter-forward', 'enter-back'));
    document.getElementById('screen-servico').classList.add('active');
    atualizarTopbar('screen-servico');
  });

  /* =========================================================
     16. INICIALIZAÇÃO
     ========================================================= */
  atualizarTopbar('screen-servico');

})();