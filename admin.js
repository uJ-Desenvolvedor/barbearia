const SUPABASE_URL = "https://ppmhkjxhqtldaimlwjbx.supabase.co";
const SUPABASE_KEY = "sb_publishable_V7wts_Jpiq6RgaDbjaBPrg_zUgwqfo1";


const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


const listaAgendamentos = document.getElementById("listaAgendamentos");


async function carregarAgendamentos() {

    const { data, error } = await supabaseClient
    .from("agendamentos")
    .select(`
        *,
        clientes (
            nome,
            telefone,
            tipo_cliente
        )
    `)
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


    listaAgendamentos.innerHTML = data.map(agendamento => {

        return `
        <div class="card-option">

            <strong>${agendamento.nome}</strong>

            <p>
            ✂️ ${agendamento.servico}
            </p>

            <p>
            📅 ${agendamento.data}
            </p>

            <p>
            ⏰ ${agendamento.horario}
            </p>

        </div>
        `;

    }).join("");

}


carregarAgendamentos();