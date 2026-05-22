import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  DollarSign,
  Copy,
  Gift,
  CreditCard,
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
          <span key={bar} className={bar <= Math.min(strength.score, 4) ? 'filled' : ''} />
        ))}
      </div>
      <small>{strength.label}</small>
    </div>
  );
}

function AppUiStyles() {
  return (
    <style>{`
      .centeredHeader {
        align-items: center;
        gap: 18px;
      }

      .brandTop {
        align-items: center;
      }

      .brandLogoSmall {
        width: 86px !important;
        height: 86px !important;
        object-fit: contain;
      }

      .brandTop h1 {
        font-size: clamp(2.35rem, 7vw, 3.5rem) !important;
        line-height: 0.92;
        letter-spacing: -0.06em;
      }

      .brandTop p {
        font-size: 1rem;
      }

      .compactConnectionPanel {
        margin-top: 14px;
      }

      .connectionStatusBox {
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 14px;
        border: 1px solid rgba(255, 71, 87, 0.16);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.72);
        margin: 12px 0 14px;
      }

      .connectionStatusBox h3 {
        margin: 0 0 4px;
        font-size: 1rem;
      }

      .connectionStatusBox p {
        margin: 0;
      }

      .connectionActionsSeparated {
        display: grid;
        gap: 10px;
      }

      .connectionActionsSeparated button {
        width: 100%;
        justify-content: center;
      }

      .instagramConnectButton {
        min-height: 46px;
      }

      .instagramDisconnectButton {
        min-height: 44px;
        border: 1px solid rgba(220, 38, 38, 0.22);
        background: rgba(254, 242, 242, 0.85);
      }

      .profileHero {
        margin-top: 14px;
      }

      .automationScopeBox {
        display: grid;
        gap: 12px;
        padding: 14px;
        border-radius: 22px;
        background: rgba(255, 248, 248, 0.75);
        border: 1px solid rgba(255, 71, 87, 0.14);
      }

      .automationScopeHeader {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 800;
      }

      .automationScopeChoices {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .scopeChoice {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        text-align: left;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: #fff;
        border-radius: 18px;
        padding: 12px;
        color: inherit;
      }

      .scopeChoice.active {
        border-color: rgba(255, 71, 87, 0.45);
        box-shadow: 0 10px 24px rgba(255, 71, 87, 0.12);
      }

      .scopeChoice strong {
        display: block;
        margin-bottom: 2px;
      }

      .scopeChoice small {
        display: block;
        opacity: 0.72;
        line-height: 1.35;
      }

      .finalSaveArea {
        display: grid;
        gap: 10px;
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid rgba(15, 23, 42, 0.08);
      }

      .finalSaveArea .primaryAction {
        width: 100%;
        min-height: 50px;
        justify-content: center;
        font-size: 1rem;
      }

      .finalSaveArea small {
        text-align: center;
        color: rgba(15, 23, 42, 0.62);
      }

      .ruleScope {
        margin-top: 6px;
      }
    `}</style>
  );
}

