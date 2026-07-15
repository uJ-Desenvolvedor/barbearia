const SUPABASE_URL = "https://ppmhkjxhqtldaimlwjbx.supabase.co";
const SUPABASE_KEY = "sb_publishable_V7wts_Jpiq6RgaDbjaBPrg_zUgwqfo1";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaAgendamentos = document.getElementById("listaAgendamentos");

async function carregarAgendamentos() {
  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select(
      `
        *,
        clientes (
            nome,
            telefone,
            tipo_cliente
        )
    `,
    )
    .order("data", { ascending: true });

  if (error) {
    console.log("Erro ao buscar agendamentos:", error);
    listaAgendamentos.innerHTML = `
            <p>Erro ao carregar agendamentos.</p>
        `;
    return;
  }

  console.log("Agendamentos:", data);

  if (data.length === 0) {
    listaAgendamentos.innerHTML = `
            <p>Nenhum agendamento encontrado.</p>
        `;
    return;
  }
  document.getElementById("contadorAgendamentos").textContent =
    `${data.length} agendamento(s) encontrado(s)`;

  listaAgendamentos.innerHTML = data
    .map((agendamento) => {
      const seloMensalista =
        agendamento.clientes.tipo_cliente === "mensalista"
          ? `<span class="badge-mensalista">⭐ Mensalista</span>`
          : "";

      const status = agendamento.status || "Pendente";

      const statusHTML =
        status === "Confirmado"
          ? `<span class="status-confirmado">🟢 Confirmado</span>`
          : status === "Cancelado"
            ? `<span class="status-cancelado">🔴 Cancelado</span>`
            : `<span class="status-pendente">🟡 Pendente</span>`;

      return `
      
<div class="card-admin">

    <div class="card-header">

        <div>
            <h3>👤 ${agendamento.clientes.nome}</h3>

            ${seloMensalista}
        </div>

        <div class="horario">
            🕒 ${agendamento.horario}
        </div>

    </div>

    <div class="info">

        <div class="info-item">
            📞 ${agendamento.clientes.telefone}
        </div>

        <div class="info-item">
            💈 ${agendamento.servico}
        </div>

        <div class="info-item">
            📅 ${formatarData(agendamento.data)}
        </div>

    </div>

<div class="status">
    ${statusHTML}
</div>

    <div class="botoes">

       <button
    class="btn-confirmar"
    onclick="confirmarAgendamento(${agendamento.id})">
    ✔ Confirmar
</button>

        <button
            class="btn-cancelar"
            onclick="cancelarAgendamento(${agendamento.id})">
            ❌ Cancelar
        </button>

    </div>

</div>
`;
    })
    .join("");
}

carregarAgendamentos();
async function confirmarAgendamento(id) {
  const { data, error } = await supabaseClient
    .from("agendamentos")
    .update({
      status: "Confirmado",
    })
    .eq("id", id)
    .select();

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    alert("Erro ao confirmar!");
    return;
  }

  alert("Agendamento confirmado!");

  carregarAgendamentos();
}
async function cancelarAgendamento(id) {

    const confirmar = confirm("Deseja realmente cancelar este agendamento?");

    if (!confirmar) return;

    const { error } = await supabaseClient
        .from("agendamentos")
        .update({
            status: "Cancelado"
        })
        .eq("id", id);

    if (error) {
        console.log(error);
        alert("Erro ao cancelar.");
        return;
    }

    alert("Agendamento cancelado!");

    carregarAgendamentos();

}
function formatarData(data) {
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}
