// Configuração inicial
const CONFIG = {
    itemsPerPage: 10,
    currentPage: 1,
    templates: [
        {
            id: 1,
            nome: "Problema de Rede",
            descricao: "O usuário reporta problemas de conexão com a rede interna."
        },
        {
            id: 2,
            nome: "Software Não Responde",
            descricao: "Aplicativo trava constantemente durante o uso."
        }
    ],
    validateCompany: true,
    validateTime: true
};

// Dados
let empresas = JSON.parse(localStorage.getItem('empresas')) || [];
let chamados = JSON.parse(localStorage.getItem('chamados')) || [];
let currentTicket = null;
let currentCompany = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initDashboard();
    initTickets();
    initCompanies();
    initConfig();
    loadData();
});

// Controle de Abas
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove a classe active de todas as abas
            tabs.forEach(t => t.classList.remove('active'));
            
            // Adiciona a classe active apenas na aba clicada
            this.classList.add('active');
            
            // Esconde todos os conteúdos das abas
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostra o conteúdo correspondente à aba clicada
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Dashboard
function initDashboard() {
    updateDashboardCounts();
    renderCharts();
    renderRecentTickets();
    
    document.getElementById('chart-period').addEventListener('change', renderCharts);
}

function updateDashboardCounts() {
    const pendentes = chamados.filter(c => c.status === 'pendente').length;
    const andamento = chamados.filter(c => c.status === 'em-andamento').length;
    const concluidos = chamados.filter(c => c.status === 'concluido').length;
    
    document.getElementById('count-pendente').textContent = pendentes;
    document.getElementById('count-andamento').textContent = andamento;
    document.getElementById('count-concluido').textContent = concluidos;
    
    // Calcular tempo médio
    const tempos = chamados
        .filter(c => c.status === 'concluido' && c.horaInicio && c.horaFim)
        .map(calcularTempoChamado);
    
    const tempoTotal = tempos.reduce((sum, tempo) => sum + tempo, 0);
    const tempoMedio = tempos.length > 0 ? tempoTotal / tempos.length : 0;
    
    document.getElementById('tempo-medio').textContent = formatarTempo(tempoMedio);
}

