const SUPABASE_URL = "https://ppmhkjxhqtldaimlwjbx.supabase.co";
const SUPABASE_KEY = "sb_publishable_V7wts_Jpiq6RgaDbjaBPrg_zUgwqfo1";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document
  .getElementById("btnSalvar")
  .addEventListener("click", salvarMensalista);

async function salvarMensalista() {
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const servico = document.getElementById("servico").value;
  const dia = document.getElementById("dia").value;
  const horario = document.getElementById("horario").value;

  // Salva cliente
  const { data: cliente, error: erroCliente } = await supabaseClient
    .from("clientes")
    .insert([
      {
        nome,
        telefone,
        tipo_cliente: "mensalista",
      },
    ])
    .select()
    .single();

  if (erroCliente) {
    alert("Erro ao cadastrar cliente.");
    console.log(erroCliente);
    return;
  }

  // Salva mensalista
  const { error: erroMensalista } = await supabaseClient
    .from("mensalistas")
    .insert([
      {
        cliente_id: cliente.id,
        dia_semana: dia,
        horario,
        servico,
        ativo: true,
      },
    ]);

  if (erroMensalista) {
    alert("Erro ao cadastrar mensalista.");
    alert(JSON.stringify(erroMensalista));
    console.log(erroMensalista);
    return;
  }

  alert("Mensalista cadastrado com sucesso!");
}
