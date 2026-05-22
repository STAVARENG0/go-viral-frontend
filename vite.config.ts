import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Edit3,
  Instagram,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  PlugZap,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Wand2,
  X,
  XCircle,
  Zap
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.matheus-caetano.com').replace(/\/$/, '');
const MAX_OPTIONS = 7;

const triggerTemplates = [
  {
    id: 'new_follower',
    icon: UserPlus,
    title: 'Novo seguidor',
    keyword: 'novo seguidor',
    message: 'Bem-vindo(a)! Que bom ter você aqui. Escolha uma opção abaixo para continuar. 🚀',
    description: 'Receba automaticamente quem acabou de seguir o perfil.',
    strategy: 'Receber o novo seguidor com uma mensagem leve, criar conexão rápida e levar a pessoa para uma oferta, diagnóstico ou conversa inicial.'
  },
  {
    id: 'dm_keyword',
    icon: Send,
    title: 'Direct',
    keyword: 'oi',
    message: 'Oi! Eu sou o assistente da Go Viral. Escolha uma opção abaixo para eu te ajudar agora. 🚀',
    description: 'Responda quando a pessoa chamar no direct ou enviar uma palavra-chave.',
    strategy: 'Identificar a intenção da pessoa no direct, oferecer opções simples e encaminhar para atendimento, venda ou conteúdo.'
  },
  {
    id: 'comment_keyword',
    icon: MessageCircle,
    title: 'Comentário',
    keyword: 'quero',
    message: 'Perfeito! Aqui está o próximo passo. Escolha uma opção abaixo para continuar. 🔥',
    description: 'Transforme comentário com palavra-chave em conversa privada.',
    strategy: 'Transformar comentário em conversa privada, entregar o link prometido e continuar a jornada no direct.'
  }
];

function defaultOption() {
  return {
    label: 'Nova opção',
    response: 'Digite aqui a resposta automática desta opção.'
  };
}

function createFormFromTemplate(template = triggerTemplates[0]) {
  return {
    triggerType: template.id,
    title: template.title,
    strategy: template.strategy,
    keyword: template.keyword,
    message: template.message,
    linkLabel: template.id === 'comment_keyword' ? 'Acessar agora' : '',
    linkUrl: '',
    publicationMode: 'all',
    publicationUrl: '',
    active: true,
    options: [defaultOption()]
  };
}