function renderCharts() {
    const period = parseInt(document.getElementById('chart-period').value);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);
    
    const filteredTickets = chamados.filter(t => new Date(t.data) >= cutoffDate);
    
    // Gráfico de Status
    const statusCtx = document.getElementById('chart-status').getContext('2d');
    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Em Andamento', 'Concluídos'],
            datasets: [{
                data: [
                    filteredTickets.filter(c => c.status === 'pendente').length,
                    filteredTickets.filter(c => c.status === 'em-andamento').length,
                    filteredTickets.filter(c => c.status === 'concluido').length
                ],
                backgroundColor: [
                    '#FFC107',
                    '#17A2B8',
                    '#28A745'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Gráfico de Empresas
    const empresasData = agruparChamadosPorEmpresa(filteredTickets);
    const empresasCtx = document.getElementById('chart-empresas').getContext('2d');
    new Chart(empresasCtx, {
        type: 'bar',
        data: {
            labels: empresasData.map(e => e.empresa),
            datasets: [{
                label: 'Chamados',
                data: empresasData.map(e => e.quantidade),
                backgroundColor: '#0066CC'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderRecentTickets() {
    const recentes = [...chamados]
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 5);
    
    document.getElementById('recent-tickets').innerHTML = recentes.map(ticket => `
        <div class="recent-ticket">
            <span class="ticket-id">#${ticket.id}</span>
            <span class="ticket-title">${ticket.titulo}</span>
            <span class="ticket-status ${ticket.status}">${formatarStatus(ticket.status)}</span>
        </div>
    `).join('');
}

// Chamados
function initTickets() {
    document.getElementById('new-ticket').addEventListener('click', () => showTicketForm());
    document.getElementById('search-tickets').addEventListener('input', filtrarChamados);
    document.getElementById('prev-page').addEventListener('click', () => mudarPagina(-1));
    document.getElementById('next-page').addEventListener('click', () => mudarPagina(1));
    document.getElementById('export-pdf').addEventListener('click', exportarPDF);
    document.getElementById('export-excel').addEventListener('click', exportarExcel);
    
    renderTicketsTable();
}

function showTicketForm(ticket = null) {
    currentTicket = ticket;
    
    document.getElementById('ticket-form').innerHTML = `
        <div class="ticket-form">
            <h3>${ticket ? 'Editar Chamado' : 'Novo Chamado'}</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="ticket-empresa">Empresa</label>
                    <select id="ticket-empresa" required>
                        <option value="">Selecione uma empresa</option>
                        ${empresas.map(e => `
                            <option value="${e.id}" ${ticket?.empresaId === e.id ? 'selected' : ''}>${e.nome}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="ticket-priority">Prioridade</label>
                    <select id="ticket-priority" required>
                        <option value="baixa" ${ticket?.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                        <option value="media" ${ticket?.prioridade === 'media' ? 'selected' : ''}>Média</option>
                        <option value="alta" ${ticket?.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                        <option value="critica" ${ticket?.prioridade === 'critica' ? 'selected' : ''}>Crítica</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="ticket-date">Data</label>
                    <input type="date" id="ticket-date" value="${ticket?.data || new Date().toISOString().split('T')[0]}" required>
                </div>
                
                <div class="form-group">
                    <label for="ticket-start">Hora Início</label>
                    <input type="time" id="ticket-start" value="${ticket?.horaInicio || ''}">
                </div>
                
                <div class="form-group">
                    <label for="ticket-end">Hora Fim</label>
                    <input type="time" id="ticket-end" value="${ticket?.horaFim || ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label for="ticket-title">Título</label>
                <input type="text" id="ticket-title" value="${ticket?.titulo || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="ticket-desc">Descrição</label>
                <textarea id="ticket-desc" rows="5" required>${ticket?.descricao || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="ticket-status">Status</label>
                <select id="ticket-status" required>
                    <option value="pendente" ${ticket?.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="em-andamento" ${ticket?.status === 'em-andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="concluido" ${ticket?.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="ticket-attachments">Anexos</label>
                <input type="file" id="ticket-attachments" multiple>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancel-ticket">Cancelar</button>
                <button type="button" class="btn-primary" id="save-ticket">Salvar</button>
            </div>
        </div>
    `;
    
    document.getElementById('ticket-form').style.display = 'block';
    
    // Adicionar eventos aos novos elementos
    document.getElementById('cancel-ticket').addEventListener('click', () => {
        document.getElementById('ticket-form').style.display = 'none';
    });
    
    document.getElementById('save-ticket').addEventListener('click', salvarChamado);
    
    // Validação em tempo real
    if (CONFIG.validateCompany) {
        document.getElementById('ticket-empresa').addEventListener('change', validarEmpresa);
    }
    
    if (CONFIG.validateTime) {
        document.getElementById('ticket-start').addEventListener('change', validarHorario);
        document.getElementById('ticket-end').addEventListener('change', validarHorario);
    }
}

function validarEmpresa() {
    const empresaId = parseInt(this.value);
    if (isNaN(empresaId)) {
        alert('Selecione uma empresa válida');
        this.focus();
    }
}

function validarHorario() {
    const inicio = document.getElementById('ticket-start').value;
    const fim = document.getElementById('ticket-end').value;
    
    if (inicio && fim && inicio >= fim) {
        alert('A hora de fim deve ser posterior à hora de início');
        document.getElementById('ticket-end').focus();
    }
}

function salvarChamado() {
    const form = document.querySelector('.ticket-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const empresaId = parseInt(document.getElementById('ticket-empresa').value);
    const empresa = empresas.find(e => e.id === empresaId);
    
    if (!empresa) {
        alert('Selecione uma empresa válida');
        return;
    }
    
    const horaInicio = document.getElementById('ticket-start').value;
    const horaFim = document.getElementById('ticket-end').value;
    
    if (horaInicio && horaFim && horaInicio >= horaFim) {
        alert('A hora de fim deve ser posterior à hora de início');
        return;
    }
    
    const ticketData = {
        id: currentTicket?.id || Date.now(),
        empresaId: empresa.id,
        empresaNome: empresa.nome,
        data: document.getElementById('ticket-date').value,
        horaInicio,
        horaFim,
        titulo: document.getElementById('ticket-title').value,
        descricao: document.getElementById('ticket-desc').value,
        status: document.getElementById('ticket-status').value,
        prioridade: document.getElementById('ticket-priority').value,
        anexos: currentTicket?.anexos || []
    };
    
    // Processar anexos (simplificado)
    const fileInput = document.getElementById('ticket-attachments');
    if (fileInput.files.length > 0) {
        ticketData.anexos = [
            ...ticketData.anexos,
            ...Array.from(fileInput.files).map(file => ({
                nome: file.name,
                tipo: file.type,
                tamanho: file.size
            }))
        ];
    }
    
    if (currentTicket) {
        // Atualizar chamado existente
        const index = chamados.findIndex(c => c.id === currentTicket.id);
        chamados[index] = ticketData;
    } else {
        // Adicionar novo chamado
        chamados.push(ticketData);
    }
    
    salvarDados();
    document.getElementById('ticket-form').style.display = 'none';
    renderTicketsTable();
    updateDashboardCounts();
}

function renderTicketsTable(filtered = chamados) {
    const start = (CONFIG.currentPage - 1) * CONFIG.itemsPerPage;
    const end = start + CONFIG.itemsPerPage;
    const paginated = filtered.slice(start, end);
    
    document.getElementById('tickets-list').innerHTML = paginated.map(ticket => `
        <tr>
            <td>#${ticket.id}</td>
            <td>${formatarData(ticket.data)}</td>
            <td>${ticket.empresaNome}</td>
            <td>${ticket.titulo}</td>
            <td><span class="priority-badge ${ticket.prioridade}">${formatarPrioridade(ticket.prioridade)}</span></td>
            <td><span class="status-badge ${ticket.status}">${formatarStatus(ticket.status)}</span></td>
            <td>${ticket.horaInicio && ticket.horaFim ? calcularTempoFormatado(ticket.horaInicio, ticket.horaFim) : '-'}</td>
            <td>
                <button class="btn-action edit" data-id="${ticket.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-action delete" data-id="${ticket.id}"><i class="fas fa-trash"></i></button>
                ${ticket.anexos?.length > 0 ? `<button class="btn-action attach" data-id="${ticket.id}"><i class="fas fa-paperclip"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
    
    // Atualizar controles de paginação
    const totalPages = Math.ceil(filtered.length / CONFIG.itemsPerPage);
    document.getElementById('page-info').textContent = `Página ${CONFIG.currentPage} de ${totalPages}`;
    document.getElementById('prev-page').disabled = CONFIG.currentPage <= 1;
    document.getElementById('next-page').disabled = CONFIG.currentPage >= totalPages;
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.btn-action.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const ticket = chamados.find(c => c.id === parseInt(btn.dataset.id));
            showTicketForm(ticket);
        });
    });
    
    document.querySelectorAll('.btn-action.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir este chamado?')) {
                chamados = chamados.filter(c => c.id !== parseInt(btn.dataset.id));
                salvarDados();
                renderTicketsTable();
                updateDashboardCounts();
            }
        });
    });
}

function filtrarChamados() {
    const termo = document.getElementById('search-tickets').value.toLowerCase();
    const filtrados = chamados.filter(ticket => 
        ticket.titulo.toLowerCase().includes(termo) || 
        ticket.empresaNome.toLowerCase().includes(termo) ||
        ticket.descricao.toLowerCase().includes(termo)
    );
    
    CONFIG.currentPage = 1;
    renderTicketsTable(filtrados);
}

function mudarPagina(delta) {
    const termo = document.getElementById('search-tickets').value.toLowerCase();
    const filtrados = termo ? 
        chamados.filter(ticket => 
            ticket.titulo.toLowerCase().includes(termo) || 
            ticket.empresaNome.toLowerCase().includes(termo)
        ) : chamados;
    
    const totalPages = Math.ceil(filtrados.length / CONFIG.itemsPerPage);
    const newPage = CONFIG.currentPage + delta;
    
    if (newPage > 0 && newPage <= totalPages) {
        CONFIG.currentPage = newPage;
        renderTicketsTable(filtrados);
    }
}

// Empresas
function initCompanies() {
    document.getElementById('new-company').addEventListener('click', () => showCompanyForm());
    document.getElementById('search-companies').addEventListener('input', filtrarEmpresas);
    
    renderCompaniesTable();
}

function showCompanyForm(company = null) {
    currentCompany = company;
    
    document.getElementById('company-form').innerHTML = `
        <div class="company-form">
            <h3>${company ? 'Editar Empresa' : 'Nova Empresa'}</h3>
            
            <div class="form-group">
                <label for="company-name">Nome da Empresa</label>
                <input type="text" id="company-name" value="${company?.nome || ''}" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="company-contact">Contato</label>
                    <input type="text" id="company-contact" value="${company?.contato || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="company-phone">Telefone</label>
                    <input type="text" id="company-phone" value="${company?.telefone || ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label for="company-email">E-mail</label>
                <input type="email" id="company-email" value="${company?.email || ''}">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancel-company">Cancelar</button>
                <button type="button" class="btn-primary" id="save-company">Salvar</button>
            </div>
        </div>
    `;
    
    document.getElementById('company-form').style.display = 'block';
    
    document.getElementById('cancel-company').addEventListener('click', () => {
        document.getElementById('company-form').style.display = 'none';
    });
    
    document.getElementById('save-company').addEventListener('click', salvarEmpresa);
}

function salvarEmpresa() {
    const form = document.querySelector('.company-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const companyData = {
        id: currentCompany?.id || Date.now(),
        nome: document.getElementById('company-name').value,
        contato: document.getElementById('company-contact').value,
        telefone: document.getElementById('company-phone').value,
        email: document.getElementById('company-email').value
    };
    
    if (currentCompany) {
        // Atualizar empresa existente
        const index = empresas.findIndex(e => e.id === currentCompany.id);
        empresas[index] = companyData;
    } else {
        // Adicionar nova empresa
        empresas.push(companyData);
    }
    
    salvarDados();
    document.getElementById('company-form').style.display = 'none';
    renderCompaniesTable();
    updateDashboardCounts();
}

function renderCompaniesTable(filtered = empresas) {
    document.getElementById('companies-list').innerHTML = filtered.map(company => `
        <tr>
            <td>${company.nome}</td>
            <td>${company.contato}</td>
            <td>${company.telefone || '-'}</td>
            <td>${company.email || '-'}</td>
            <td>
                <button class="btn-action edit" data-id="${company.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-action delete" data-id="${company.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.btn-action.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const company = empresas.find(e => e.id === parseInt(btn.dataset.id));
            showCompanyForm(company);
        });
    });
    
    document.querySelectorAll('.btn-action.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir esta empresa?')) {
                empresas = empresas.filter(e => e.id !== parseInt(btn.dataset.id));
                salvarDados();
                renderCompaniesTable();
            }
        });
    });
}

function filtrarEmpresas() {
    const termo = document.getElementById('search-companies').value.toLowerCase();
    const filtrados = empresas.filter(company => 
        company.nome.toLowerCase().includes(termo) || 
        company.contato.toLowerCase().includes(termo) ||
        (company.email && company.email.toLowerCase().includes(termo)) ||
        (company.telefone && company.telefone.toLowerCase().includes(termo))
    );
    
    renderCompaniesTable(filtrados);
}

// Configurações
function initConfig() {
    document.getElementById('btn-config').addEventListener('click', () => {
        document.getElementById('config-modal').style.display = 'flex';
        renderTemplates();
    });
    
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('config-modal').style.display = 'none';
    });
    
    document.getElementById('add-template').addEventListener('click', adicionarTemplate);
    
    // Config tabs
    document.querySelectorAll('.config-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.config-tab, .config-content').forEach(el => {
                el.classList.remove('active');
            });
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });
    
    // Validação
    document.getElementById('validate-company').addEventListener('change', function() {
        CONFIG.validateCompany = this.checked;
    });
    
    document.getElementById('validate-time').addEventListener('change', function() {
        CONFIG.validateTime = this.checked;
    });
}

