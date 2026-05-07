let miGrafica, miniGrafica;
let historialParaReporte = [];

function sonarAlarmaIndustrial() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
}

function ejecutarAnalisis() {
    const Ta = parseFloat(document.getElementById('tempAmbiente').value);
    const To = parseFloat(document.getElementById('tempInicial').value);
    const selector = document.getElementById('componente');
    const k = parseFloat(selector.value);
    const nombre = selector.options[selector.selectedIndex].text;

    if (To >= 90) { 
        sonarAlarmaIndustrial(); 
        lanzarNotificacion(nombre, To);
    }

    const tFinal = Math.log(5 / (To - Ta)) / -k;
    animarNumero('numeroAnimado', 0, tFinal, 1000);

    let color = To >= 90 ? '#d32f2f' : (To >= 70 ? '#ff5f00' : '#2e7d32');
    let estado = To >= 90 ? 'CRÍTICO' : (To >= 70 ? 'ALTA' : 'ÓPTIMA');

    document.getElementById('labelEstado').innerText = `ESTADO: ${estado}`;
    document.getElementById('labelEstado').style.color = color;

    actualizarGraficaPrincipal(Ta, To, k, tFinal, nombre, color);
    actualizarMiniGrafico(Ta, To, k, tFinal, color);

    historialParaReporte.push({ nombre, ambiente: Ta, inicial: To, tiempo: tFinal.toFixed(2), estado });

    const logHTML = `
        <div class="log-item" style="background:#222; padding:15px; margin-bottom:12px; border:1px solid #333;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem;"><span>${nombre}</span><strong style="color:${color}">${To}°C</strong></div>
            <div style="height:6px; background:#111; margin:10px 0; border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${Math.min((To/150)*100, 100)}%; background:${color}; transition:1s;"></div>
            </div>
        </div>`;
    document.getElementById('listaHistorial').insertAdjacentHTML('afterbegin', logHTML);
    if (To >= 90) document.getElementById('listaCritica').insertAdjacentHTML('afterbegin', logHTML);
}

function actualizarMiniGrafico(Ta, To, k, tf, color) {
    const ctx = document.getElementById('miniGrafico').getContext('2d');
    let data = [];
    for (let i = 0; i <= 20; i++) {
        data.push((Ta + (To - Ta) * Math.exp(-k * (tf / 20) * i)).toFixed(2));
    }
    if (miniGrafica) miniGrafica.destroy();
    miniGrafica = new Chart(ctx, {
        type: 'line',
        data: { labels: data.map(()=>""), datasets: [{ data, borderColor: color, borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: color + '22' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function actualizarGraficaPrincipal(Ta, To, k, tf, nombre, color) {
    const ctx = document.getElementById('graficaEnfriamiento').getContext('2d');
    let data = [], labels = [];
    for (let i = 0; i <= 40; i++) {
        let t = (tf / 40) * i;
        labels.push(t.toFixed(1));
        data.push((Ta + (To - Ta) * Math.exp(-k * t)).toFixed(2));
    }
    if (!miGrafica) {
        miGrafica = new Chart(ctx, { type: 'line', data: { labels, datasets: [] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#888' } } }, scales: { x: { display: false }, y: { ticks: { color: '#444' } } } } });
    }
    miGrafica.data.datasets.push({ label: nombre, data, borderColor: color, borderWidth: 2, pointRadius: 0 });
    miGrafica.update();
}

function lanzarNotificacion(h, t) {
    const container = document.getElementById('notificacionContainer');
    const toast = document.createElement('div');
    toast.className = 'toast-minecraft';
    toast.innerHTML = `<div class="toast-icon">⚠️</div><div class="toast-text"><b>ALERTA CRÍTICA</b><p>${h}: ${t}°C</p></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function generarReporte() {
    const v = window.open('', '_blank');
    let f = historialParaReporte.map(h => `<tr style="border-bottom:1px solid #eee"><td style="padding:10px">${h.nombre}</td><td style="padding:10px">${h.ambiente}°C</td><td style="padding:10px; font-weight:bold">${h.inicial}°C</td><td style="padding:10px">${h.tiempo} min</td><td style="padding:10px; color:${h.estado === 'CRÍTICO' ? 'red' : 'green'}">${h.estado}</td></tr>`).join('');
    v.document.write(`<html><body style="font-family:sans-serif;padding:40px"><h1>REPORTE DE TELEMETRÍA</h1><table style="width:100%;border-collapse:collapse;margin-top:20px"><thead style="background:#f4f4f4"><tr><th style="padding:10px;text-align:left">Componente</th><th style="padding:10px;text-align:left">Ambiente</th><th style="padding:10px;text-align:left">Detección</th><th style="padding:10px;text-align:left">Tiempo Estabilidad</th><th style="padding:10px;text-align:left">Estado</th></tr></thead><tbody>${f}</tbody></table></body></html>`);
    v.document.close(); v.print();
}

function animarNumero(id, ini, fin, dur) {
    let obj = document.getElementById(id); let start = null;
    function step(ts) {
        if (!start) start = ts; let prog = Math.min((ts - start) / dur, 1);
        obj.innerText = (ini + (fin - ini) * prog).toFixed(2);
        if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}