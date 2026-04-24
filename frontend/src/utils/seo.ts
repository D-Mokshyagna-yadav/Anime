export function setPageMeta(title: string, description: string, image?: string) {
  // Update document title
  document.title = `${title} | AniStream`;

  // Update or create meta description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.setAttribute('name', 'description');
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute('content', description);

  // Update OG tags
  updateOGTag('og:title', title);
  updateOGTag('og:description', description);
  if (image) updateOGTag('og:image', image);
}

function updateOGTag(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function clearPageMeta() {
  document.title = 'AniStream';
}
