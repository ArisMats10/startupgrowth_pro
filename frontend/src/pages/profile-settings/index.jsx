import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../context/authContext.jsx';

const ProfileSettings = () => {
  const { user, updateProfile, updatePassword, refreshUser, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const initialForm = useMemo(
    () => ({
      username: user?.username || '',
      fullname: user?.fullname || '',
    }),
    [user?.username, user?.fullname]
  );

  const [profileForm, setProfileForm] = useState(initialForm);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', newPasswordRepeat: '' });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordRepeat, setShowNewPasswordRepeat] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    setProfileForm(initialForm);
  }, [initialForm]);

  const onSaveProfile = async (e) => {
    e?.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const username = String(profileForm.username || '').trim();
    const fullname = String(profileForm.fullname || '').trim();

    if (!username && !fullname) {
      setProfileError('Please enter a username or fullname.');
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile({ username, fullname });
      await refreshUser?.();
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err?.response?.data?.error || err?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const onSavePassword = async (e) => {
    e?.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const currentPassword = String(passwordForm.currentPassword || '');
    const newPassword = String(passwordForm.newPassword || '');
    const newPasswordRepeat = String(passwordForm.newPasswordRepeat || '');

    if (!currentPassword || !newPassword || !newPasswordRepeat) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== newPasswordRepeat) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', newPasswordRepeat: '' });
      setPasswordSuccess('Password updated successfully.');
    } catch (err) {
      setPasswordError(err?.response?.data?.error || err?.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    const confirmed = window.confirm('Delete account permanently? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteAccount();
      navigate('/signup');
    } catch (err) {
      setProfileError(err?.response?.data?.error || err?.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Profile Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Update your account details.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="User" size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Profile</h2>
                <p className="text-sm text-muted-foreground">Edit username and fullname.</p>
              </div>
            </div>

            <form onSubmit={onSaveProfile} className="space-y-4">
              <Input
                label="Username"
                value={profileForm.username}
                onChange={(e) => setProfileForm((p) => ({ ...p, username: e?.target?.value }))}
                placeholder="Your username"
              />
              <Input
                label="Full name"
                value={profileForm.fullname}
                onChange={(e) => setProfileForm((p) => ({ ...p, fullname: e?.target?.value }))}
                placeholder="Your full name"
              />

              {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              {profileSuccess && <p className="text-sm text-success">{profileSuccess}</p>}

              <div className="flex justify-end">
                <Button type="submit" loading={profileSaving} disabled={profileSaving}>
                  Save changes
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="Key" size={18} className="text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Password</h2>
                <p className="text-sm text-muted-foreground">Change your password.</p>
              </div>
            </div>

            <form onSubmit={onSavePassword} className="space-y-4">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                label="Current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e?.target?.value }))}
                placeholder="Enter current password"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    <Icon name={showCurrentPassword ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                }
              />
              <Input
                type={showNewPassword ? 'text' : 'password'}
                label="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e?.target?.value }))}
                placeholder="Enter new password"
                description="Must be 6+ chars, include 1 uppercase, 1 number, and 1 special character."
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    <Icon name={showNewPassword ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                }
              />
              <Input
                type={showNewPasswordRepeat ? 'text' : 'password'}
                label="Repeat new password"
                value={passwordForm.newPasswordRepeat}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPasswordRepeat: e?.target?.value }))}
                placeholder="Repeat new password"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordRepeat((v) => !v)}
                    className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPasswordRepeat ? 'Hide repeated new password' : 'Show repeated new password'}
                  >
                    <Icon name={showNewPasswordRepeat ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                }
              />

              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-success">{passwordSuccess}</p>}

              <div className="flex justify-end">
                <Button type="submit" loading={passwordSaving} disabled={passwordSaving}>
                  Update password
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Icon name="HelpCircle" size={18} className="text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Help & Support</h2>
                <p className="text-sm text-muted-foreground">Need help with your account?</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Contact support at <span className="text-foreground font-medium">support@startupgrowthpro.com</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href="mailto:support@startupgrowthpro.com?subject=Support%20Request">Email support</a>
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-soft p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Icon name="Trash2" size={18} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Delete account</h2>
                <p className="text-sm text-muted-foreground">Permanently remove your account.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              <Button variant="destructive" onClick={onDeleteAccount}>
                Delete account
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
