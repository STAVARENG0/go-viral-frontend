import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  Edit3,
  Gift,
  Camera,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Menu,
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
  Wand2,
  X,
  XCircle
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.matheus-caetano.com').replace(/\/$/, '');
const MAX_OPTIONS = 3;
const MAX_FLOW_DEPTH = 8;
const MAX_FLOW_NODES = 60;

const triggerTemplates = [
  {
    id: 'comment_keyword',
    icon: MessageCircle,
    title: 'Comentário',
    keyword: 'quero',
    message: 'Perfeito! Escolha uma opção abaixo para eu te enviar o próximo passo.',
    description: 'Transforme comentário com palavra-chave em conversa privada.',
    strategy: 'Transformar comentário em conversa privada, entregar o link prometido e continuar a jornada no direct.'
  },
  {
    id: 'dm_keyword',
    icon: Send,
    title: 'Direct',
    keyword: 'oi',
    message: 'Oi! Escolha uma opção abaixo para eu te ajudar agora.',
    description: 'Responda quando a pessoa chamar no direct ou enviar uma palavra-chave.',
    strategy: 'Identificar a intenção da pessoa no direct, oferecer opções simples e encaminhar para atendimento, venda ou conteúdo.'
  },
  {
    id: 'welcome_contact',
    icon: Sparkles,
    title: 'Boas-vindas',
    keyword: 'boas vindas',
    message: 'Oi! Que bom te ver por aqui. Escolha uma opção abaixo para eu te ajudar.',
    description: 'Receba a pessoa no primeiro comentário/direct quando não houver outra palavra-chave.',
    strategy: 'Dar boas-vindas ao novo contato na primeira interação, apresentar opções simples e levar a pessoa para uma conversa útil.'
  }
];

function defaultOption(index = 0) {
  const labels = ['Saber mais', 'Quero o link', 'Agendar'];
  return {
    label: labels[index] || `Opção ${index + 1}`,
    actionType: 'response',
    response: '',
    linkLabel: 'Acessar agora',
    linkUrl: '',
    options: []
  };
}

function optionActionType(option = {}) {
  if (Array.isArray(option.options) && option.options.length) return 'flow';
  if (option.actionType || option.action_type) return option.actionType || option.action_type;
  const hasResponse = Boolean(String(option.response || '').trim());
  const hasLink = Boolean(String(option.linkUrl || option.link_url || '').trim());
  if (hasResponse && hasLink) return 'both';
  if (hasLink) return 'link';
  return 'response';
}

function prepareOptionForForm(option = {}, index = 0, depth = 0) {
  const children = Array.isArray(option.options) && depth + 1 < MAX_FLOW_DEPTH
    ? option.options.slice(0, MAX_OPTIONS).map((child, childIndex) => prepareOptionForForm(child, childIndex, depth + 1))
    : [];

  return {
    label: option.label || `Botão ${index + 1}`,
    actionType: children.length ? 'flow' : optionActionType(option),
    response: option.response || '',
    linkLabel: option.linkLabel || option.link_label || 'Acessar agora',
    linkUrl: option.linkUrl || option.link_url || '',
    options: children
  };
}

function cleanFlowOptions(options = [], depth = 0, state = { count: 0 }) {
  if (!Array.isArray(options) || depth >= MAX_FLOW_DEPTH || state.count >= MAX_FLOW_NODES) return [];

  return options
    .slice(0, MAX_OPTIONS)
    .map((option, index) => {
      if (state.count >= MAX_FLOW_NODES) return null;
      state.count += 1;

      const children = cleanFlowOptions(option.options || [], depth + 1, state);
      const actionType = optionActionType({ ...option, options: children });
      const isFlow = actionType === 'flow';

      return {
        label: String(option.label || '').trim().slice(0, 20),
        actionType: isFlow ? 'flow' : actionType,
        response: String(option.response || '').trim(),
        linkLabel: String(option.linkLabel || option.link_label || 'Acessar agora').trim(),
        linkUrl: isFlow ? '' : String(option.linkUrl || option.link_url || '').trim(),
        options: isFlow ? children : []
      };
    })
    .filter((option) => option && option.label && (option.response || option.linkUrl || option.options.length) && !isPlaceholderOption(option));
}

function validateOptionsTree(options = [], depth = 0, state = { count: 0 }) {
  for (const option of options) {
    state.count += 1;

    if (state.count > MAX_FLOW_NODES) return `Use no máximo ${MAX_FLOW_NODES} botões no fluxo inteiro.`;
    if (depth >= MAX_FLOW_DEPTH) return `Use no máximo ${MAX_FLOW_DEPTH} níveis de mensagens.`;

    const labelProblem = automationTextProblem(option.label, 'Texto do botão');
    if (labelProblem) return labelProblem;

    const hasChildren = Array.isArray(option.options) && option.options.length > 0;
    if (!option.response && !option.linkUrl && !hasChildren) return 'Cada opção precisa ter mensagem, link ou próximas opções.';
    if (hasChildren && !option.response) return `A opção "${option.label}" precisa ter a mensagem que será enviada antes dos próximos botões.`;

    if (option.response) {
      const responseProblem = automationTextProblem(option.response, hasChildren ? 'Mensagem da próxima etapa' : 'Resposta do botão');
      if (responseProblem) return responseProblem;
    }

    const childProblem = validateOptionsTree(option.options || [], depth + 1, state);
    if (childProblem) return childProblem;
  }

  return null;
}

function pathArray(path) {
  return Array.isArray(path) ? path : [path];
}

function updateOptionTree(options = [], path, updater) {
  const indexes = pathArray(path);
  const [currentIndex, ...rest] = indexes;

  return options.map((option, index) => {
    if (index !== currentIndex) return option;
    if (!rest.length) return updater(option);
    return { ...option, options: updateOptionTree(option.options || [], rest, updater) };
  });
}

function addChildOptionToTree(options = [], path) {
  return updateOptionTree(options, path, (option) => {
    const children = Array.isArray(option.options) ? option.options : [];
    if (children.length >= MAX_OPTIONS) return option;
    return { ...option, actionType: 'flow', linkUrl: '', options: [...children, defaultOption(children.length)] };
  });
}

