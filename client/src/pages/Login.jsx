import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = (e) => {
    e.preventDefault();
    // Auth wired in Prompt 17
    navigate('/dashboard');
  };

  return (
    <div className="arise-page-enter min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="arise-card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Sign in to ARISE</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Enter your credentials to access the platform</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full arise-card px-4 py-2 transition-colors" style={{ color: "var(--text-primary)", outline: "none" }}
              placeholder="officer@ksp.gov.in"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full arise-card px-4 py-2 transition-colors" style={{ color: "var(--text-primary)", outline: "none" }}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full font-semibold py-2.5 px-4 transition-colors mt-2" style={{ backgroundColor: "var(--amber)", color: "#09090b", borderRadius: "6px" }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
