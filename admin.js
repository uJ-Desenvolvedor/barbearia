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

  listaAgendamentos.innerHTML = data
    .map((agendamento) => {
return `
<div class="card-option">

    <strong>${agendamento.clientes.nome}</strong>

    <p>📞 ${agendamento.clientes.telefone}</p>

    <p>✂️ ${agendamento.servico}</p>

    <p>📅 ${agendamento.data}</p>

    <p>⏰ ${agendamento.horario}</p>

    <button
        class="btn-cancelar"
        onclick="cancelarAgendamento(${agendamento.id})">
        ❌ Cancelar
    </button>

</div>
`;
    })
    .join("");
}

carregarAgendamentos();
async function cancelarAgendamento(id) {

    const confirmar = confirm("Deseja realmente cancelar este agendamento?");

    if (!confirmar) return;

    const { error } = await supabaseClient
        .from("agendamentos")
        .delete()
        .eq("id", id);

    if (error) {
        console.log(error);
        alert("Erro ao cancelar.");
        return;
    }

    alert("Agendamento cancelado!");

    carregarAgendamentos();

}