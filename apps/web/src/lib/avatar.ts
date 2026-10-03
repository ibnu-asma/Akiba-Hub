/**
 * Cloudinary avatar transformation utility.
 * Injects on-the-fly transformations (WebP/AVIF auto-format, quality optimization, and face-aware cropping)
 * or returns the raw URL if not hosted on Cloudinary.
 */
export function getOptimizedAvatarUrl(url: string | null | undefined, size = 80): string | null {
  if (!url) return null;
  if (!url.includes('cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  // Avoid re-transforming if transformations are already present
  if (url.includes('/upload/w_') || url.includes('/upload/c_')) {
    return url;
  }
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,g_face,q_auto,f_auto/`);
}