function renderTemplates() {
    document.getElementById('template-list').innerHTML = CONFIG.templates.map(template => `
        <div class="template-item">
            <div class="template-header">
                <h4>${template.nome}</h4>
                <div class="template-actions">
                    <button class="btn-action edit-template" data-id="${template.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-action delete-template" data-id="${template.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <p>${template.descricao}</p>
        </div>
    `).join('');
    
    // Adicionar eventos
    document.querySelectorAll('.edit-template').forEach(btn => {
        btn.addEventListener('click', () => {
            const template = CONFIG.templates.find(t => t.id === parseInt(btn.dataset.id));
            editarTemplate(template);
        });
    });
    
    document.querySelectorAll('.delete-template').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir este template?')) {
                CONFIG.templates = CONFIG.templates.filter(t => t.id !== parseInt(btn.dataset.id));
                renderTemplates();
            }
        });
    });
}

function adicionarTemplate() {
    const nome = prompt('Nome do Template:');
    if (!nome) return;
    
    const descricao = prompt('Descrição do Template:');
    if (!descricao) return;
    
    const novoTemplate = {
        id: Date.now(),
        nome,
        descricao
    };
    
    CONFIG.templates.push(novoTemplate);
    renderTemplates();
}

function editarTemplate(template) {
    const novoNome = prompt('Editar Nome:', template.nome);
    if (novoNome === null) return;
    
    const novaDesc = prompt('Editar Descrição:', template.descricao);
    if (novaDesc === null) return;
    
    template.nome = novoNome;
    template.descricao = novaDesc;
    
    renderTemplates();
}

