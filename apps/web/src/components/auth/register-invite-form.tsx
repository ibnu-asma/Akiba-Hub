'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icon';

const COUNTRIES = [
  'Ethiopia', 'Kenya', 'Rwanda', 'Ghana', 'Nigeria', 'South Africa', 'Tanzania', 'Uganda',
  'Egypt', 'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'India', 'Other',
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
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [studentId, setStudentId] = useState('');
  const [telegram, setTelegram] = useState('');
  const [leetcode, setLeetcode] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [bio, setBio] = useState('');

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOptional, setShowOptional] = useState(true);

  function onAvatar(file: File | undefined) {
    setAvatarError(null);
    if (!file) return;
    if (!ACCEPTED_AVATAR.includes(file.type)) {
      setAvatarError('Allowed formats: jpeg, jpg, png, gif.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image is too large — max 3.1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Full name is required';
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!country) next.country = 'Please select your country of residence';
    if (!university.trim()) next.university = 'University or institution name is required';
    if (linkedin.trim() && !/linkedin\.com\/in\//.test(linkedin.trim())) {
      next.linkedin = 'Expected LinkedIn format (e.g. linkedin.com/in/username)';
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
          avatarUrl: avatar || undefined,
          department: department.trim() || undefined,
          instagram: instagram.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          telegram: telegram.trim() || undefined,
          leetcode: leetcode.trim() || undefined,
          codeforces: codeforces.trim() || undefined,
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

  const initials = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'A';

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 md:p-10 shadow-sm">
        {/* Header Badge & Title */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 mb-3">
            <Icon name="shield" className="h-3.5 w-3.5" />
            <span>Official Academy Invitation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Complete Your Registration
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            Welcome to the Akiba Academy network! Enter your credentials and details below to activate your account.
          </p>
        </div>

        {/* Verified Invite Box */}
        {initialEmail && (
          <div className="mb-6 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <Icon name="mail" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-900">Invited Email Account</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Icon name="check" className="h-2.5 w-2.5" /> Verified
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{initialEmail}</p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">
              Locked to invitation
            </span>
          </div>
        )}

        {/* Profile Photo Upload */}
        <div className="mb-8 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-a2sv-600 via-teal-600 to-emerald-600 text-white font-bold text-xl flex items-center justify-center tracking-wider">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs font-semibold text-slate-700">Profile Photo (Optional)</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload a picture so mentors and teammates can recognize you.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Icon name="upload" className="h-3.5 w-3.5 text-slate-500" />
                <span>{avatar ? 'Change photo' : 'Upload photo'}</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={(e) => onAvatar(e.target.files?.[0])}
              />
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">JPG, PNG or GIF • Max 3.1 MB</p>
            {avatarError && <p className="mt-1 text-xs text-rose-600 font-medium">{avatarError}</p>}
          </div>
        </div>

        {/* Section 1: Required Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Required Account Details
            </span>
            <span className="text-[11px] text-slate-400">* Required fields</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                required
                placeholder="e.g. Geleta Daba"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={`w-full rounded-xl border ${
                  errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                } px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={`w-full rounded-xl border ${
                    errors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                  } pl-3.5 pr-12 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password}</p>}
            </div>

            {/* Country */}
            <div>
              <label htmlFor="reg-country" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Country of Residence <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="reg-country"
                  required
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (errors.country) setErrors((prev) => ({ ...prev, country: '' }));
                  }}
                  className={`w-full appearance-none rounded-xl border ${
                    errors.country ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                  } px-3.5 py-2.5 pr-9 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all cursor-pointer`}
                >
                  <option value="" disabled>
                    Select your country…
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <Icon name="chevronDown" className="h-4 w-4" />
                </div>
              </div>
              {errors.country && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.country}</p>}
            </div>

            {/* University */}
            <div>
              <label htmlFor="reg-university" className="block text-xs font-semibold text-slate-700 mb-1.5">
                University / Institution <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-university"
                type="text"
                required
                placeholder="e.g. Addis Ababa University"
                value={university}
                onChange={(e) => {
                  setUniversity(e.target.value);
                  if (errors.university) setErrors((prev) => ({ ...prev, university: '' }));
                }}
                className={`w-full rounded-xl border ${
                  errors.university ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                } px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all`}
              />
              {errors.university && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.university}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Optional Academic & Social Details */}
        <div className="mt-8 pt-6 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Academic &amp; Social Profile
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Optional information to personalize your academy presence.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-a2sv-600 hover:text-a2sv-700 py-1 px-2.5 rounded-lg hover:bg-a2sv-50 transition-colors cursor-pointer"
            >
              <span>{showOptional ? 'Collapse' : 'Expand'}</span>
              <Icon name={showOptional ? 'chevronDown' : 'chevronRight'} className="h-3.5 w-3.5" />
            </button>
          </div>

          {showOptional && (
            <div className="grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50/60 p-4 sm:p-5 border border-slate-200/60 transition-all">
              {/* Department */}
              <div>
                <label htmlFor="reg-department" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Department / Major
                </label>
                <input
                  id="reg-department"
                  type="text"
                  placeholder="e.g. Software Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>

              {/* Student ID */}
              <div>
                <label htmlFor="reg-student-id" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Student ID Number
                </label>
                <input
                  id="reg-student-id"
                  type="text"
                  placeholder="e.g. UGR/1234/14"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label htmlFor="reg-linkedin" className="block text-xs font-medium text-slate-700 mb-1.5">
                  LinkedIn Profile URL
                </label>
                <input
                  id="reg-linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedin}
                  onChange={(e) => {
                    setLinkedin(e.target.value);
                    if (errors.linkedin) setErrors((prev) => ({ ...prev, linkedin: '' }));
                  }}
                  className={`w-full rounded-xl border ${
                    errors.linkedin ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                  } px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all`}
                />
                {errors.linkedin && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.linkedin}</p>}
              </div>

              {/* Instagram */}
              <div>
                <label htmlFor="reg-instagram" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Instagram Handle
                </label>
                <input
                  id="reg-instagram"
                  type="text"
                  placeholder="@username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>

              {/* Telegram */}
              <div>
                <label htmlFor="reg-telegram" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Telegram Username
                </label>
                <input
                  id="reg-telegram"
                  type="text"
                  placeholder="@username"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>

              {/* LeetCode */}
              <div>
                <label htmlFor="reg-leetcode" className="block text-xs font-medium text-slate-700 mb-1.5">
                  LeetCode Username
                </label>
                <input
                  id="reg-leetcode"
                  type="text"
                  placeholder="e.g. geleta_daba"
                  value={leetcode}
                  onChange={(e) => setLeetcode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>

              {/* Codeforces */}
              <div>
                <label htmlFor="reg-codeforces" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Codeforces Handle
                </label>
                <input
                  id="reg-codeforces"
                  type="text"
                  placeholder="e.g. tourist"
                  value={codeforces}
                  onChange={(e) => setCodeforces(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>

              {/* Bio */}
              <div className="sm:col-span-2">
                <label htmlFor="reg-bio" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Short Bio
                </label>
                <textarea
                  id="reg-bio"
                  rows={3}
                  placeholder="Share your background, tech interests, or goals in the academy…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            className="mt-6 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 flex items-start gap-2.5"
            role="alert"
          >
            <div className="grid h-5 w-5 place-items-center rounded-full bg-rose-200/70 text-rose-700 shrink-0 text-xs font-bold mt-0.5">
              !
            </div>
            <div className="leading-snug">{serverError}</div>
          </div>
        )}

        {/* Submit Action */}
        <div className="mt-8 space-y-3">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-a2sv-600 hover:bg-a2sv-700 active:bg-a2sv-800 text-white py-3.5 px-4 font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Activating account…</span>
              </>
            ) : (
              <>
                <span>Complete Registration &amp; Enter Hub</span>
                <Icon name="chevronRight" className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            By activating your account, you agree to the Akiba Academy Honor Code &amp; Terms.
          </p>
        </div>
      </div>
    </form>
  );
}