function removeOptionFromTree(options = [], path) {
  const indexes = pathArray(path);
  const [currentIndex, ...rest] = indexes;

  if (!rest.length) {
    return options.filter((_, index) => index !== currentIndex);
  }

  return options.map((option, index) => {
    if (index !== currentIndex) return option;
    return { ...option, options: removeOptionFromTree(option.options || [], rest) };
  });
}

function createFormFromTemplate(template = triggerTemplates[0]) {
  return {
    triggerType: template.id,
    title: template.title,
    strategy: template.strategy,
    keyword: template.keyword,
    message: template.message,
    linkLabel: template.id === 'comment_keyword' || template.id === 'welcome_contact' ? 'Acessar agora' : '',
    linkUrl: '',
    publicationMode: 'all',
    publicationUrl: '',
    active: true,
    options: [defaultOption(0)]
  };
}

function normalizeKeyword(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/#/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeReferralCode(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);
}

const APP_VIEWS = [
  { id: 'automacao', hash: 'caminho', label: 'Montar automação', icon: Wand2 },
  { id: 'ativas', hash: 'ativas', label: 'Automações salvas', icon: PlugZap },
  { id: 'logs', hash: 'logs', label: 'Registros', icon: Activity },
  { id: 'planos', hash: 'planos', label: 'Pagamento', icon: CreditCard },
  { id: 'afiliados', hash: 'afiliados', label: 'Afiliados', icon: Gift },
  { id: 'configuracoes', hash: 'configuracoes', label: 'Conta', icon: Settings }
];

function getInitialAppView() {
  const hash = window.location.hash.replace('#', '');
  return APP_VIEWS.find((item) => item.hash === hash || item.id === hash)?.id || 'automacao';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

function automationTextProblem(value, label = 'Mensagem') {
  const text = String(value || '').trim();
  const normalized = normalizeKeyword(text);

  if (!text) return `${label} é obrigatória.`;
  if (/^\d+$/.test(text)) return `${label} não pode ser só número.`;
  if (text.length < 4) return `${label} precisa ser uma frase maior.`;

  const blocked = new Set([
    'nova opcao',
    'digite aqui',
    'digite aqui a resposta automatica desta opcao'
  ]);

  if (blocked.has(normalized)) return `${label} ainda está com texto de exemplo.`;
  return null;
}

function isPlaceholderOption(option) {
  const label = normalizeKeyword(option?.label);
  const response = normalizeKeyword(option?.response);
  return label === 'nova opcao' || response === 'digite aqui a resposta automatica desta opcao' || response === 'digite aqui';
}

function statusLabel(status) {
  const map = {
    sent: 'DM enviada',
    sent_quick_replies: 'DM enviada com botões',
    sent_text_fallback: 'DM enviada em texto',
    error: 'Erro no envio',
    dm_flow_sent: 'Fluxo enviado',
    dm_quick_replies_sent: 'Fluxo com botões enviado',
    dm_option_sent: 'Resposta da opção enviada',
    dm_option_sent_text: 'Resposta digitada enviada',
    ignored_no_dm_option: 'Direct sem opção',
    ignored_no_keyword: 'Sem palavra-chave',
    ignored_missing_comment_data: 'Evento ignorado',
    welcome_sent: 'Boas-vindas enviada',
    welcome_sent_quick_replies: 'Boas-vindas com botões',
    welcome_sent_text: 'Boas-vindas em texto',
    sent_direct_fallback: 'DM enviada por fallback',
    sent_direct_fallback_text: 'DM fallback em texto',
    error_invalid_private_reply: 'Comentário recusado pela Meta'
  };
  return map[status] || status || '—';
}

function statusIcon(status) {
  if (['sent', 'sent_quick_replies', 'sent_text_fallback', 'dm_flow_sent', 'dm_quick_replies_sent', 'dm_option_sent', 'dm_option_sent_text', 'welcome_sent', 'welcome_sent_quick_replies', 'welcome_sent_text', 'sent_direct_fallback', 'sent_direct_fallback_text'].includes(status)) {
    return <CheckCircle2 size={16} />;
  }
  if (status === 'error') return <XCircle size={16} />;
  return <Activity size={16} />;
}


function statusTriggerLabel(triggerType) {
  const map = {
    comment_keyword: 'Comentário com palavra-chave',
    dm_keyword: 'Direct com palavra-chave',
    welcome_contact: 'Boas-vindas no primeiro contato'
  };
  return map[triggerType] || triggerType || 'Automação';
}

function InstagramAvatar({ account, compact = false }) {
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
    <div className={compact ? 'avatarWrap compact' : 'avatarWrap'}>
      {photoUrl ? (
        <img src={photoUrl} alt={`Perfil ${username}`} className="avatar avatarImage" />
      ) : (
        <div className="avatar">{letter}</div>
      )}
    </div>
  );
}

function getPasswordStrength(password) {
  const value = String(password || '');
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) return { score: 0, label: 'Digite uma senha', className: 'empty' };
  if (score <= 2) return { score, label: 'Senha fraca', className: 'weak' };
  if (score === 3) return { score, label: 'Senha boa', className: 'good' };
  return { score, label: 'Senha forte', className: 'strong' };
}

function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password);
  const bars = [1, 2, 3, 4];

  return (
    <div className={`passwordStrength ${strength.className}`}>
      <div className="strengthBars">
        {bars.map((bar) => (
          <span key={bar} className={bar <= strength.score ? 'filled' : ''} />
        ))}
      </div>
      <small>{strength.label}</small>
    </div>
  );
}

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na solicitação.');
  return data;
}

