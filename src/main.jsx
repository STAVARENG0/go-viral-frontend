import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Instagram,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MessageCircle,
  PlugZap,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Wand2,
  XCircle,
  Zap
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://server-production-3741.up.railway.app').replace(/\/$/, '');

const triggerTemplates = [
  {
    id: 'new_follower',
    icon: UserPlus,
    title: 'Novo seguidor',
    keyword: 'novo seguidor',
    message: 'Bem-vindo(a)! Que bom ter você aqui. Quer descobrir o melhor caminho para começar?',
    description: 'Modelo pronto para receber quem acabou de seguir o perfil.',
    strategy: 'Receber o novo seguidor com uma mensagem leve, criar conexão rápida e levar a pessoa para uma oferta, diagnóstico ou conversa inicial.'
  },
  {
    id: 'dm_keyword',
    icon: Send,
    title: 'Chamou no direct',
    keyword: 'oi',
    message: 'Oi! Eu sou o assistente da Go Viral. Escolha uma opção abaixo para eu te ajudar agora. 🚀',
    description: 'Quando a pessoa chama no direct, o fluxo responde.',
    strategy: 'Identificar a intenção da pessoa no direct, oferecer opções simples e encaminhar para atendimento, venda ou conteúdo.'
  },
  {
    id: 'comment_keyword',
    icon: MessageCircle,
    title: 'Comentou palavra-chave',
    keyword: 'quero',
    message: 'Perfeito! Aqui está o próximo passo. Escolha uma opção abaixo para continuar. 🔥',
    description: 'Quando a pessoa comenta uma palavra-chave, ela recebe a automação.',
    strategy: 'Transformar comentário em conversa privada, entregar o link prometido e continuar a jornada no direct.'
  }
];

const optionTemplatesByTrigger = {
  new_follower: [
    {
      label: 'Quero conhecer melhor 🚀',
      response: 'Perfeito! Me conta qual é seu principal objetivo hoje: vender mais, captar leads ou automatizar atendimento?'
    },
    {
      label: 'Ver oferta especial',
      response: 'Boa! Vou te mandar o link da oferta especial. Depois me chama aqui se quiser ajuda para escolher o melhor caminho.'
    },
    {
      label: 'Falar com humano',
      response: 'Claro! Me envie seu nome e o melhor horário para atendimento.'
    }
  ],
  dm_keyword: [
    {
      label: 'Quero automatizar meu Instagram 🚀',
      response: 'Perfeito! A Go Viral automatiza atendimento, comentários e directs. Me envie seu objetivo principal: vender, captar lead ou suporte?'
    },
    {
      label: 'Ver planos e valores',
      response: 'Temos opções para começar simples e escalar. Me diga quantas mensagens você recebe por dia para eu indicar o melhor plano.'
    },
    {
      label: 'Falar com humano',
      response: 'Claro! Já vou te direcionar. Envie seu nome e melhor horário para atendimento.'
    }
  ],
  comment_keyword: [
    {
      label: 'Acessar agora',
      response: 'Aqui está o acesso que você pediu. Se tiver dúvida, me responde aqui que eu te ajudo.'
    },
    {
      label: 'Receber diagnóstico grátis',
      response: 'Ótimo! Me mande seu @ do Instagram e eu analiso onde sua automação pode segurar mais clientes.'
    },
    {
      label: 'Quero falar com alguém',
      response: 'Combinado! Me envie seu nome e melhor horário para atendimento.'
    }
  ]
};

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
    options: optionTemplatesByTrigger[template.id].slice(0, 3)
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

function App() {
  const cameFromInstagram = window.location.search.includes('connected=instagram');

  const [pin, setPin] = useState('');
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createFormFromTemplate());

  const selectedTemplate = useMemo(
    () => triggerTemplates.find((template) => template.id === form.triggerType) || triggerTemplates[0],
    [form.triggerType]
  );

  const availableOptions = optionTemplatesByTrigger[form.triggerType] || [];
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

  async function login(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ pin })
      });

      setUser(data.user);
      setPin('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
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
      alert('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  }

  async function createRule() {
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
        options: form.options
      };

      await apiFetch('/api/rules', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setForm(createFormFromTemplate(selectedTemplate));
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(id) {
    if (!confirm('Excluir esta automação?')) return;

    setLoading(true);

    try {
      await apiFetch(`/api/rules/${id}`, {
        method: 'DELETE'
      });

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
    setPin('');
    setRules([]);
    setAccounts([]);
    setLogs([]);
  }

  function pickTrigger(template) {
    setForm(createFormFromTemplate(template));
  }

  function toggleOption(option) {
    const exists = form.options.some((item) => item.label === option.label);

    setForm((prev) => ({
      ...prev,
      options: exists
        ? prev.options.filter((item) => item.label !== option.label)
        : [...prev.options, { ...option }].slice(0, 3)
    }));
  }

  function updateOption(index, field, value) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      )
    }));
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
    return (
      <main className="loginPage">
        <section className="loginCard glassCard">
          <img src="/logo.png" alt="Instagram Go Viral" className="logo" />

          <h1>Go Viral</h1>
          <p className="loginSubline">Automação para Instagram</p>

          <p>Painel privado para criar caminhos automáticos que seguram o cliente no direct.</p>

          <form onSubmit={login} className="stack">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN de acesso"
              type="password"
            />

            <button disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
              Entrar
            </button>
          </form>
        </section>
      </main>
    );
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
              Monte fluxos com opções prontas para comentário, direct e seguidores.
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
              <p>Escolha o gatilho, edite a estratégia e salve o fluxo.</p>
            </div>
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

              <div className="templateList">
                {availableOptions.map((option) => {
                  const active = form.options.some((item) => item.label === option.label);

                  return (
                    <button
                      key={option.label}
                      className={active ? 'templateCard active option' : 'templateCard option'}
                      onClick={() => toggleOption(option)}
                    >
                      <CheckCircle2 size={18} />
                      <strong>{option.label}</strong>
                      <small>{option.response}</small>
                    </button>
                  );
                })}
              </div>
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

                  {form.options.map((option) => (
                    <button key={option.label}>{option.label}</button>
                  ))}
                </div>

                <div className="bubble userBubble">
                  {form.options[0]?.label || 'Quero automatizar 🚀'}
                </div>

                <div className="bubble botBubble smallBubble">
                  {form.options[0]?.response || 'Resposta automática da opção escolhida.'}
                </div>
              </div>

              <button className="primaryAction" onClick={createRule} disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                Salvar automação
              </button>
            </div>
          </div>

          <details className="advancedBox">
            <summary>Configuração avançada</summary>

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
                <div className="wide optionEditor" key={`${option.label}-${index}`}>
                  <label>
                    Texto do botão {index + 1}
                    <input
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                    />
                  </label>

                  <label>
                    Resposta do botão {index + 1}
                    <textarea
                      value={option.response}
                      onChange={(e) => updateOption(index, 'response', e.target.value)}
                    />
                  </label>
                </div>
              ))}
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

                <button
                  className="danger"
                  onClick={() => deleteRule(rule.id)}
                  title="Excluir automação"
                >
                  <Trash2 size={16} />
                </button>
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
              </div>
            ))}

            {!logs.length && <p className="empty">Nenhum evento registrado ainda.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
