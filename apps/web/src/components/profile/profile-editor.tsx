'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icon';

const ACCEPTED_AVATAR = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_AVATAR_BYTES = 3.1 * 1024 * 1024;

export function ProfileAvatarSection({
  avatarUrl: initialAvatar,
  name,
  isViewingSelf,
}: {
  avatarUrl: string | null;
  name: string;
  isViewingSelf: boolean;
}) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

  async function handleAvatarChange(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED_AVATAR.includes(file.type)) {
      setError('Allowed formats: jpeg, jpg, png, gif.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Image is too large — max 3.1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = String(reader.result);
      setAvatar(dataUri);
      setSaving(true);
      try {
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: dataUri }),
        });
        if (!res.ok) {
          setError('Failed to save profile photo.');
        } else {
          router.refresh();
        }
      } catch {
        setError('Network error saving avatar.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRemove() {
    setAvatar(null);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (!res.ok) {
        setError('Failed to remove photo.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-white shadow-md">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-a2sv-600 via-teal-600 to-emerald-600 text-white font-bold text-2xl flex items-center justify-center">
              {initials}
            </div>
          )}
        </div>

        {isViewingSelf && (
          <label
            htmlFor="profile-avatar-input"
            className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
            title="Change photo"
          >
            <Icon name="upload" className="h-4 w-4" />
            <input
              id="profile-avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={(e) => handleAvatarChange(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      {saving && <p className="mt-2 text-xs text-a2sv-600 font-medium animate-pulse">Saving photo…</p>}
      {error && <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>}

      {isViewingSelf && avatar && !saving && (
        <button
          type="button"
          onClick={handleRemove}
          className="mt-2 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
        >
          Remove photo
        </button>
      )}
    </div>
  );
}