function AuthScreen({ onAuthenticated }) {
  const params = new URLSearchParams(window.location.search);
  const initialRef = params.get('ref') || '';
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
    referralCode: initialRef,
    termsAccepted: false,
    privacyAccepted: false
  });
  const [sending, setSending] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setStep('form');
    setForm((prev) => ({ ...prev, password: '', confirmPassword: '', code: '' }));
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
    return parseJsonResponse(res);
  }

  async function login(e) {
    e.preventDefault();
    setSending(true);
    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      onAuthenticated(data.user);
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  }

  async function signup(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('As senhas não conferem.');
      return;
    }
    if (getPasswordStrength(form.password).score < 3) {
      alert('Use uma senha melhor antes de continuar.');
      return;
    }
    setSending(true);
    try {
      await apiFetch('/api/auth/signup-code', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          referralCode: form.referralCode,
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

  async function verifySignup(e) {
    e.preventDefault();
    setSending(true);
    try {
      const data = await apiFetch('/api/auth/signup-verify-password', {
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

  async function requestResetCode(e) {
    e.preventDefault();
    setSending(true);
    try {
      await apiFetch('/api/auth/reset-code', {
        method: 'POST',
        body: JSON.stringify({ email: form.email })
      });
      setStep('code');
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('As senhas não conferem.');
      return;
    }
    if (getPasswordStrength(form.password).score < 3) {
      alert('Use uma senha melhor antes de continuar.');
      return;
    }
    setSending(true);
    try {
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, code: form.code, password: form.password })
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
      <section className="loginCard glassCard">
        <div className="loginBrandBlock">
          <img src="/logo.png" alt="Instagram Go Viral" className="logo" />
          <span className="eyebrow">Automação para Instagram</span>
          <h1>Go Viral</h1>
          <p>Painel privado para criar automações que seguram o cliente no direct.</p>
        </div>

        <div className="authTabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Entrar</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Criar conta</button>
        </div>

        {mode === 'login' && (
          <form className="stack clientAuthForm" onSubmit={login}>
            <label>
              E-mail
              <input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="voce@email.com" type="email" autoComplete="email" />
            </label>
            <label>
              Senha
              <input value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Sua senha" type="password" autoComplete="current-password" />
            </label>
            <button type="submit" disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />} Entrar</button>
            <button type="button" className="ghost" onClick={() => switchMode('reset')} disabled={sending}>Esqueci minha senha</button>
          </form>
        )}

        {mode === 'signup' && step === 'form' && (
          <form className="stack clientAuthForm" onSubmit={signup}>
            <div className="inlineFields">
              <label>Nome<input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="Seu nome" autoComplete="given-name" /></label>
              <label>Sobrenome<input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Seu sobrenome" autoComplete="family-name" /></label>
            </div>
            <label>E-mail<input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="voce@email.com" type="email" autoComplete="email" /></label>
            <label>Senha<input value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 8 caracteres" type="password" autoComplete="new-password" /></label>
            <PasswordStrength password={form.password} />
            <label>Repetir senha<input value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Digite a senha de novo" type="password" autoComplete="new-password" /></label>
            <label>Cupom/link de indicação {initialRef ? '(fixado pelo link)' : '(opcional)'}<input value={form.referralCode} onChange={(e) => !initialRef && update('referralCode', normalizeReferralCode(e.target.value))} placeholder="Ex: MATHEUS123" readOnly={Boolean(initialRef)} className={initialRef ? 'lockedInput' : ''} /></label>
            <label className="checkLine"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} /> Aceito os <a href={`${API_BASE}/terms`} target="_blank" rel="noreferrer">Termos de Uso</a>.</label>
            <label className="checkLine"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => update('privacyAccepted', e.target.checked)} /> Aceito a <a href={`${API_BASE}/privacy`} target="_blank" rel="noreferrer">Política de Privacidade</a>.</label>
            <button type="submit" disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />} Enviar código e criar conta</button>
            <p className="legalSmall">A conta só será criada depois que você confirmar o código enviado por e-mail.</p>
          </form>
        )}

        {mode === 'signup' && step === 'code' && (
          <form className="stack clientAuthForm" onSubmit={verifySignup}>
            <div className="codeNotice">Enviamos um código para {form.email}.</div>
            <label>Código de confirmação<input value={form.code} onChange={(e) => update('code', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" className="codeInput" /></label>
            <button type="submit" disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />} Confirmar cadastro e entrar</button>
            <button type="button" className="ghost" onClick={() => setStep('form')} disabled={sending}>Voltar</button>
          </form>
        )}

        {mode === 'reset' && step === 'form' && (
          <form className="stack clientAuthForm" onSubmit={requestResetCode}>
            <label>E-mail cadastrado<input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="voce@email.com" type="email" autoComplete="email" /></label>
            <button type="submit" disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />} Enviar código para trocar senha</button>
            <button type="button" className="ghost" onClick={() => switchMode('login')} disabled={sending}>Voltar para login</button>
          </form>
        )}

        {mode === 'reset' && step === 'code' && (
          <form className="stack clientAuthForm" onSubmit={resetPassword}>
            <div className="codeNotice">Enviamos um código para {form.email}.</div>
            <label>Código de confirmação<input value={form.code} onChange={(e) => update('code', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" className="codeInput" /></label>
            <label>Nova senha<input value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 8 caracteres" type="password" autoComplete="new-password" /></label>
            <PasswordStrength password={form.password} />
            <label>Confirmar nova senha<input value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repita a senha" type="password" autoComplete="new-password" /></label>
            <button type="submit" disabled={sending}>{sending ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />} Trocar senha e entrar</button>
            <button type="button" className="ghost" onClick={() => setStep('form')} disabled={sending}>Voltar</button>
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
  }, [user?.id, user?.first_name, user?.last_name]);

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
        <label>Nome<input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
        <label>Sobrenome<input value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
        <label className="wide">E-mail<input value={user?.email || ''} readOnly /></label>
        <button type="submit" disabled={loading}><Save size={18} /> Salvar dados da conta</button>
      </form>
      <div className="legalCards">
        <a href={`${API_BASE}/terms`} target="_blank" rel="noreferrer">Termos de Uso</a>
        <a href={`${API_BASE}/privacy`} target="_blank" rel="noreferrer">Política de Privacidade</a>
        <a href={`${API_BASE}/data-deletion`} target="_blank" rel="noreferrer">Exclusão de Dados</a>
      </div>
      <div className="deletionBox">
        <h3>Solicitar exclusão de dados</h3>
        <p>Use esta opção para registrar uma solicitação formal de exclusão de conta e dados conectados.</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional: explique o motivo ou o dado que deseja remover." />
        <button type="button" className="dangerText" onClick={requestDeletion} disabled={loading}><Trash2 size={18} /> Solicitar exclusão</button>
      </div>
    </section>
  );
}

function BillingPanel({ billing, plans, loading, onChoosePlan }) {
  const subscription = billing?.subscription || { planId: 'free', planName: 'Grátis', status: 'free' };

  return (
    <section className="panel billingPanel" id="planos">
      <div className="panelHeader">
        <div>
          <h2><CreditCard size={20} /> Planos e pagamento</h2>
          <p>Escolha o plano ideal. O Pro é o melhor equilíbrio para vender mais sem começar caro.</p>
        </div>
        <div className="currentPlanBadge">Plano atual: <strong>{subscription.planName || subscription.planId}</strong></div>
      </div>
      <div className="pricingGrid">
        {plans.map((plan) => (
          <article className={plan.highlighted ? 'priceCard featured' : 'priceCard'} key={plan.id}>
            {plan.highlighted && <span className="bestBadge">Mais escolhido</span>}
            <h3>{plan.name}</h3>
            <strong>{plan.priceLabel}</strong>
            <small>Afiliado ganha {plan.affiliateCommissionLabel}</small>
            {plan.affiliateDiscountPercent > 0 && <small className="discountLine">Cupom de indicação dá {plan.affiliateDiscountPercent}% de desconto.</small>}
            <ul>
              {plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}
            </ul>
            <button type="button" disabled={loading} onClick={() => onChoosePlan(plan)}><CreditCard size={18} /> Assinar {plan.name}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CheckoutModal({ plan, loading, onClose, onConfirm, affiliate }) {
  const lockedReferralCode = normalizeReferralCode(
    affiliate?.usedReferralCode || new URLSearchParams(window.location.search).get('ref') || ''
  );
  const [referralCode, setReferralCode] = useState(lockedReferralCode);
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const isReferralLocked = Boolean(lockedReferralCode);

  async function requestReferralPreview(code) {
    const cleanCode = normalizeReferralCode(code);
    if (!cleanCode || !plan?.id) {
      setPreview(null);
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/referral-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId: plan.id, referralCode: cleanCode })
      });
      const data = await parseJsonResponse(res);
      setPreview(data);
    } catch (error) {
      setPreview({ validReferral: false, error: error.message });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    setReferralCode(lockedReferralCode);
    setPreview(null);
    if (lockedReferralCode && plan?.id) {
      requestReferralPreview(lockedReferralCode);
    }
  }, [plan?.id, lockedReferralCode]);

  if (!plan) return null;

  const discountPercent = Number(preview?.pricing?.discountPercent ?? (referralCode ? plan.affiliateDiscountPercent : 0) ?? 0);
  const finalLabel = preview?.pricing?.finalLabel || preview?.pricing?.amountLabel || (referralCode && plan.couponPriceLabel ? plan.couponPriceLabel : plan.priceLabel);
  const originalLabel = preview?.pricing?.originalPriceLabel || preview?.pricing?.originalLabel || plan.priceLabel;
  const hasDiscount = Boolean((preview?.validReferral || referralCode) && discountPercent > 0);

  async function validateCoupon() {
    await requestReferralPreview(referralCode);
  }

  return (
    <div className="checkoutOverlay" role="dialog" aria-modal="true">
      <section className="checkoutSheet glassCard">
        <button type="button" className="checkoutClose" onClick={onClose} disabled={loading} aria-label="Fechar checkout"><X size={18} /></button>
        <div className="checkoutHeader centeredCheckoutHeader">
          <span className="eyebrow"><ShieldCheck size={14} /> Checkout Mercado Pago</span>
          <h2>Plano {plan.name}</h2>
          <p>Você confirma o plano aqui e finaliza no Checkout Pro do Mercado Pago. Pix, cartão, boleto e outros métodos disponíveis aparecem lá.</p>
        </div>

        <div className="checkoutGrid checkoutGridClean">
          <article className="checkoutSummary checkoutSummaryHighlight">
            {plan.highlighted && <span className="bestBadge">Mais escolhido</span>}
            <h3>{plan.name}</h3>
            {hasDiscount ? <small className="oldPrice">De {originalLabel}</small> : null}
            <strong>{finalLabel}</strong>
            <small>Pagamento mensal. Cada pagamento aprovado libera o acesso por 31 dias.</small>
            <ul>
              {plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}
            </ul>
            <div className="affiliateCheckoutNote"><Gift size={17} /> <span>Afiliado recebe {plan.affiliateCommissionLabel} após o prazo de segurança.</span></div>
          </article>

          <article className="paymentBox checkoutActionBox">
            <h3>Cupom de indicação</h3>
            <p>{isReferralLocked ? 'Esse cupom ficou vinculado a esta conta e não pode ser trocado.' : 'Digite um cupom somente se você recebeu um link de indicação.'}</p>
            <div className="couponInline">
              <input
                value={referralCode}
                onChange={(e) => !isReferralLocked && setReferralCode(normalizeReferralCode(e.target.value))}
                placeholder="Ex: MATHEUS123"
                readOnly={isReferralLocked}
                className={isReferralLocked ? 'lockedInput' : ''}
              />
              {!isReferralLocked && (
                <button type="button" className="ghost" onClick={validateCoupon} disabled={loading || checking || !referralCode.trim()}>
                  {checking ? <Loader2 className="spin" size={16} /> : <Gift size={16} />} Validar
                </button>
              )}
            </div>
            {isReferralLocked && <div className="couponStatus success"><ShieldCheck size={16} /> Cupom fixo desta conta: {referralCode}.</div>}
            {preview?.validReferral && !isReferralLocked && <div className="couponStatus success"><CheckCircle2 size={16} /> Cupom válido {preview.affiliateName ? `de ${preview.affiliateName}` : ''}.</div>}
            {preview && !preview.validReferral && <div className="couponStatus error"><XCircle size={16} /> {preview.error || 'Cupom inválido ou não permitido para esta conta.'}</div>}

            <div className="checkoutSecurity"><ShieldCheck size={18} /> <span>A Go Viral não salva dados de cartão. O Mercado Pago processa Pix, cartão e os métodos disponíveis no checkout.</span></div>
            <button type="button" className="primaryAction checkoutPayButton" disabled={loading || checking} onClick={() => onConfirm(plan.id, 'mercado_pago', referralCode)}>
              {loading ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />} Continuar para Mercado Pago
            </button>
            <button type="button" className="ghost wide" disabled={loading} onClick={onClose}>Voltar aos planos</button>
          </article>
        </div>
      </section>
    </div>
  );
}

function AffiliatePanel({ affiliate, loading, apiFetch, onRefresh }) {
  const [pixKey, setPixKey] = useState(affiliate?.pixKey || '');

  useEffect(() => {
    setPixKey(affiliate?.pixKey || '');
  }, [affiliate?.pixKey]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(affiliate?.referralLink || '');
      alert('Link copiado.');
    } catch {
      alert(affiliate?.referralLink || 'Link indisponível.');
    }
  }

  async function savePix() {
    try {
      await apiFetch('/api/affiliate/pix', {
        method: 'PATCH',
        body: JSON.stringify({ pixKey })
      });
      await onRefresh();
      alert('Pix salvo.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function requestPayout() {
    try {
      await apiFetch('/api/affiliate/payout-request', {
        method: 'POST',
        body: JSON.stringify({ pixKey })
      });
      await onRefresh();
      alert('Solicitação de saque registrada.');
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <section className="panel affiliatePanel" id="afiliados">
      <div className="panelHeader">
        <div>
          <h2><Gift size={20} /> Afiliados e indicação</h2>
          <p>Divulgue seu link, indique clientes e acumule comissão para sacar via Pix. O saldo fica pendente durante o prazo de segurança contra reembolso.</p>
        </div>
      </div>
      <div className="affiliateStats">
        <div><small>Saldo pendente</small><strong>{affiliate?.pendingLabel || 'R$ 0,00'}</strong></div>
        <div><small>Saldo liberado</small><strong>{affiliate?.availableLabel || 'R$ 0,00'}</strong></div>
        <div><small>Em saque</small><strong>{affiliate?.requestedLabel || 'R$ 0,00'}</strong></div>
        <div><small>Total recebido</small><strong>{affiliate?.paidLabel || 'R$ 0,00'}</strong></div>
      </div>
      <div className="formGrid">
        <label>Seu cupom/código fixo<input value={affiliate?.referralCode || ''} readOnly className="lockedInput" /></label>
        <div className="couponFixedNotice"><ShieldCheck size={17} /> Esse cupom é criado automaticamente e não pode ser trocado.</div>
        <label className="wide">Seu link de indicação<input value={affiliate?.referralLink || ''} readOnly /></label>
        <button type="button" className="wide ghost" onClick={copyLink} disabled={!affiliate?.referralLink}><Copy size={18} /> Copiar link de indicação</button>
        <label className="wide">Chave Pix para saque<input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" /></label>
        <button type="button" onClick={savePix} disabled={loading}><Save size={18} /> Salvar Pix</button>
        <button type="button" className="primaryAction" onClick={requestPayout} disabled={loading}><DollarSign size={18} /> Solicitar saque</button>
        <div className="wide affiliateHelp"><ShieldCheck size={17} /> Comissão fica pendente por {affiliate?.holdDays || 7} dias para cobrir reembolso/disputa. Saque mínimo: {affiliate?.minPayoutLabel || 'R$ 50,00'}.</div>
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
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [affiliate, setAffiliate] = useState(null);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [form, setForm] = useState(createFormFromTemplate());
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState(getInitialAppView);

  const selectedTemplate = useMemo(
    () => triggerTemplates.find((template) => template.id === form.triggerType) || triggerTemplates[0],
    [form.triggerType]
  );
  const mainAccount = accounts[0] || null;
  const activeRules = rules.filter((rule) => rule.active !== 0 && rule.active !== false);

  function goToView(viewId) {
    const view = APP_VIEWS.find((item) => item.id === viewId) || APP_VIEWS[0];
    setActiveView(view.id);
    setMenuOpen(false);
    window.history.replaceState({}, '', `${window.location.pathname}#${view.hash}`);
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
    return parseJsonResponse(res);
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
      const [rulesData, accountsData, logsData, billingData] = await Promise.all([
        apiFetch('/api/rules'),
        apiFetch('/api/accounts'),
        apiFetch('/api/logs'),
        apiFetch('/api/billing/status')
      ]);
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setBilling(billingData || null);
      setPlans(Array.isArray(billingData?.plans) ? billingData.plans : []);
      setAffiliate(billingData?.affiliate || null);
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
    return cleanFlowOptions(options);
  }

  async function saveRule() {
    const selectedPublicationMode = form.publicationMode || 'all';
    const selectedPublicationUrl = String(form.publicationUrl || '').trim();
    const normalizedOptions = cleanOptions(form.options);
    const messageProblem = automationTextProblem(form.message, 'Mensagem inicial');
    const isWelcomeTrigger = form.triggerType === 'welcome_contact';
    const keyword = isWelcomeTrigger ? normalizeKeyword(form.keyword || 'boas vindas') : normalizeKeyword(form.keyword);

    if (!normalizedOptions.length) {
      alert('Adicione pelo menos um botão com mensagem, link ou próximas opções.');
      return;
    }

    if (!keyword && !isWelcomeTrigger) {
      alert('Digite a palavra-chave da automação.');
      return;
    }
    if (messageProblem) {
      alert(messageProblem);
      return;
    }
    const optionsProblem = validateOptionsTree(normalizedOptions);
    if (optionsProblem) {
      alert(optionsProblem);
      return;
    }
    if (!isWelcomeTrigger && selectedPublicationMode === 'single' && !selectedPublicationUrl) {
      alert('Cole o link da publicação antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        triggerType: form.triggerType,
        title: form.title,
        strategy: form.strategy,
        keyword,
        message: String(form.message || '').trim(),
        linkLabel: form.linkLabel,
        linkUrl: form.linkUrl,
        publicationMode: isWelcomeTrigger ? 'all' : selectedPublicationMode,
        publicationUrl: isWelcomeTrigger ? '' : selectedPublicationUrl,
        active: form.active,
        options: normalizedOptions
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
      alert('Automação salva.');
      goToView('ativas');
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
      options: Array.isArray(rule.options) && rule.options.length
        ? rule.options.slice(0, MAX_OPTIONS).map((option, index) => prepareOptionForForm(option, index))
        : [defaultOption(0)]
    });
    goToView('automacao');
  }

  async function deleteRule(id) {
    if (!confirm('Excluir esta automação?')) return;
    setLoading(true);
    try {
      await apiFetch(`/api/rules/${id}`, { method: 'DELETE' });
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

    const ok = confirm(`Desconectar @${mainAccount.username}?\n\nIsso vai remover a conta, as automações e os registros dessa conta.`);
    if (!ok) return;

    setLoading(true);
    try {
      await apiFetch(`/api/accounts/${mainAccount.id}`, { method: 'DELETE' });
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
      await apiFetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
      alert('Registro de atividades apagado.');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function choosePlan(plan) {
    setCheckoutPlan(plan);
  }

  async function confirmCheckout(planId, paymentMethod, referralCode = '') {
    setLoading(true);
    try {
      const data = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          paymentMethod,
          referralCode: referralCode || new URLSearchParams(window.location.search).get('ref') || ''
        })
      });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      alert('Checkout criado, mas o link não veio do Mercado Pago.');
    } catch (error) {
      alert(error.message);
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
    setBilling(null);
    setPlans([]);
    setAffiliate(null);
    setCheckoutPlan(null);
  }

  function pickTrigger(template) {
    setEditingRuleId(null);
    setForm(createFormFromTemplate(template));
  }

  function updateOption(path, field, value) {
    setForm((prev) => ({
      ...prev,
      options: updateOptionTree(prev.options, path, (option) => ({ ...option, [field]: value }))
    }));
  }

  function updateOptionAction(path, value) {
    setForm((prev) => ({
      ...prev,
      options: updateOptionTree(prev.options, path, (option) => {
        if (value === 'link') return { ...option, actionType: value, response: '', options: [] };
        if (value === 'response') return { ...option, actionType: value, linkUrl: '', options: [] };
        if (value === 'both') return { ...option, actionType: value, options: [] };
        if (value === 'flow') {
          const children = Array.isArray(option.options) && option.options.length ? option.options : [defaultOption(0)];
          return { ...option, actionType: value, linkUrl: '', options: children };
        }
        return { ...option, actionType: value };
      })
    }));
  }

  function addOption() {
    setForm((prev) => {
      if (prev.options.length >= MAX_OPTIONS) return prev;
      return { ...prev, options: [...prev.options, defaultOption(prev.options.length)] };
    });
  }

  function addChildOption(path) {
    setForm((prev) => ({
      ...prev,
      options: addChildOptionToTree(prev.options, path)
    }));
  }

  function removeOption(path) {
    setForm((prev) => {
      const indexes = pathArray(path);
      if (indexes.length === 1 && prev.options.length <= 1) return prev;
      return { ...prev, options: removeOptionFromTree(prev.options, indexes) };
    });
  }

  function cancelEdit() {
    setEditingRuleId(null);
    setForm(createFormFromTemplate(selectedTemplate));
  }

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  useEffect(() => {
    if (cameFromInstagram && user) {
      loadData();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [cameFromInstagram, user?.id]);


  function renderOptionEditor(option, path, depth = 0) {
    const actionType = optionActionType(option);
    const showResponse = actionType === 'response' || actionType === 'both' || actionType === 'flow';
    const showLink = actionType === 'link' || actionType === 'both';
    const children = Array.isArray(option.options) ? option.options : [];
    const index = path[path.length - 1];
    const canAddChild = children.length < MAX_OPTIONS && depth + 1 < MAX_FLOW_DEPTH;
    const canRemove = !(path.length === 1 && form.options.length <= 1);
    const title = depth === 0 ? `Botão ${index + 1}` : `Opção ${index + 1} da próxima etapa`;

    return (
      <div className={depth === 0 ? 'cleanOptionCard compactOptionCard' : 'cleanOptionCard compactOptionCard nestedOptionCard'} key={`option-${path.join('-')}`}>
        <div className="cleanOptionHeader">
          <strong>{title}</strong>
          <button type="button" className="iconGhost" onClick={() => removeOption(path)} disabled={!canRemove}><Trash2 size={15} /></button>
        </div>

        <label>Nome do botão<input placeholder="Ex: Quero o link" value={option.label} onChange={(e) => updateOption(path, 'label', e.target.value)} maxLength={20} /></label>

        <div className="actionChoiceBlock">
          <strong>Depois do clique</strong>
          <div className="actionChoiceRow">
            <button type="button" className={actionType === 'response' ? 'actionChoice active' : 'actionChoice'} onClick={() => updateOptionAction(path, 'response')}>Mensagem</button>
            <button type="button" className={actionType === 'link' ? 'actionChoice active' : 'actionChoice'} onClick={() => updateOptionAction(path, 'link')}>Link</button>
            <button type="button" className={actionType === 'both' ? 'actionChoice active' : 'actionChoice'} onClick={() => updateOptionAction(path, 'both')}>Os dois</button>
            <button type="button" className={actionType === 'flow' ? 'actionChoice active' : 'actionChoice'} onClick={() => updateOptionAction(path, 'flow')}>Próximas opções</button>
          </div>
        </div>

        {showResponse && (
          <label>{actionType === 'flow' ? 'Mensagem antes dos próximos botões' : 'Mensagem que vai enviar'}<textarea placeholder="Ex: Perfeito! Escolha o próximo passo." value={option.response} onChange={(e) => updateOption(path, 'response', e.target.value)} /></label>
        )}

        {showLink && (
          <div className="optionLinkGrid">
            <label>Nome do link<input placeholder="Ex: Acessar agora" value={option.linkLabel || ''} onChange={(e) => updateOption(path, 'linkLabel', e.target.value)} /></label>
            <label>Link<input placeholder="https://..." value={option.linkUrl || ''} onChange={(e) => updateOption(path, 'linkUrl', e.target.value)} /></label>
          </div>
        )}

        {actionType === 'flow' && (
          <div className="nestedOptionsBlock">
            <div className="optionSummary nestedSummary">
              <strong>Próximos botões</strong>
              <small>{children.length}/{MAX_OPTIONS}</small>
            </div>
            {children.map((child, childIndex) => renderOptionEditor(child, [...path, childIndex], depth + 1))}
            <button type="button" className="wide ghost addButtonSimple" onClick={() => addChildOption(path)} disabled={!canAddChild}><Plus size={18} /> Adicionar opção da próxima etapa</button>
            {!canAddChild && <small className="buttonLimitNote">Limite desta etapa atingido.</small>}
          </div>
        )}
      </div>
    );
  }

  if (checkingSession) {
    return (
      <main className="loginPage">
        <section className="loginCard glassCard">
          <div className="loginBrandBlock">
            <img src="/logo.png" alt="Instagram Go Viral" className="logo" />
            <h1>Go Viral</h1>
            <p>Carregando sessão segura...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return (
    <main className="appShell">
      <section className="siteFrame">
        <header className="siteHeader">
          <div className="brandTop">
            <img src="/logo.png" alt="Instagram Go Viral" className="brandLogoSmall" />
            <div className="brandText">
              <h1>Go Viral</h1>
              <p>Automação para Instagram</p>
            </div>
          </div>
          <button type="button" className="menuToggle" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />} Menu
          </button>
        </header>

        {menuOpen && (
          <nav className="topMenu">
            {APP_VIEWS.map((view) => {
              const Icon = view.icon;
              return (
                <button key={view.id} type="button" className={activeView === view.id ? 'menuItem active' : 'menuItem'} onClick={() => goToView(view.id)}>
                  <Icon size={15} /> {view.label}
                </button>
              );
            })}
            <button type="button" className="menuItem" onClick={loadData} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} Sincronizar dados</button>
            <button type="button" className="menuItem logoutMenu" onClick={logout}><LogOut size={15} /> Sair</button>
          </nav>
        )}

        <section className="profileHero" id="conta">
          <InstagramAvatar account={mainAccount} />
          <div className="profileInfo">
            <span className="label"><Camera size={14} /> Perfil conectado</span>
            <h2>{mainAccount ? `@${mainAccount.username}` : 'Nenhuma conta conectada'}</h2>
            <p>
              {mainAccount
                ? mainAccount.biography || `Conectada em ${formatDate(mainAccount.connected_at)}`
                : 'Conecte o Instagram antes de ativar suas automações.'}
            </p>
            {mainAccount?.connected_at && <p className="profileDate">Conectada em {formatDate(mainAccount.connected_at)}</p>}
          </div>
          <div className="profileActions">
            <div className="statusBadge"><ShieldCheck size={16} /> {mainAccount ? 'Ativo' : 'Pendente'}</div>
            <button type="button" className="instagramConnectButton" onClick={connectInstagram} disabled={loading}>
              <Camera size={18} /> {mainAccount ? 'Trocar Instagram' : 'Conectar Instagram'}
            </button>
            {mainAccount && (
              <button type="button" className="dangerText" onClick={disconnectInstagram} disabled={loading}>
                <Trash2 size={18} /> Desconectar
              </button>
            )}
          </div>
        </section>

        {activeView === 'automacao' && <div className="grid cards twoCards">
          <div className="metricCard"><Bot /><strong>{activeRules.length}</strong><span>Automações ativas</span></div>
          <div className="metricCard"><MessageCircle /><strong>{logs.length}</strong><span>Chamadas registradas</span></div>
        </div>}

        <section className="mentalPanel tabPanel" id="caminho" hidden={activeView !== 'automacao'}>
          <div className="panelHeader">
            <div>
              <h2><Wand2 size={20} /> Montar automação</h2>
              <p>{editingRuleId ? 'Editando automação existente.' : 'Escolha quando começa, escreva a mensagem e adicione os botões.'}</p>
            </div>
            {editingRuleId && (
              <button type="button" className="small ghost" onClick={cancelEdit} disabled={loading}><X size={16} /> Cancelar edição</button>
            )}
          </div>

          <div className="pathGrid cleanPathGrid">
            <div className="pathColumn">
              <span className="stepNumber">1</span>
              <h3>Quando começa?</h3>
              <div className="templateList">
                {triggerTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button type="button" key={template.id} className={form.triggerType === template.id ? 'templateCard active' : 'templateCard'} onClick={() => pickTrigger(template)}>
                      <Icon size={18} />
                      <strong>{template.title}</strong>
                      <small>{template.description}</small>
                    </button>
                  );
                })}
              </div>

              <div className="simpleFields">
                <label>Nome do fluxo<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                {form.triggerType !== 'welcome_contact' ? (
                  <label>Palavra-chave<input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} /></label>
                ) : (
                  <div className="welcomeInfo"><Sparkles size={18} /><span>Boas-vindas só dispara quando a pessoa já interagir com comentário ou direct.</span></div>
                )}
              </div>
            </div>

            <div className="pathColumn builderColumn">
              <span className="stepNumber">2</span>
              <h3>Mensagem e botões</h3>

              {form.triggerType !== 'welcome_contact' && (
                <div className="miniScopeBox">
                  <strong>Onde essa automação funciona?</strong>
                  <div className="automationScopeChoices compactChoices">
                    <button type="button" className={(form.publicationMode || 'all') === 'all' ? 'scopeChoice active' : 'scopeChoice'} onClick={() => setForm({ ...form, publicationMode: 'all', publicationUrl: '' })}>
                      <CheckCircle2 size={16} />
                      <span><strong>Todas</strong><small>Funciona em qualquer publicação.</small></span>
                    </button>
                    <button type="button" className={form.publicationMode === 'single' ? 'scopeChoice active' : 'scopeChoice'} onClick={() => setForm({ ...form, publicationMode: 'single' })}>
                      <LinkIcon size={16} />
                      <span><strong>Uma só</strong><small>Funciona só no post escolhido.</small></span>
                    </button>
                  </div>
                  {form.publicationMode === 'single' && (
                    <label>Link da publicação<input placeholder="https://www.instagram.com/p/..." value={form.publicationUrl} onChange={(e) => setForm({ ...form, publicationUrl: e.target.value })} /></label>
                  )}
                </div>
              )}

              <label className="messageBox">Mensagem que a pessoa recebe<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>

              <div className="optionSummary">
                <strong>Botões</strong>
                <small>{form.options.length}/{MAX_OPTIONS} no modelo bonito</small>
              </div>

              <div className="cleanOptionsList">
                {form.options.map((option, index) => renderOptionEditor(option, [index], 0))}
              </div>

              <button type="button" className="wide ghost addButtonSimple" onClick={addOption} disabled={form.options.length >= MAX_OPTIONS}><Plus size={18} /> Adicionar botão</button>
              {form.options.length >= MAX_OPTIONS && <small className="buttonLimitNote">Esse formato do Instagram mostra no máximo 3 botões bonitos na mesma mensagem.</small>}
            </div>

            <div className="pathColumn previewColumn stickyPreview">
              <span className="stepNumber">3</span>
              <h3>Como vai aparecer</h3>
              <div className="phonePreview">
                <div className="phoneHeader">
                  <InstagramAvatar account={mainAccount} compact />
                  <strong>{mainAccount ? mainAccount.username : 'go.viral'}</strong>
                </div>
                <div className="bubble botBubble">
                  <p>{form.message}</p>
                  {form.options.map((option, index) => (
                    <button type="button" key={`${option.label}-${index}`}>{option.label || `Botão ${index + 1}`}</button>
                  ))}
                </div>
                <div className="bubble userBubble">{form.options[0]?.label || 'Saber mais'}</div>
                <div className="bubble botBubble smallBubble">
                  <p>{form.options[0]?.response || (form.options[0]?.linkUrl ? 'Toque no botão abaixo para acessar.' : 'Aqui aparece a resposta desse botão.')}</p>
                  {form.options[0]?.linkUrl && <button type="button">{form.options[0]?.linkLabel || 'Acessar agora'}</button>}
                  {Array.isArray(form.options[0]?.options) && form.options[0].options.map((child, childIndex) => (
                    <button type="button" key={`preview-child-${childIndex}`}>{child.label || `Opção ${childIndex + 1}`}</button>
                  ))}
                </div>
              </div>

              <div className="finalSaveArea simpleSaveArea">
                <button type="button" className="primaryAction" onClick={saveRule} disabled={loading}>
                  {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                  {editingRuleId ? 'Salvar alterações' : 'Salvar automação'}
                </button>
                <small>Revise a prévia antes de salvar.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="panel tabPanel" id="ativas" hidden={activeView !== 'ativas'}>
          <h2><PlugZap size={20} /> Automações ativas</h2>
          <div className="rulesList">
            {rules.map((rule) => (
              <div className="rule" key={rule.id}>
                <div>
                  <strong>{rule.title || rule.keyword}</strong>
                  <p>{rule.message}</p>
                  {rule.strategy && <p>{rule.strategy}</p>}
                  <span><ArrowRight size={14} /> {rule.options?.length || 0} opções configuradas</span>
                  <span><Sparkles size={14} /> {statusTriggerLabel(rule.triggerType || rule.trigger_type)}</span>
                  <span className="ruleScope"><MessageCircle size={14} /> {(rule.publicationMode || rule.publication_mode) === 'single' ? `Somente uma publicação${(rule.publicationUrl || rule.publication_url) ? `: ${rule.publicationUrl || rule.publication_url}` : ''}` : 'Todas as publicações'}</span>
                  {rule.link_url && <span><LinkIcon size={14} /> {rule.link_label || 'Acessar aqui'}: {rule.link_url}</span>}
                </div>
                <div className="ruleActions">
                  <button type="button" className="ghost iconAction" onClick={() => editRule(rule)} title="Editar automação"><Edit3 size={16} /></button>
                  <button type="button" className="danger" onClick={() => deleteRule(rule.id)} title="Excluir automação"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {!rules.length && <p className="empty">Nenhuma automação criada ainda.</p>}
          </div>
        </section>

        <section className="panel tabPanel" id="logs" hidden={activeView !== 'logs'}>
          <div className="panelHeader">
            <div>
              <h2><Activity size={20} /> Registro de atividades</h2>
              <p>Veja as DMs enviadas e erros de envio desta conta.</p>
            </div>
            <button type="button" className="small ghost" onClick={clearLogs} disabled={loading || !logs.length}><Trash2 size={16} /> Apagar registros</button>
          </div>
          <div className="logsList">
            {logs.slice(0, 12).map((log) => (
              <div className={`logItem ${log.status || ''}`} key={log.id}>
                <div className="logStatus">{statusIcon(log.status)} {statusLabel(log.status)}</div>
                <p>{log.comment_text || 'Sem texto'}</p>
                {log.matched_keyword && <span>Gatilho: {log.matched_keyword}</span>}
                {log.error && <span>Erro: {log.error}</span>}
              </div>
            ))}
            {!logs.length && <p className="empty">Nenhum evento registrado ainda.</p>}
          </div>
        </section>

        {activeView === 'planos' && <BillingPanel billing={billing} plans={plans} loading={loading} onChoosePlan={choosePlan} />}
        {activeView === 'afiliados' && <AffiliatePanel affiliate={affiliate} loading={loading} apiFetch={apiFetch} onRefresh={loadData} />}
        {activeView === 'configuracoes' && <AccountSettings user={user} loading={loading} apiFetch={apiFetch} onUserUpdated={setUser} />}
        <CheckoutModal plan={checkoutPlan} loading={loading} onClose={() => setCheckoutPlan(null)} onConfirm={confirmCheckout} affiliate={affiliate} />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