// Exportação
function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text('Relatório de Chamados', 10, 10);
    
    // Cabeçalho da tabela
    const headers = ['ID', 'Data', 'Empresa', 'Título', 'Status', 'Tempo'];
    let y = 20;
    
    headers.forEach((header, i) => {
        doc.text(header, 10 + (i * 35), y);
    });
    
    y += 10;
    
    // Dados da tabela
    chamados.forEach(chamado => {
        const row = [
            chamado.id,
            formatarData(chamado.data),
            chamado.empresaNome,
            chamado.titulo,
            formatarStatus(chamado.status),
            chamado.horaInicio && chamado.horaFim ? 
                calcularTempoFormatado(chamado.horaInicio, chamado.horaFim) : '-'
        ];
        
        row.forEach((cell, i) => {
            doc.text(cell.toString(), 10 + (i * 35), y);
        });
        
        y += 10;
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    
    doc.save('chamados.pdf');
}

function exportarExcel() {
    const dados = chamados.map(chamado => ({
        ID: chamado.id,
        Data: formatarData(chamado.data),
        Empresa: chamado.empresaNome,
        Título: chamado.titulo,
        Prioridade: formatarPrioridade(chamado.prioridade),
        Status: formatarStatus(chamado.status),
        'Tempo de Atendimento': chamado.horaInicio && chamado.horaFim ? 
            calcularTempoFormatado(chamado.horaInicio, chamado.horaFim) : '-',
        Descrição: chamado.descricao
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados");
    XLSX.writeFile(workbook, "chamados.xlsx");
}

// Funções auxiliares
function salvarDados() {
    localStorage.setItem('chamados', JSON.stringify(chamados));
    localStorage.setItem('empresas', JSON.stringify(empresas));
}

function loadData() {
    empresas = JSON.parse(localStorage.getItem('empresas')) || [];
    chamados = JSON.parse(localStorage.getItem('chamados')) || [];
    
    // Configurações
    CONFIG.validateCompany = document.getElementById('validate-company').checked;
    CONFIG.validateTime = document.getElementById('validate-time').checked;
}

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

function formatarPrioridade(prioridade) {
    const traducoes = {
        baixa: 'Baixa',
        media: 'Média',
        alta: 'Alta',
        critica: 'Crítica'
    };
    return traducoes[prioridade] || prioridade;
}

function calcularTempoChamado(chamado) {
    if (!chamado.horaInicio || !chamado.horaFim) return 0;
    
    const inicio = new Date(`2000-01-01T${chamado.horaInicio}`);
    const fim = new Date(`2000-01-01T${chamado.horaFim}`);
    return (fim - inicio) / (1000 * 60); // minutos
}

function calcularTempoFormatado(inicio, fim) {
    const minutos = calcularTempoChamado({ horaInicio: inicio, horaFim: fim });
    return formatarTempo(minutos);
}

function formatarTempo(minutos) {
    if (minutos < 60) return `${Math.round(minutos)}min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}min`;
}

function agruparChamadosPorEmpresa(chamadosList = chamados) {
    const grupos = {};
    
    chamadosList.forEach(chamado => {
        if (!grupos[chamado.empresaNome]) {
            grupos[chamado.empresaNome] = 0;
        }
        grupos[chamado.empresaNome]++;
    });
    
    return Object.entries(grupos).map(([empresa, quantidade]) => ({
        empresa,
        quantidade
    })).sort((a, b) => b.quantidade - a.quantidade);
}
