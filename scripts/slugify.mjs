// Branch slug, same rules as scripts/slugify.sh and the backend's deploy/lib.sh.
export function slugify(branch, max = 45) {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
  return slug.replace(/-$/, '')
}
