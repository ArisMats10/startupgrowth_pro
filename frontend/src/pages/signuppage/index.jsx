import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon.jsx';
import { useAuth } from '../../context/authContext.jsx';


const SignupPage =  () => {
  const { signup,user,initialLoading } = useAuth();
  const navigate = useNavigate();

    useEffect(() => {
    if (!initialLoading && user) {
      navigate("/dashboard");
    }
  }, [initialLoading, user, navigate]);


    const[form,setForm] = useState({
      username: '',
      fullname: '',
      email: '',
      password: '',
      passwordRepeat: ''
    });
    const[error,setError] = useState(null);
    const[loading,setLoading] = useState(false);
    const[showPassword,setShowPassword] = useState(false);
    const[showPasswordRepeat,setShowPasswordRepeat] = useState(false);

    const handleChange = (e) => {
      setForm({
        ...form,
        [e.target.name]: e.target.value
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");

      if (form.password !== form.passwordRepeat) {
        setError("Passwords do not match");
        return;
      }

      try {
        setLoading(true);
        await signup({
          username: form.username,
          fullname: form.fullname,
          email: form.email,
          password: form.password,
        });
        navigate("/");
      } catch (err) {
        const msg =
          err?.response?.data?.error || err?.message || "Signup failed";
        setError(msg);
        console.log(msg);
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
              <h1 className="text-2xl font-semibold">Sign up</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your StartupGrowth Pro account.</p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">
                {error}
              </p>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Username"
                id="username"
                name="username"
                required
                value={form.username}
                onChange={handleChange}
                placeholder="Choose a username"
              />

              <Input
                label="Full name"
                id="fullname"
                name="fullname"
                required
                value={form.fullname}
                onChange={handleChange}
                placeholder="Your full name"
              />

              <Input
                label="Email address"
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
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

              <Input
                label="Repeat password"
                id="passwordRepeat"
                name="passwordRepeat"
                type={showPasswordRepeat ? 'text' : 'password'}
                required
                value={form.passwordRepeat}
                onChange={handleChange}
                placeholder="Repeat your password"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPasswordRepeat((v) => !v)}
                    className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={showPasswordRepeat ? 'Hide repeated password' : 'Show repeated password'}
                  >
                    <Icon name={showPasswordRepeat ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                }
              />

              <Button type="submit" loading={loading} disabled={loading} fullWidth>
                {loading ? 'Creating your account...' : 'Create your account'}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p className="text-center">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">Log in</Link>
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

export default SignupPage