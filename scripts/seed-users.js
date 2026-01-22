
const { createClient } = require("@supabase/supabase-js");

// Credenciais injetadas diretamente para evitar dependência de dotenv neste script one-off
const supabaseUrl = "https://icsictpkalcuwotlatyb.supabase.co";
// Tentando com a ANON KEY caso a Service Role esteja com problemas
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljc2ljdHBrYWxjdXdvdGxhdHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTM2NTUsImV4cCI6MjA4Mzc4OTY1NX0.9B51dPPBsLwM2yftx4KCkZCUWUTFfjqKWRHsr0PfPRk";

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Credenciais do Supabase não encontradas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const usuarios = [
    // Solicitantes
    { nome: "Solicitante 1", email: "solicitante1@hebraica.com.br", departamento: "Esportes", perfil: "solicitante", senha: "123" },
    { nome: "Solicitante 2", email: "solicitante2@hebraica.com.br", departamento: "Cultural", perfil: "solicitante", senha: "123" },
    { nome: "Solicitante 3", email: "solicitante3@hebraica.com.br", departamento: "Manuteção", perfil: "solicitante", senha: "123" },

    // Aprovadores
    { nome: "Aprovador 1", email: "aprovador1@hebraica.com.br", departamento: "Diretoria", perfil: "aprovador", senha: "123" },
    { nome: "Aprovador 2", email: "aprovador2@hebraica.com.br", departamento: "Financeiro", perfil: "aprovador", senha: "123" },
    { nome: "Aprovador 3", email: "aprovador3@hebraica.com.br", departamento: "RH", perfil: "aprovador", senha: "123" },

    // Administradores
    { nome: "Admin 1", email: "admin1@hebraica.com.br", departamento: "TI", perfil: "administrador", senha: "123" },
    { nome: "Admin 2", email: "admin2@hebraica.com.br", departamento: "TI", perfil: "administrador", senha: "123" },
    { nome: "Admin 3", email: "admin3@hebraica.com.br", departamento: "TI", perfil: "administrador", senha: "123" },

    // Gestores
    { nome: "Gestor 1", email: "gestor1@hebraica.com.br", departamento: "Financeiro", perfil: "gestor", senha: "123" },
    { nome: "Gestor 2", email: "gestor2@hebraica.com.br", departamento: "Esportes", perfil: "gestor", senha: "123" },
    { nome: "Gestor 3", email: "gestor3@hebraica.com.br", departamento: "Cultural", perfil: "gestor", senha: "123" },

    // Recepção
    { nome: "Recepção 1", email: "recepcao1@hebraica.com.br", departamento: "Recepção", perfil: "recepcao", senha: "123" },
    { nome: "Recepção 2", email: "recepcao2@hebraica.com.br", departamento: "Recepção", perfil: "recepcao", senha: "123" },
    { nome: "Recepção 3", email: "recepcao3@hebraica.com.br", departamento: "Recepção", perfil: "recepcao", senha: "123" },

    // Suporte
    { nome: "Suporte 1", email: "suporte1@hebraica.com.br", departamento: "TI", perfil: "suporte", senha: "123" },
    { nome: "Suporte 2", email: "suporte2@hebraica.com.br", departamento: "TI", perfil: "suporte", senha: "123" },
    { nome: "Suporte 3", email: "suporte3@hebraica.com.br", departamento: "TI", perfil: "suporte", senha: "123" },

    // SuperAdmin
    { nome: "SuperAdmin", email: "superadmin@hebraica.com.br", departamento: "Diretoria", perfil: "superadmin", senha: "123" }
];

async function seedUsers() {
    console.log("🌱 Iniciando criação de usuários de teste...");

    for (const user of usuarios) {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
            .from("usuarios")
            .select("id")
            .eq("email", user.email)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error(`❌ Erro ao verificar usuário ${user.email}:`, fetchError.message);
            continue;
        }

        if (existingUser) {
            console.log(`⚠️ Usuário ${user.email} já existe. Pulando.`);
        } else {
            // Create user
            const { error: insertError } = await supabase
                .from("usuarios")
                .insert([user]);

            if (insertError) {
                console.error(`❌ Erro ao criar usuário ${user.email}:`, insertError.message);
            } else {
                console.log(`✅ Usuário ${user.email} criado com sucesso!`);
            }
        }
    }
    console.log("🏁 Processo finalizado.");
}

seedUsers();
