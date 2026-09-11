'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';

const COUNTRIES = [
  'Ethiopia', 'Kenya', 'Rwanda', 'Ghana', 'Nigeria', 'South Africa', 'Tanzania', 'Uganda',
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'India', 'Other',
];

const ACCEPTED_AVATAR = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_AVATAR_BYTES = 3.1 * 1024 * 1024;

interface RegisterResponse {
  user?: { name: string };
  error?: { message: string };
}

export function RegisterInviteForm({ token, initialEmail }: { token: string; initialEmail: string | null }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [studentId, setStudentId] = useState('');
  const [bio, setBio] = useState('');

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onAvatar(file: File | undefined) {
    setAvatarError(null);
    if (!file) return;
    if (!ACCEPTED_AVATAR.includes(file.type)) {
      setAvatarError('Allowed formats: jpeg, jpg, png, gif.');
      setAvatar(null);
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image is too large — max 3.1MB.');
      setAvatar(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!country) next.country = 'Select your country';
    if (!university.trim()) next.university = 'University is required';
    if (linkedin.trim() && !/linkedin\.com\/in\//.test(linkedin.trim())) {
      next.linkedin = 'Invalid LinkedIn profile URL (expected linkedin.com/in/...)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
          country,
          university: university.trim(),
          department: department.trim() || undefined,
          instagram: instagram.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          studentId: studentId.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });
      const payload = (await res.json().catch(() => null)) as RegisterResponse | null;
      if (!res.ok) {
        setServerError(payload?.error?.message ?? 'Could not complete registration.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          {initialEmail ? (
            <>You were invited at <span className="font-semibold text-slate-700">{initialEmail}</span>.</>
          ) : (
            'Finish setting up your profile to join the Hub.'
          )}
        </p>

        {/* Avatar upload */}
        <div className="mt-6 flex items-center gap-4">
          <span className="avatar h-16 w-16 text-lg">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              'H'
            )}
          </span>
          <div>
            <label
              htmlFor="avatar"
              className="cursor-pointer rounded-xl border border-a2sv-500 bg-a2sv-50 px-4 py-2 text-sm font-semibold text-a2sv-700 transition hover:bg-a2sv-100"
            >
              Update photo
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={(e) => onAvatar(e.target.files?.[0])}
            />
            <p className="mt-1.5 text-xs text-slate-400">jpeg · jpg · png · gif, max 3.1MB</p>
            {avatarError && <p className="field-error">{avatarError}</p>}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <OutlinedInput label="Name" required placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <OutlinedInput label="Password" type="password" required placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <OutlinedSelect label="Select your country" required options={COUNTRIES.map((c) => ({ value: c, label: c }))} value={country} onChange={setCountry} error={errors.country} placeholder="Choose…" />
          <OutlinedInput label="University" required placeholder="e.g. Addis Ababa University" value={university} onChange={(e) => setUniversity(e.target.value)} error={errors.university} />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Optional</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <OutlinedInput label="Department" placeholder="e.g. Software Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
            <OutlinedInput label="Instagram Username" placeholder="@username" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            <OutlinedInput label="LinkedIn" placeholder="https://linkedin.com/in/..." value={linkedin} onChange={(e) => setLinkedin(e.target.value)} error={errors.linkedin} />
            <OutlinedInput label="Student ID" placeholder="Optional ID number" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="bio">Short bio</label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself…"
                className="field-input resize-none"
              />
            </div>
          </div>
        </div>

        {serverError && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {serverError}
          </p>
        )}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}