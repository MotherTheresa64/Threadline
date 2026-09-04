import {useState} from 'react';
import {KeyRound, LogIn, Mail, UserPlus, X} from 'lucide-react';
import {authErrorMessage, registerEmail, resetPassword, signInEmail, signInGoogle} from '../firebase';
import {Modal} from './Modal';

type Mode = 'signin' | 'register' | 'reset';

export function AuthDialog({onClose, onMessage}: {onClose: () => void; onMessage: (message: string) => void}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        await registerEmail(name, email, password);
        onMessage('Account created. Welcome to Threadline.');
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email);
        onMessage('Password reset email sent if the account exists.');
        setMode('signin');
      } else {
        await signInEmail(email, password);
        onClose();
      }
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError('');
    try {
      await signInGoogle();
      onClose();
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return <Modal titleId="auth-title" onClose={onClose} className="composer auth-dialog">
    <button type="button" className="close" onClick={onClose} aria-label="Close authentication"><X /></button>
    <span className="compose-icon">{mode === 'register' ? <UserPlus /> : mode === 'reset' ? <KeyRound /> : <LogIn />}</span>
    <h2 id="auth-title">{mode === 'register' ? 'Create your Threadline account' : mode === 'reset' ? 'Reset your password' : 'Sign in to collaborate'}</h2>
    <p>{mode === 'reset' ? 'We’ll send a Firebase password-reset link to the account email.' : 'Shared workspaces use Firebase Authentication and Firestore. Demo mode remains separate and browser-local.'}</p>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="auth-form">
      {mode === 'register' && <label>Name<input autoComplete="name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required /></label>}
      <label>Email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required /></label>
      {mode !== 'reset' && <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} minLength={mode === 'register' ? 8 : 6} maxLength={256} required /></label>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="publish" disabled={busy}>{mode === 'register' ? <UserPlus /> : mode === 'reset' ? <Mail /> : <LogIn />}{busy ? 'Working…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'}</button>
    </form>
    {mode !== 'reset' && <><div className="auth-divider"><span>or</span></div><button type="button" className="wide-secondary auth-google" onClick={() => void google()} disabled={busy}>Continue with Google</button></>}
    <div className="auth-links">
      {mode === 'signin' && <><button type="button" onClick={() => { setMode('register'); setError(''); }}>Create an account</button><button type="button" onClick={() => { setMode('reset'); setError(''); setPassword(''); }}>Forgot password?</button></>}
      {mode !== 'signin' && <button type="button" onClick={() => { setMode('signin'); setError(''); }}>Back to sign in</button>}
    </div>
  </Modal>;
}
