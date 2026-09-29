/* Optional online presentation only. Recording and the original SVG stay independent. */
window.RouteMap = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  let generation = 0, current = null;
  const loaded = new Map();
  function element(name, attributes) {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }
  function clear() {
    generation++;
    if (current) {
      current.svg.innerHTML = current.fallback;
      current.svg.setAttribute('viewBox', '0 0 320 420');
    }
    current = null;
    document.getElementById('mapCredit').hidden = true;
  }
  function tile(url) {
    if (loaded.has(url)) return loaded.get(url);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => { image.onload = image.onerror = null; reject(new Error('Map timeout')); }, 8000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Map unavailable')); };
      image.src = url;
    });
    loaded.set(url, promise);
    promise.catch(() => loaded.delete(url));
    // Browser HTTP caching remains authoritative; bound the in-memory lookup.
    if (loaded.size > 80) loaded.delete(loaded.keys().next().value);
    return promise;
  }
  async function show(svg, points) {
    const token = ++generation;
    current = {svg, fallback: svg.innerHTML};
    if (!navigator.onLine || points.length < 2) return;
    const width = svg.clientWidth, height = svg.clientHeight;
    if (!width || !height) return;
    const projected = points.map(point => {
      const latitude = Math.max(-85.05112878, Math.min(85.05112878, point.latitude)) * Math.PI / 180;
      return [(point.longitude + 180) / 360, (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2];
    });
    // Keep a route crossing the date line contiguous.
    for (let i = 1; i < projected.length; i++) projected[i][0] += Math.round(projected[i-1][0] - projected[i][0]);
    const xs = projected.map(p => p[0]), ys = projected.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const fit = Math.min((width-48)/Math.max(maxX-minX, 1e-10), (height-48)/Math.max(maxY-minY, 1e-10));
    const zoom = Math.max(0, Math.min(18, Math.floor(Math.log2(fit/256))));
    const count = 2 ** zoom, world = 256 * count;
    const left = (minX+maxX)/2*world-width/2, top = (minY+maxY)/2*world-height/2;
    const layer = element('g', {'aria-hidden':'true'}), requests = [];
    for (let y = Math.floor(top/256); y <= Math.floor((top+height)/256); y++) {
      if (y < 0 || y >= count) continue;
      for (let x = Math.floor(left/256); x <= Math.floor((left+width)/256); x++) {
        const url = `https://tile.openstreetmap.org/${zoom}/${((x%count)+count)%count}/${y}.png`;
        layer.appendChild(element('image', {href:url, x:x*256-left, y:y*256-top, width:256, height:256}));
        requests.push(tile(url));
      }
    }
    try {
      await Promise.all(requests);
      if (token !== generation || !navigator.onLine) return;
      const coords = projected.map(([x,y]) => [x*world-left, y*world-top]);
      const line = element('polyline', {class:'route-line', points:coords.map(p=>p.join(',')).join(' ')});
      const markers = [[coords[0],'route-start'],[coords.at(-1),'route-end']].map(([[cx,cy],cls])=>element('circle',{class:cls,cx,cy,r:5}));
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.replaceChildren(layer, line, ...markers);
      document.getElementById('mapCredit').hidden = false;
    } catch {
      // The original dark route remains visible on timeout, blocking or connection failure.
    }
  }
  window.addEventListener('offline', clear);
  return {clear, show};
})();
