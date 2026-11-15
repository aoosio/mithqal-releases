const feedUrl = 'https://raw.githubusercontent.com/aoosio/mithqal-releases/main/releases.json';
const releasesUrl = 'https://github.com/aoosio/mithqal-releases/releases';
const architectures = new Map([
  ['/download/windows-x64.exe', 'x64'],
  ['/download/windows-ia32.exe', 'ia32'],
]);

export function isWindowsReleasePath(path) {
  return path === '/releases.json' || architectures.has(path);
}

export async function windowsRelease(request) {
  const path = new URL(request.url).pathname;
  try {
    const upstream = await fetch(feedUrl, {signal: AbortSignal.timeout(8000)});
    if (!upstream.ok) throw new Error('Release feed unavailable');
    if (path === '/releases.json') {
      return new Response(request.method === 'HEAD' ? null : upstream.body, {
        headers: {'content-type': 'application/json', 'cache-control': 'no-cache'},
      });
    }
    const {releases} = await upstream.json();
    const latest = releases.filter(r => /^\d+\.\d+\.\d+$/.test(r.version) && r.files?.x64)
      .sort((a, b) => a.version.localeCompare(b.version, 'en', {numeric: true})).at(-1);
    const arch = architectures.get(path);
    const name = latest?.files[arch]?.name;
    if (!latest || name !== `Mithqal-Setup-${latest.version}-${arch}.exe`) throw new Error('Installer missing');
    return new Response(null, {status: 302, headers: {
      location: `${releasesUrl}/download/v${latest.version}/${name}`, 'cache-control': 'no-store',
    }});
  } catch {
    if (path === '/releases.json') return new Response(null, {status: 503, headers: {'cache-control':'no-store'}});
    return new Response(null, {status: 302, headers: {location: releasesUrl + '/latest', 'cache-control':'no-store'}});
  }
}