function AuthScreen({ loading, onAuthenticated }) {
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

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || 'Erro na solicitação.');
    return data;
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
      <section className="loginCard glassCard clientLoginCard">
        <img src="/logo.png" alt="Instagram Go Viral" className="logo" />

        <h1>Go Viral</h1>
        <p className="loginSubline">Automação para Instagram</p>
        <p>Painel privado para criar automações que seguram o cliente no direct.</p>

        <div className="authTabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>
            Criar conta
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={login} className="stack clientAuthForm">
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

            <label>
              Senha
              <input
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Sua senha"
                type="password"
                autoComplete="current-password"
              />
            </label>

            <button disabled={sending || loading}>
              {sending ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
              Entrar
            </button>

            <button type="button" className="ghost" onClick={() => switchMode('reset')} disabled={sending}>
              Esqueci minha senha
            </button>
          </form>
        )}

        {mode === 'signup' && step === 'form' && (
          <form onSubmit={signup} className="stack clientAuthForm">
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

            <label>
              Senha
              <input
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                type="password"
                autoComplete="new-password"
              />
              <PasswordStrength password={form.password} />
            </label>

            <label>
              Repetir senha
              <input
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="Digite a senha de novo"
                type="password"
                autoComplete="new-password"
              />
            </label>

            <label>
              Cupom/link de indicação {initialRef ? '(detectado)' : '(opcional)'}
              <input
                value={form.referralCode}
                onChange={(e) => update('referralCode', e.target.value.toUpperCase())}
                placeholder="Ex: MATHEUS123"
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
              Enviar código e criar conta
            </button>

            <small className="legalSmall">
              A conta só será criada depois que você confirmar o código enviado por e-mail.
            </small>
          </form>
        )}

        {mode === 'signup' && step === 'code' && (
          <form onSubmit={verifySignup} className="stack clientAuthForm">
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
              Confirmar cadastro e entrar
            </button>

            <button type="button" className="ghost" onClick={() => setStep('form')} disabled={sending}>
              Voltar
            </button>
          </form>
        )}

        {mode === 'reset' && step === 'form' && (
          <form onSubmit={requestResetCode} className="stack clientAuthForm">
            <label>
              E-mail cadastrado
              <input
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="voce@email.com"
                type="email"
                autoComplete="email"
              />
            </label>

            <button disabled={sending || loading}>
              {sending ? <Loader2 className="spin" size={18} /> : <Mail size={18} />}
              Enviar código para trocar senha
            </button>

            <button type="button" className="ghost" onClick={() => switchMode('login')} disabled={sending}>
              Voltar para login
            </button>
          </form>
        )}

        {mode === 'reset' && step === 'code' && (
          <form onSubmit={resetPassword} className="stack clientAuthForm">
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

            <label>
              Nova senha
              <input
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                type="password"
                autoComplete="new-password"
              />
              <PasswordStrength password={form.password} />
            </label>

            <label>
              Confirmar nova senha
              <input
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="Repita a senha"
                type="password"
                autoComplete="new-password"
              />
            </label>

            <button disabled={sending || form.code.length !== 6}>
              {sending ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
              Trocar senha e entrar
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


function BillingPanel({ billing, plans, loading, onChoosePlan }) {
  const subscription = billing?.subscription || { planId: 'free', planName: 'Grátis', status: 'free' };

  return (
    <section className="panel billingPanel" id="planos">
      <div className="panelHeader">
        <div>
          <h2><CreditCard size={20} /> Planos e assinatura</h2>
          <p>Escolha o plano ideal. O Pro é o melhor equilíbrio para vender mais sem começar caro.</p>
        </div>
        <div className="currentPlanBadge">
          Plano atual: <strong>{subscription.planName || subscription.planId}</strong>
        </div>
      </div>

      <div className="pricingGrid">
        {plans.map((plan) => (
          <article className={plan.highlighted ? 'priceCard featured' : 'priceCard'} key={plan.id}>
            {plan.highlighted && <span className="bestBadge">Mais escolhido</span>}
            <h3>{plan.name}</h3>
            <strong>{plan.priceLabel}</strong>
            <small>Afiliado ganha {plan.affiliateCommissionLabel}</small>
            <ul>
              {plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}
            </ul>
            <button disabled={loading} onClick={() => onChoosePlan(plan)}>
              <CreditCard size={18} /> Assinar {plan.name}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}


function CheckoutModal({ plan, loading, onClose, onConfirm }) {
  const [method, setMethod] = useState('pix');

  if (!plan) return null;

  const methods = [
    { id: 'pix', title: 'Pix', subtitle: 'Liberação rápida depois da confirmação.' },
    { id: 'card', title: 'Cartão de crédito', subtitle: 'Pagamento seguro no ambiente Mercado Pago.' },
    { id: 'boleto', title: 'Boleto', subtitle: 'Disponível conforme análise do Mercado Pago.' }
  ];

  return (
    <div className="checkoutOverlay" role="dialog" aria-modal="true">
      <section className="checkoutSheet glassCard">
        <button className="checkoutClose" onClick={onClose} disabled={loading} aria-label="Fechar checkout">
          <X size={18} />
        </button>

        <div className="checkoutHeader">
          <span className="eyebrow"><ShieldCheck size={14} /> Checkout seguro</span>
          <h2>Finalize seu plano {plan.name}</h2>
          <p>Confira o plano, escolha a forma de pagamento e continue no Mercado Pago para concluir com segurança.</p>
        </div>

        <div className="checkoutGrid">
          <article className="checkoutSummary">
            {plan.highlighted && <span className="bestBadge">Mais escolhido</span>}
            <h3>{plan.name}</h3>
            <strong>{plan.priceLabel}</strong>
            <small>Renovação mensal. Você pode cancelar quando quiser.</small>

            <ul>
              {plan.features.map((feature) => (
                <li key={feature}><CheckCircle2 size={14} /> {feature}</li>
              ))}
            </ul>

            <div className="affiliateCheckoutNote">
              <Gift size={17} />
              <span>Indicação deste plano gera {plan.affiliateCommissionLabel} para o afiliado após confirmação e liberação.</span>
            </div>
          </article>

          <article className="paymentBox">
            <h3>Forma de pagamento</h3>
            <p>As opções finais aparecem no Mercado Pago. Aqui você escolhe a intenção para seguir organizado.</p>

            <div className="paymentMethods">
              {methods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={method === item.id ? 'paymentMethod active' : 'paymentMethod'}
                  onClick={() => setMethod(item.id)}
                >
                  <CreditCard size={18} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="checkoutSecurity">
              <ShieldCheck size={18} />
              <span>Pagamento processado pelo Mercado Pago. A Go Viral não salva dados do cartão.</span>
            </div>

            <button className="primaryAction checkoutPayButton" disabled={loading} onClick={() => onConfirm(plan.id, method)}>
              {loading ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />}
              Continuar para pagamento
            </button>

            <button type="button" className="ghost wide" disabled={loading} onClick={onClose}>
              Voltar aos planos
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

function AffiliatePanel({ affiliate, loading, apiFetch, onRefresh }) {
  const [code, setCode] = useState(affiliate?.referralCode || '');
  const [pixKey, setPixKey] = useState(affiliate?.pixKey || '');

  useEffect(() => {
    setCode(affiliate?.referralCode || '');
    setPixKey(affiliate?.pixKey || '');
  }, [affiliate?.referralCode, affiliate?.pixKey]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(affiliate?.referralLink || '');
      alert('Link copiado.');
    } catch {
      alert(affiliate?.referralLink || 'Link indisponível.');
    }
  }

  async function saveCode() {
    try {
      await apiFetch('/api/affiliate/code', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      await onRefresh();
      alert('Código atualizado.');
    } catch (error) {
      alert(error.message);
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
          <p>Divulgue seu link, indique clientes e acumule comissão para sacar via Pix.</p>
        </div>
      </div>

      <div className="affiliateStats">
        <div><small>Saldo pendente</small><strong>{affiliate?.pendingLabel || 'R$ 0,00'}</strong></div>
        <div><small>Saldo liberado</small><strong>{affiliate?.availableLabel || 'R$ 0,00'}</strong></div>
        <div><small>Total recebido</small><strong>{affiliate?.paidLabel || 'R$ 0,00'}</strong></div>
        <div><small>Indicados</small><strong>{affiliate?.totalReferrals || 0}</strong></div>
      </div>

      <div className="formGrid">
        <label>
          Seu cupom/código
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </label>
        <button type="button" onClick={saveCode} disabled={loading}>
          <Save size={18} /> Salvar cupom
        </button>

        <label className="wide">
          Seu link de indicação
          <input value={affiliate?.referralLink || ''} readOnly />
        </label>
        <button type="button" className="wide ghost" onClick={copyLink} disabled={!affiliate?.referralLink}>
          <Copy size={18} /> Copiar link de indicação
        </button>

        <label className="wide">
          Chave Pix para saque
          <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
        </label>
        <button type="button" onClick={savePix} disabled={loading}>
          <Save size={18} /> Salvar Pix
        </button>
        <button type="button" className="primaryAction" onClick={requestPayout} disabled={loading}>
          <DollarSign size={18} /> Solicitar saque
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
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [affiliate, setAffiliate] = useState(null);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
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
    return (options || [])
      .slice(0, MAX_OPTIONS)
      .map((option) => ({
        label: String(option.label || '').trim(),
        response: String(option.response || '').trim()
      }))
      .filter((option) => option.label && option.response);
  }

  async function saveRule() {
    const selectedPublicationMode = form.publicationMode || 'all';
    const selectedPublicationUrl = String(form.publicationUrl || '').trim();

    if (selectedPublicationMode === 'single' && !selectedPublicationUrl) {
      alert('Cole o link da publicação antes de salvar.');
      return;
    }

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
        publicationMode: selectedPublicationMode,
        publicationUrl: selectedPublicationUrl,
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

  function choosePlan(plan) {
    setCheckoutPlan(plan);
  }

  async function confirmCheckout(planId, paymentMethod) {
    setLoading(true);

    try {
      const data = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          paymentMethod,
          referralCode: new URLSearchParams(window.location.search).get('ref') || ''
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
      <AppUiStyles />

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

          <a className="menuItem" href="#planos">
            <CreditCard size={15} /> Planos
          </a>

          <a className="menuItem" href="#afiliados">
            <Gift size={15} /> Afiliados
          </a>

          <a className="menuItem" href="#configuracoes">
            <Settings size={15} /> Configurações da conta
          </a>

          <button className="menuItem logoutMenu" onClick={logout}>
            <LogOut size={15} /> Sair
          </button>
        </nav>

        <section className="panel connectionPanel compactConnectionPanel" id="conta">
          <h2>
            <Instagram size={20} /> Conexão do Instagram
          </h2>

          <div className="connectionStatusBox">
            <InstagramAvatar account={mainAccount} />

            <div>
              <h3>{mainAccount ? `@${mainAccount.username}` : 'Nenhum Instagram conectado'}</h3>
              <p>
                {mainAccount
                  ? 'Conta conectada e pronta para usar nas automações.'
                  : 'Conecte o Instagram antes de ativar suas automações.'}
              </p>
            </div>
          </div>

          <div className="connectionActionsSeparated">
            <button className="instagramConnectButton primaryAction" onClick={connectInstagram} disabled={loading}>
              <Instagram size={18} />
              {mainAccount ? 'Trocar Instagram conectado' : 'Conectar Instagram'}
            </button>

            {mainAccount && (
              <button className="instagramDisconnectButton dangerText" onClick={disconnectInstagram} disabled={loading}>
                <Trash2 size={18} />
                Desconectar Instagram
              </button>
            )}
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

              <div className="wide automationScopeBox">
                <div className="automationScopeHeader">
                  <MessageCircle size={17} />
                  Publicações que vão ativar esta automação
                </div>

                <div className="automationScopeChoices">
                  <button
                    type="button"
                    className={(form.publicationMode || 'all') === 'all' ? 'scopeChoice active' : 'scopeChoice'}
                    onClick={() => setForm({ ...form, publicationMode: 'all', publicationUrl: '' })}
                  >
                    <CheckCircle2 size={18} />
                    <span>
                      <strong>Todas as publicações</strong>
                      <small>Qualquer publicação com essa palavra-chave pode iniciar a automação.</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={form.publicationMode === 'single' ? 'scopeChoice active' : 'scopeChoice'}
                    onClick={() => setForm({ ...form, publicationMode: 'single' })}
                  >
                    <LinkIcon size={18} />
                    <span>
                      <strong>Somente uma publicação</strong>
                      <small>A automação só funciona na publicação que você escolher.</small>
                    </span>
                  </button>
                </div>

                {form.publicationMode === 'single' && (
                  <label>
                    Link da publicação
                    <input
                      placeholder="https://www.instagram.com/p/..."
                      value={form.publicationUrl}
                      onChange={(e) => setForm({ ...form, publicationUrl: e.target.value })}
                    />
                  </label>
                )}
              </div>

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

              <div className="wide finalSaveArea">
                <button type="button" className="primaryAction" onClick={saveRule} disabled={loading}>
                  {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                  {editingRuleId ? 'Salvar alterações da automação' : 'Salvar automação'}
                </button>

                <small>Revise tudo acima antes de salvar.</small>
              </div>
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

                  <span className="ruleScope">
                    <MessageCircle size={14} /> {(rule.publicationMode || rule.publication_mode) === 'single'
                      ? `Somente uma publicação${(rule.publicationUrl || rule.publication_url) ? `: ${rule.publicationUrl || rule.publication_url}` : ''}`
                      : 'Todas as publicações'}
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

        <BillingPanel
          billing={billing}
          plans={plans}
          loading={loading}
          onChoosePlan={choosePlan}
        />

        <AffiliatePanel
          affiliate={affiliate}
          loading={loading}
          apiFetch={apiFetch}
          onRefresh={loadData}
        />

        <CheckoutModal
          plan={checkoutPlan}
          loading={loading}
          onClose={() => setCheckoutPlan(null)}
          onConfirm={confirmCheckout}
        />

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