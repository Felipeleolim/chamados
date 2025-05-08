// Constantes
const STATUS_CLASSES = {
    pendente: 'status-pendente',
    'em-andamento': 'status-em-andamento',
    concluido: 'status-concluido'
};

// Elementos da Aba Empresas
const empresaForm = {
    nome: document.getElementById('empresa-nome'),
    contato: document.getElementById('empresa-contato'),
    telefone: document.getElementById('empresa-telefone'),
    email: document.getElementById('empresa-email')
};
const btnAdicionarEmpresa = document.getElementById('btn-adicionar-empresa');
const listaEmpresas = document.getElementById('lista-empresas');

// Elementos da Aba Anotações
const anotacaoForm = {
    mesAno: document.getElementById('mes-ano'),
    data: document.getElementById('anotacao-data'),
    empresa: document.getElementById('anotacao-empresa'),
    titulo: document.getElementById('anotacao-titulo'),
    descricao: document.getElementById('anotacao-descricao'),
    status: document.getElementById('anotacao-status')
};
const btnSalvarAnotacao = document.getElementById('btn-salvar-anotacao');
const listaAnotacoes = document.getElementById('lista-anotacoes');

// Elementos da Aba Relatórios
const reportPeriodo = document.getElementById('report-periodo');
const customDateRange = document.getElementById('custom-date-range');
const reportDataInicio = document.getElementById('report-data-inicio');
const reportDataFim = document.getElementById('report-data-fim');
const btnGerarRelatorio = document.getElementById('btn-gerar-relatorio');
const chartStatus = document.getElementById('chart-status');
const chartEmpresas = document.getElementById('chart-empresas');

// Tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Dados
let empresas = JSON.parse(localStorage.getItem('empresas')) || [];
let anotacoes = JSON.parse(localStorage.getItem('anotacoes')) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Configurar data atual
    const hoje = new Date();
    anotacaoForm.data.valueAsDate = hoje;
    
    // Configurar mês/ano atual
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    anotacaoForm.mesAno.value = `${hoje.getFullYear()}-${mes}`;
    
    // Carregar dados
    atualizarListaEmpresas();
    atualizarSelectEmpresas();
    carregarAnotacoes();
    
    // Configurar eventos
    configurarEventos();
});

// Configuração de Eventos
function configurarEventos() {
    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            abrirTab(tabId);
        });
    });
    
    // Empresas
    btnAdicionarEmpresa.addEventListener('click', adicionarEmpresa);
    
    // Anotações
    btnSalvarAnotacao.addEventListener('click', salvarAnotacao);
    anotacaoForm.mesAno.addEventListener('change', carregarAnotacoes);
    
    // Relatórios
    reportPeriodo.addEventListener('change', function() {
        customDateRange.style.display = this.value === 'custom' ? 'flex' : 'none';
    });
    
    btnGerarRelatorio.addEventListener('click', gerarRelatorio);
}

// Funções para Tabs
function abrirTab(tabId) {
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

// Funções para Empresas
function adicionarEmpresa() {
    const { nome, contato, telefone, email } = empresaForm;
    
    if (!nome.value || !contato.value) {
        alert('Por favor, preencha pelo menos o nome da empresa e o contato.');
        return;
    }
    
    const novaEmpresa = {
        id: Date.now(),
        nome: nome.value,
        contato: contato.value,
        telefone: telefone.value,
        email: email.value
    };
    
    empresas.push(novaEmpresa);
    salvarEmpresas();
    
    // Limpar formulário
    nome.value = '';
    contato.value = '';
    telefone.value = '';
    email.value = '';
    
    // Atualizar interface
    atualizarListaEmpresas();
    atualizarSelectEmpresas();
}

function editarEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;
    
    // Preencher formulário com dados da empresa
    empresaForm.nome.value = empresa.nome;
    empresaForm.contato.value = empresa.contato;
    empresaForm.telefone.value = empresa.telefone || '';
    empresaForm.email.value = empresa.email || '';
    
    // Remover empresa da lista
    empresas = empresas.filter(e => e.id !== id);
    salvarEmpresas();
    atualizarListaEmpresas();
}

function excluirEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    
    empresas = empresas.filter(e => e.id !== id);
    salvarEmpresas();
    atualizarListaEmpresas();
    atualizarSelectEmpresas();
}

function atualizarListaEmpresas() {
    listaEmpresas.innerHTML = '';
    
    empresas.forEach(empresa => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empresa.nome}</td>
            <td>${empresa.contato}</td>
            <td>${empresa.telefone || '-'}</td>
            <td>${empresa.email || '-'}</td>
            <td>
                <button class="btn-secondary" onclick="editarEmpresa(${empresa.id})">
                    <i class="icon-edit"></i> Editar
                </button>
                <button class="btn-danger" onclick="excluirEmpresa(${empresa.id})">
                    <i class="icon-trash"></i> Excluir
                </button>
            </td>
        `;
        listaEmpresas.appendChild(row);
    });
}

function atualizarSelectEmpresas() {
    const select = anotacaoForm.empresa;
    select.innerHTML = '<option value="">Selecione uma empresa</option>';
    
    empresas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.id;
        option.textContent = empresa.nome;
        select.appendChild(option);
    });
}

function salvarEmpresas() {
    localStorage.setItem('empresas', JSON.stringify(empresas));
}

// Funções para Anotações
function salvarAnotacao() {
    const { mesAno, data, empresa, titulo, descricao, status } = anotacaoForm;
    
    if (!empresa.value || !data.value || !titulo.value) {
        alert('Por favor, preencha pelo menos a empresa, data e título.');
        return;
    }
    
    const empresaSelecionada = empresas.find(e => e.id === parseInt(empresa.value));
    
    const novaAnotacao = {
        id: Date.now(),
        empresaId: empresaSelecionada.id,
        empresaNome: empresaSelecionada.nome,
        data: data.value,
        mesAno: mesAno.value,
        titulo: titulo.value,
        descricao: descricao.value,
        status: status.value
    };
    
    anotacoes.push(novaAnotacao);
    salvarAnotacoes();
    
    // Limpar formulário (exceto mês/ano)
    data.value = '';
    titulo.value = '';
    descricao.value = '';
    status.value = 'pendente';
    
    // Atualizar lista
    carregarAnotacoes();
}

function editarAnotacao(id) {
    const anotacao = anotacoes.find(a => a.id === id);
    if (!anotacao) return;
    
    // Preencher formulário
    anotacaoForm.mesAno.value = anotacao.mesAno;
    anotacaoForm.empresa.value = anotacao.empresaId;
    anotacaoForm.data.value = anotacao.data;
    anotacaoForm.titulo.value = anotacao.titulo;
    anotacaoForm.descricao.value = anotacao.descricao || '';
    anotacaoForm.status.value = anotacao.status;
    
    // Remover anotação da lista
    anotacoes = anotacoes.filter(a => a.id !== id);
    salvarAnotacoes();
    carregarAnotacoes();
}

function excluirAnotacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) return;
    
    anotacoes = anotacoes.filter(a => a.id !== id);
    salvarAnotacoes();
    carregarAnotacoes();
}

function carregarAnotacoes() {
    const mesAno = anotacaoForm.mesAno.value;
    listaAnotacoes.innerHTML = '';
    
    if (!mesAno) return;
    
    const anotacoesMes = anotacoes.filter(a => a.mesAno === mesAno);
    
    anotacoesMes.forEach(anotacao => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatarData(anotacao.data)}</td>
            <td>${anotacao.empresaNome}</td>
            <td>${anotacao.titulo}</td>
            <td><span class="status-badge ${STATUS_CLASSES[anotacao.status]}">${formatarStatus(anotacao.status)}</span></td>
            <td>
                <button class="btn-secondary" onclick="editarAnotacao(${anotacao.id})">
                    <i class="icon-edit"></i> Editar
                </button>
                <button class="btn-danger" onclick="excluirAnotacao(${anotacao.id})">
                    <i class="icon-trash"></i> Excluir
                </button>
            </td>
        `;
        listaAnotacoes.appendChild(row);
    });
}

