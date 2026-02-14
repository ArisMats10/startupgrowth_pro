import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon.jsx';
import { useAuth } from '../../context/authContext.jsx';

const LoginPage = () => {
  const { login,user,initialLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!initialLoading && user) {
      navigate("/");
    }
  }, [initialLoading, user, navigate]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await login({
        username: form.username,
        password: form.password,
      });
      // user is now logged in (cookie set, context updated)
      navigate("/"); // or your main page route
    } catch (err) {
      const msg =
        err?.response?.data?.error || err?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-16">
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Log in</h1>
              <p className="text-sm text-muted-foreground mt-1">Access your StartupGrowth Pro account.</p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">
                {error}
              </p>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Username"
                name="username"
                required
                value={form.username}
                onChange={handleChange}
                placeholder="Enter your username"
              />

              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                }
              />

              <Button type="submit" loading={loading} disabled={loading} fullWidth>
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p className="text-center">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
              </p>
              <p className="text-center">
                <Link to="/" className="text-primary hover:underline">Continue without an account</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage