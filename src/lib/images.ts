// Resolve an image path from the imported Markdown ("../../../assets/images/doctor/dr-lynam.webp") to the
// ImageMetadata that astro:assets needs. Loaded lazily so a page only pulls in the images it uses.
const loaders = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/**/*.webp');

export async function resolveImage(relPath: string | undefined): Promise<ImageMetadata | undefined> {
  if (!relPath) return undefined;
  const marker = 'assets/images/';
  const i = relPath.indexOf(marker);
  if (i < 0) return undefined;
  const load = loaders['/src/assets/images/' + relPath.slice(i + marker.length)];
  return load ? (await load()).default : undefined;
}

/** Wide banners (for example the IDEAL brochure strip) and tiny icons make poor hero or card images. */
export const isPhotoShaped = (m: ImageMetadata, minWidth = 380) => m.width >= minWidth && m.width / m.height < 2.2 && m.width / m.height > 0.5;