function salvarAnotacoes() {
    localStorage.setItem('anotacoes', JSON.stringify(anotacoes));
}

// Funções para Relatórios
function gerarRelatorio() {
    // Implementação básica - em produção, você usaria uma biblioteca como Chart.js
    const periodo = reportPeriodo.value;
    let dataInicio, dataFim;
    
    if (periodo === 'custom') {
        dataInicio = new Date(reportDataInicio.value);
        dataFim = new Date(reportDataFim.value);
    } else {
        const dias = parseInt(periodo);
        dataFim = new Date();
        dataInicio = new Date();
        dataInicio.setDate(dataFim.getDate() - dias);
    }
    
    // Filtrar anotações pelo período
    const anotacoesPeriodo = anotacoes.filter(a => {
        const dataAnotacao = new Date(a.data);
        return dataAnotacao >= dataInicio && dataAnotacao <= dataFim;
    });
    
    // Gerar dados para os gráficos
    const dadosStatus = agruparPorStatus(anotacoesPeriodo);
    const dadosEmpresas = agruparPorEmpresa(anotacoesPeriodo);
    
    // Atualizar gráficos (simulação)
    chartStatus.innerHTML = criarHTMLGrafico(dadosStatus, 'Status');
    chartEmpresas.innerHTML = criarHTMLGrafico(dadosEmpresas, 'Empresas');
}

function agruparPorStatus(anotacoes) {
    const grupos = {
        pendente: 0,
        'em-andamento': 0,
        concluido: 0
    };
    
    anotacoes.forEach(a => {
        grupos[a.status]++;
    });
    
    return Object.entries(grupos).map(([status, quantidade]) => ({
        label: formatarStatus(status),
        quantidade,
        cor: getCorStatus(status)
    }));
}

function agruparPorEmpresa(anotacoes) {
    const grupos = {};
    
    anotacoes.forEach(a => {
        if (!grupos[a.empresaNome]) {
            grupos[a.empresaNome] = 0;
        }
        grupos[a.empresaNome]++;
    });
    
    return Object.entries(grupos).map(([empresa, quantidade]) => ({
        label: empresa,
        quantidade,
        cor: getCorAleatoria()
    }));
}

function criarHTMLGrafico(dados, titulo) {
    const total = dados.reduce((sum, item) => sum + item.quantidade, 0);
    
    if (total === 0) {
        return `<p>Nenhum dado disponível para o período selecionado.</p>`;
    }
    
    let html = `<div class="grafico">`;
    
    dados.forEach(item => {
        const percentual = Math.round((item.quantidade / total) * 100);
        html += `
            <div class="grafico-item">
                <div class="grafico-bar" style="width: ${percentual}%; background-color: ${item.cor};"></div>
                <div class="grafico-label">
                    <span class="grafico-legend" style="background-color: ${item.cor};"></span>
                    ${item.label}: ${item.quantidade} (${percentual}%)
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    return html;
}

// Funções auxiliares
function formatarData(dataString) {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

function formatarStatus(status) {
    const traducoes = {
        pendente: 'Pendente',
        'em-andamento': 'Em Andamento',
        concluido: 'Concluído'
    };
    return traducoes[status] || status;
}

function getCorStatus(status) {
    const cores = {
        pendente: '#FFC107',
        'em-andamento': '#17A2B8',
        concluido: '#28A745'
    };
    return cores[status] || '#6C757D';
}

function getCorAleatoria() {
    const cores = ['#003366', '#0066CC', '#0099CC', '#00CCCC', '#FF6600', '#FF9933'];
    return cores[Math.floor(Math.random() * cores.length)];
}