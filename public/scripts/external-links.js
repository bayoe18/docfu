/**
 * Auto-open external links in new tab
 * Adds target="_blank" and rel="noopener noreferrer" to all external links
 */
export function setupExternalLinks() {
  const links = document.querySelectorAll('a[href^="http"]')
  links.forEach(link => {
    if (link.hostname !== window.location.hostname) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
  })
}

document.addEventListener('DOMContentLoaded', setupExternalLinks)