function normalizeKeyword(value) {
  return String(value || '')
    .replace(/#/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatDate(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

function statusLabel(status) {
  const map = {
    sent: 'DM enviada',
    sent_text_fallback: 'DM enviada em texto',
    error: 'Erro no envio',
    dm_flow_sent: 'Fluxo enviado',
    dm_option_sent: 'Resposta da opção enviada',
    ignored_no_dm_option: 'Direct sem opção',
    ignored_no_keyword: 'Sem palavra-chave',
    ignored_missing_comment_data: 'Evento ignorado'
  };

  return map[status] || status || '—';
}

function statusIcon(status) {
  if (['sent', 'sent_text_fallback', 'dm_flow_sent', 'dm_option_sent'].includes(status)) {
    return <CheckCircle2 size={16} />;
  }

  if (status === 'error') {
    return <XCircle size={16} />;
  }

  return <Clock3 size={16} />;
}

function InstagramAvatar({ account }) {
  const username = account?.username || 'Instagram';
  const letter = username.replace('@', '').slice(0, 1).toUpperCase() || 'G';

  const photoUrl =
    account?.profile_picture_url ||
    account?.profilePictureUrl ||
    account?.profile_pic_url ||
    account?.picture_url ||
    account?.avatar_url ||
    account?.avatar ||
    account?.picture ||
    account?.profile_picture ||
    '';

  return (
    <div className="avatarWrap">
      <div className="avatarGlow" />

      {photoUrl ? (
        <img
          className="avatar avatarImage"
          src={photoUrl}
          alt={`Foto de @${username}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="avatar">{letter}</div>
      )}
    </div>
  );
}

function AuthScreen({ loading, onAuthenticated }) {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    code: '',
    termsAccepted: false,
    privacyAccepted: false
  });
  const [sending, setSending] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || 'Erro na solicitação.');
    return data;
  }

  async function requestCode(e) {
    e.preventDefault();
    setSending(true);

    try {
      await apiFetch('/api/auth/request-code', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          termsAccepted: form.termsAccepted,
          privacyAccepted: form.privacyAccepted
        })
      });

      setStep('code');
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setSending(true);

    try {
      const data = await apiFetch('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, code: form.code })
      });

      onAuthenticated(data.user);
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="loginPage">
      <section className="loginCard glassCard clientLoginCard">
        <img src="/logo.png" alt="Instagram Go Viral" className="logo" />

        <h1>Go Viral</h1>
        <p className="loginSubline">Automação para Instagram</p>
        <p>Painel privado para criar automações que seguram o cliente no direct.</p>

        {step === 'form' ? (
          <form onSubmit={requestCode} className="stack clientAuthForm">
            <div className="inlineFields">
              <label>
                Nome
                <input
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="given-name"
                />
              </label>

              <label>
                Sobrenome
                <input
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  placeholder="Seu sobrenome"
                  autoComplete="family-name"
                />
              </label>
            </div>

            <label>
              E-mail
              <input
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="voce@email.com"
                type="email"
                autoComplete="email"
              />
            </label>

            <label className="checkLine">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => update('termsAccepted', e.target.checked)}
              />
              <span>
                Aceito os <a href={`${API_BASE}/terms`} target="_blank" rel="noreferrer">Termos de Uso</a>.
              </span>
            </label>

            <label className="checkLine">
              <input
                type="checkbox"
                checked={form.privacyAccepted}
                onChange={(e) => update('privacyAccepted', e.target.checked)}
              />
              <span>
                Aceito a <a href={`${API_BASE}/privacy`} target="_blank" rel="noreferrer">Política de Privacidade</a>.
              </span>
            </label>

            <button disabled={sending || loading}>
              {sending ? <Loader2 className="spin" size={18} /> : <Mail size={18} />}
              Enviar código por e-mail
            </button>

            <small className="legalSmall">
              Ao continuar, você autoriza o uso dos dados informados para criação da conta, autenticação e operação da ferramenta.
            </small>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="stack clientAuthForm">
            <div className="codeNotice">
              <CheckCircle2 size={18} />
              Enviamos um código para <strong>{form.email}</strong>.
            </div>

            <label>
              Código de confirmação
              <input
                value={form.code}
                onChange={(e) => update('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="codeInput"
              />
            </label>

            <button disabled={sending || form.code.length !== 6}>
              {sending ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
              Confirmar e entrar
            </button>

            <button type="button" className="ghost" onClick={() => setStep('form')} disabled={sending}>
              Voltar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function AccountSettings({ user, loading, apiFetch, onUserUpdated }) {
  const [firstName, setFirstName] = useState(user?.first_name || user?.firstName || '');
  const [lastName, setLastName] = useState(user?.last_name || user?.lastName || '');
  const [note, setNote] = useState('');

  useEffect(() => {
    setFirstName(user?.first_name || user?.firstName || '');
    setLastName(user?.last_name || user?.lastName || '');
  }, [user?.id]);

  async function saveAccount(e) {
    e.preventDefault();

    try {
      const data = await apiFetch('/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ firstName, lastName })
      });

      onUserUpdated(data.user);
      alert('Conta atualizada.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function requestDeletion() {
    if (!confirm('Registrar solicitação de exclusão de dados desta conta?')) return;

    try {
      await apiFetch('/api/account/delete-request', {
        method: 'POST',
        body: JSON.stringify({ note })
      });

      setNote('');
      alert('Solicitação registrada.');
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <section className="panel accountPanel" id="configuracoes">
      <div className="panelHeader">
        <div>
          <h2><Settings size={20} /> Configurações da conta</h2>
          <p>Gerencie seus dados básicos, termos e privacidade.</p>
        </div>
      </div>

      <form className="formGrid" onSubmit={saveAccount}>
        <label>
          Nome
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>

        <label>
          Sobrenome
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>

        <label className="wide">
          E-mail
          <input value={user?.email || ''} disabled />
        </label>

        <button className="wide" disabled={loading}>
          <Save size={18} /> Salvar dados da conta
        </button>
      </form>

      <div className="legalCards">
        <a href={`${API_BASE}/terms`} target="_blank" rel="noreferrer">Termos de Uso</a>
        <a href={`${API_BASE}/privacy`} target="_blank" rel="noreferrer">Política de Privacidade</a>
        <a href={`${API_BASE}/data-deletion`} target="_blank" rel="noreferrer">Exclusão de Dados</a>
      </div>

      <div className="deletionBox">
        <h3>Solicitar exclusão de dados</h3>
        <p>Use esta opção para registrar uma solicitação formal de exclusão de conta e dados conectados.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Opcional: explique o motivo ou o dado que deseja remover."
        />
        <button className="dangerText" onClick={requestDeletion} disabled={loading}>
          <Trash2 size={18} /> Solicitar exclusão
        </button>
      </div>
    </section>
  );
}

function App() {
  const cameFromInstagram = window.location.search.includes('connected=instagram');

  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [form, setForm] = useState(createFormFromTemplate());

  const selectedTemplate = useMemo(
    () => triggerTemplates.find((template) => template.id === form.triggerType) || triggerTemplates[0],
    [form.triggerType]
  );

  const mainAccount = accounts[0] || null;
  const activeRules = rules.filter((rule) => rule.active !== 0 && rule.active !== false);

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Erro na solicitação.');
    }

    return data;
  }

  async function checkSession() {
    try {
      const data = await apiFetch('/api/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadData() {
    if (!user) return;

    setLoading(true);

    try {
      const [rulesData, accountsData, logsData] = await Promise.all([
        apiFetch('/api/rules'),
        apiFetch('/api/accounts'),
        apiFetch('/api/logs')
      ]);

      setRules(Array.isArray(rulesData) ? rulesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error(err);
      if (/sessão|unauthorized|expirada/i.test(err.message)) {
        setUser(null);
        alert('Sua sessão expirou. Entre novamente.');
      } else {
        alert('Erro ao carregar dados do painel.');
      }
    } finally {
      setLoading(false);
    }
  }

  function cleanOptions(options) {
    return (options || [])
      .slice(0, MAX_OPTIONS)
      .map((option) => ({
        label: String(option.label || '').trim(),
        response: String(option.response || '').trim()
      }))
      .filter((option) => option.label && option.response);
  }

  async function saveRule() {
    setLoading(true);

    try {
      const payload = {
        triggerType: form.triggerType,
        title: form.title,
        strategy: form.strategy,
        keyword: normalizeKeyword(form.keyword),
        message: form.message,
        linkLabel: form.linkLabel,
        linkUrl: form.linkUrl,
        publicationMode: form.publicationMode,
        publicationUrl: form.publicationUrl,
        active: form.active,
        options: cleanOptions(form.options)
      };

      if (editingRuleId) {
        await apiFetch(`/api/rules/${editingRuleId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/api/rules', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setEditingRuleId(null);
      setForm(createFormFromTemplate(selectedTemplate));
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function editRule(rule) {
    const template = triggerTemplates.find((item) => item.id === (rule.triggerType || rule.trigger_type)) || triggerTemplates[0];

    setEditingRuleId(rule.id);
    setForm({
      triggerType: rule.triggerType || rule.trigger_type || template.id,
      title: rule.title || template.title,
      strategy: rule.strategy || template.strategy,
      keyword: rule.keyword || template.keyword,
      message: rule.message || template.message,
      linkLabel: rule.linkLabel || rule.link_label || '',
      linkUrl: rule.linkUrl || rule.link_url || '',
      publicationMode: rule.publicationMode || rule.publication_mode || 'all',
      publicationUrl: rule.publicationUrl || rule.publication_url || '',
      active: rule.active !== 0 && rule.active !== false,
      options: Array.isArray(rule.options) && rule.options.length ? rule.options.slice(0, MAX_OPTIONS) : [defaultOption()]
    });

    window.location.hash = '#caminho';
  }

  async function deleteRule(id) {
    if (!confirm('Excluir esta automação?')) return;

    setLoading(true);

    try {
      await apiFetch(`/api/rules/${id}`, {
        method: 'DELETE'
      });

      if (editingRuleId === id) {
        setEditingRuleId(null);
        setForm(createFormFromTemplate(selectedTemplate));
      }

      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectInstagram() {
    if (!mainAccount) {
      alert('Nenhuma conta Instagram conectada.');
      return;
    }

    const ok = confirm(
      `Desconectar @${mainAccount.username}?\n\nIsso vai remover a conta, as automações e os registros dessa conta.`
    );

    if (!ok) return;

    setLoading(true);

    try {
      await apiFetch(`/api/accounts/${mainAccount.id}`, {
        method: 'DELETE'
      });

      setAccounts([]);
      setRules([]);
      setLogs([]);

      alert('Instagram desconectado com sucesso.');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearLogs() {
    if (!confirm('Apagar todo o registro de atividades desta conta?')) return;

    setLoading(true);

    try {
      await apiFetch('/api/logs', {
        method: 'DELETE'
      });

      setLogs([]);
      alert('Registro de atividades apagado.');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function connectInstagram() {
    window.location.href = `${API_BASE}/auth/instagram/start`;
  }

  async function logout() {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } catch {
      // Mesmo se a sessão já expirou, limpamos a interface.
    }

    setUser(null);
    setRules([]);
    setAccounts([]);
    setLogs([]);
  }

  function pickTrigger(template) {
    setEditingRuleId(null);
    setForm(createFormFromTemplate(template));
  }

  function updateOption(index, field, value) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      )
    }));
  }

  function addOption() {
    setForm((prev) => {
      if (prev.options.length >= MAX_OPTIONS) return prev;
      return { ...prev, options: [...prev.options, defaultOption()] };
    });
  }

  function removeOption(index) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, optionIndex) => optionIndex !== index)
    }));
  }

  function cancelEdit() {
    setEditingRuleId(null);
    setForm(createFormFromTemplate(selectedTemplate));
  }

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (cameFromInstagram && user) {
      loadData();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [cameFromInstagram, user?.id]);

  if (checkingSession) {
    return (
      <main className="loginPage">
        <section className="loginCard glassCard">
          <img src="/logo.png" alt="Instagram Go Viral" className="logo" />
          <h1>Go Viral</h1>
          <p>Carregando sessão segura...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen loading={loading} onAuthenticated={setUser} />;
  }

  return (
    <main className="appShell">
      <section className="siteFrame">
        <header className="siteHeader centeredHeader">
          <div className="brandTop">
            <img src="/logo.png" alt="Instagram Go Viral" className="brandLogoSmall" />

            <div>
              <h1>Go Viral</h1>
              <p>Automação para Instagram</p>
            </div>
          </div>

          <button className="small ghost refreshButton" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Atualizar
          </button>
        </header>

        <nav className="topMenu">
          <a className="menuItem active" href="#caminho">
            <Wand2 size={15} /> Caminho mental
          </a>

          <a className="menuItem" href="#ativas">
            <PlugZap size={15} /> Automatizações ativas
          </a>

          <a className="menuItem" href="#logs">
            <Activity size={15} /> Registro de atividades
          </a>

          <a className="menuItem" href="#configuracoes">
            <Settings size={15} /> Configurações da conta
          </a>

          <button className="menuItem logoutMenu" onClick={logout}>
            <LogOut size={15} /> Sair
          </button>
        </nav>

        <section className="panel connectionPanel" id="conta">
          <h2>
            <Instagram size={20} /> Conexão do Instagram
          </h2>

          <p>
            {mainAccount
              ? `Instagram conectado: @${mainAccount.username}.`
              : 'Conecte o Instagram que vai usar as automações desta conta.'}
          </p>

          <div className="connectionActions">
            <button onClick={connectInstagram} disabled={loading}>
              <Instagram size={18} />
              {mainAccount ? 'Trocar Instagram' : 'Conectar Instagram'}
            </button>

            {mainAccount && (
              <button className="dangerText" onClick={disconnectInstagram} disabled={loading}>
                <Trash2 size={18} />
                Desconectar Instagram
              </button>
            )}
          </div>
        </section>

        <section className="heroBanner">
          <div className="heroContent">
            <span className="eyebrow">
              <Zap size={14} /> Cliente entra, escolhe e continua conversando
            </span>

            <h2>Automação para Instagram no estilo Go Viral.</h2>

            <p>
              Monte fluxos com opções editáveis para comentário, direct e seguidores.
              A prévia mostra como a conversa aparece para o cliente.
            </p>
          </div>
        </section>

        <section className="profileHero">
          <InstagramAvatar account={mainAccount} />

          <div className="profileInfo">
            <span className="label">Perfil conectado</span>

            <h2>{mainAccount ? `@${mainAccount.username}` : 'Nenhuma conta conectada'}</h2>

            <p>
              {mainAccount
                ? mainAccount.biography || `Conectada em ${formatDate(mainAccount.connected_at)}`
                : 'Clique em “Conectar Instagram” para autorizar mensagens, comentários e foto de perfil.'}
            </p>

            {mainAccount?.connected_at && (
              <p className="profileDate">Conectada em {formatDate(mainAccount.connected_at)}</p>
            )}
          </div>

          <div className="statusBadge">
            <ShieldCheck size={16} /> {mainAccount ? 'Ativo' : 'Pendente'}
          </div>
        </section>

        <div className="grid cards twoCards">
          <div className="metricCard">
            <Bot />
            <strong>{activeRules.length}</strong>
            <span>Automatizações ativas</span>
          </div>

          <div className="metricCard">
            <MessageCircle />
            <strong>{logs.length}</strong>
            <span>Atividades registradas</span>
          </div>
        </div>

        <section className="mentalPanel" id="caminho">
          <div className="panelHeader">
            <div>
              <h2>
                <Wand2 size={20} /> Caminho mental da automação
              </h2>
              <p>{editingRuleId ? 'Editando automação existente.' : 'Escolha o gatilho, edite a estratégia e salve o fluxo.'}</p>
            </div>

            {editingRuleId && (
              <button className="small ghost" onClick={cancelEdit} disabled={loading}>
                <X size={16} /> Cancelar edição
              </button>
            )}
          </div>

          <div className="pathGrid">
            <div className="pathColumn">
              <span className="stepNumber">1</span>
              <h3>Quando começa?</h3>

              <div className="templateList">
                {triggerTemplates.map((template) => {
                  const Icon = template.icon;

                  return (
                    <button
                      key={template.id}
                      className={form.triggerType === template.id ? 'templateCard active' : 'templateCard'}
                      onClick={() => pickTrigger(template)}
                    >
                      <Icon size={18} />
                      <strong>{template.title}</strong>
                      <small>{template.description}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pathColumn">
              <span className="stepNumber">2</span>
              <h3>Estratégia editável</h3>

              <label className="strategyEditor">
                Estratégia para {selectedTemplate.title.toLowerCase()}
                <textarea
                  value={form.strategy}
                  onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                />
              </label>

              <div className="optionSummary">
                <strong>Opções de resposta</strong>
                <small>{form.options.length}/{MAX_OPTIONS} opções criadas</small>
              </div>

              <button className="templateCard addOptionCard" onClick={addOption} disabled={form.options.length >= MAX_OPTIONS}>
                <Plus size={18} />
                <strong>Adicionar nova opção</strong>
                <small>Crie botões personalizados para o cliente clicar no direct.</small>
              </button>
            </div>

            <div className="pathColumn previewColumn">
              <span className="stepNumber">3</span>
              <h3>Prévia no direct</h3>

              <div className="phonePreview">
                <div className="phoneHeader">
                  <InstagramAvatar account={mainAccount} />
                  <strong>{mainAccount ? mainAccount.username : 'go.viral'}</strong>
                </div>

                <div className="bubble botBubble">
                  <p>{form.message}</p>

                  {form.linkUrl && <button>{form.linkLabel || 'Acessar agora'}</button>}

                  {form.options.map((option, index) => (
                    <button key={`${option.label}-${index}`}>{option.label || `Opção ${index + 1}`}</button>
                  ))}
                </div>

                <div className="bubble userBubble">
                  {form.options[0]?.label || 'Quero automatizar 🚀'}
                </div>

                <div className="bubble botBubble smallBubble">
                  {form.options[0]?.response || 'Resposta automática da opção escolhida.'}
                </div>
              </div>

              <button className="primaryAction" onClick={saveRule} disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                {editingRuleId ? 'Salvar alterações' : 'Salvar automação'}
              </button>
            </div>
          </div>

          <details className="advancedBox" open>
            <summary>Configuração da automação</summary>

            <div className="formGrid">
              <label>
                Título do fluxo
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label>
                Palavra-chave
                <input
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                />
              </label>

              <label className="wide">
                Mensagem inicial
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </label>

              <label>
                Nome do link
                <input
                  placeholder="Ex: Acessar agora"
                  value={form.linkLabel}
                  onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                />
              </label>

              <label>
                URL do link
                <input
                  placeholder="https://..."
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                />
              </label>

              {form.options.map((option, index) => (
                <div className="wide optionEditor" key={`option-${index}`}>
                  <div className="optionEditorHeader">
                    <strong>Opção {index + 1}</strong>
                    <button type="button" className="iconGhost" onClick={() => removeOption(index)} disabled={form.options.length <= 1}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <label>
                    Texto do botão
                    <input
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      maxLength={60}
                    />
                  </label>

                  <label>
                    Resposta do botão
                    <textarea
                      value={option.response}
                      onChange={(e) => updateOption(index, 'response', e.target.value)}
                    />
                  </label>
                </div>
              ))}

              <button type="button" className="wide ghost" onClick={addOption} disabled={form.options.length >= MAX_OPTIONS}>
                <Plus size={18} /> Adicionar nova opção
              </button>
            </div>
          </details>
        </section>

        <section className="panel" id="ativas">
          <h2>
            <PlugZap size={20} /> Automatizações ativas
          </h2>

          <div className="rulesList">
            {rules.map((rule) => (
              <div className="rule" key={rule.id}>
                <div>
                  <strong>{rule.title || rule.keyword}</strong>
                  <p>{rule.message}</p>

                  {rule.strategy && <p>{rule.strategy}</p>}

                  <span>
                    <ArrowRight size={14} /> {rule.options?.length || 0} opções configuradas
                  </span>

                  {rule.link_url && (
                    <span>
                      <LinkIcon size={14} /> {rule.link_label || 'Acessar aqui'}: {rule.link_url}
                    </span>
                  )}
                </div>

                <div className="ruleActions">
                  <button
                    className="ghost iconAction"
                    onClick={() => editRule(rule)}
                    title="Editar automação"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    className="danger"
                    onClick={() => deleteRule(rule.id)}
                    title="Excluir automação"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {!rules.length && <p className="empty">Nenhuma automação criada ainda.</p>}
          </div>
        </section>

        <section className="panel" id="logs">
          <div className="panelHeader">
            <div>
              <h2>
                <Activity size={20} /> Registro de atividades
              </h2>
              <p>Veja as DMs enviadas e erros de envio desta conta.</p>
            </div>

            <button className="small ghost" onClick={clearLogs} disabled={loading || !logs.length}>
              <Trash2 size={16} />
              Apagar registros
            </button>
          </div>

          <div className="logsList">
            {logs.slice(0, 12).map((log) => (
              <div className={`logItem ${log.status || ''}`} key={log.id}>
                <div className="logStatus">
                  {statusIcon(log.status)} {statusLabel(log.status)}
                </div>

                <p>{log.comment_text || 'Sem texto'}</p>

                {log.matched_keyword && <span>Gatilho: {log.matched_keyword}</span>}
                {log.error && <span>Erro: {log.error}</span>}
              </div>
            ))}

            {!logs.length && <p className="empty">Nenhum evento registrado ainda.</p>}
          </div>
        </section>

        <AccountSettings
          user={user}
          loading={loading}
          apiFetch={apiFetch}
          onUserUpdated={setUser}
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
