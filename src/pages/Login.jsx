import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { BYPASS_AUTH } from '../services/authService'

export default function Login() {
  const { loginWithGoogle, error } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2"  width="10" height="10" rx="2" fill="white"/>
            <rect x="16" y="2" width="10" height="10" rx="2" fill="white" fillOpacity=".65"/>
            <rect x="2" y="16" width="10" height="10" rx="2" fill="white" fillOpacity=".65"/>
            <rect x="16" y="16" width="10" height="10" rx="2" fill="white" fillOpacity=".3"/>
          </svg>
        </div>

        <h1 className="login-title">CW Cycle Count</h1>
        <p className="login-sub">
          Inventory cycle count platform for<br />CoreWeave European DC operations
        </p>

        {BYPASS_AUTH ? (
          <div>
            <div className="alert alert-blue" style={{ textAlign:'left', marginBottom: 20 }}>
              <div className="alert-dot" style={{ background:'var(--blue)' }} />
              <div>
                <strong>Auth bypass active</strong><br />
                Signed in as mock user. Set <code>BYPASS_AUTH = false</code> in
                authService.js when Google client ID is ready.
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={() => loginWithGoogle({})}
            >
              Continue as J. Bakker (mock)
            </button>
          </div>
        ) : (
          <div>
            {error && (
              <div className="alert alert-red" style={{ marginBottom: 16, textAlign:'left' }}>
                <div className="alert-dot" style={{ background:'var(--red)' }} />
                {error}
              </div>
            )}

            <GoogleLogin
              onSuccess={loginWithGoogle}
              onError={() => {}}
              useOneTap
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
              shape="rectangular"
            />

            <div className="login-divider">or</div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sign in with your <strong>@coreweave.com</strong> Google account.<br />
              2FA enforced via Google Workspace.
            </p>
          </div>
        )}

        <p className="login-footer">
          CoreWeave Internal Tool · EU Operations<br />
          <span style={{ opacity: .6 }}>Access restricted to @coreweave.com accounts</span>
        </p>
      </div>
    </div>
  )
}
