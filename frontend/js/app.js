// ==========================================
// 1. TEMA (GECE/GÜNDÜZ MODU) AYARLARI
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);
updateButtonText(currentTheme);

if(themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        let newTheme = theme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateButtonText(newTheme);
    });
}

function updateButtonText(theme) {
    if(themeToggleBtn) {
        themeToggleBtn.innerText = theme === 'dark' ? '☀️ Gündüz Modu' : '🌙 Gece Modu';
    }
}

// ==========================================
// 2. API VE HTML ELEMENTLERİ
// ==========================================
const API_URL = "http://127.0.0.1:8000/api/durum";

const elSystemStatus = document.getElementById('system-status');
const elSystemTime = document.getElementById('system-time');
const elKpValue = document.getElementById('kp-value');
const elGScale = document.getElementById('g-scale');
const elKpLevel = document.getElementById('kp-level');
const elKpRisk = document.getElementById('kp-risk');
const elWindSpeed = document.getElementById('wind-speed');
const elWindStatus = document.getElementById('wind-status');
const elConnectionStatus = document.getElementById('connection-status');
const elConnectionText = document.getElementById('connection-text');
const mainAlertCard = document.getElementById('main-alert-card');
const elAiText = document.getElementById('ai-text');

// ==========================================
// 3. GRAFİK (CHART.JS) AYARLARI
// ==========================================
let kpChartInstance = null;
const maxDataPoints = 15;
let kpDataHistory = [];
let timeLabels = [];

function initChart() {
    const ctx = document.getElementById('kpChart').getContext('2d');

    kpChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Kp İndeksi (Manyetik Dalgalanma)',
                data: kpDataHistory,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 9,
                    grid: { color: 'rgba(100, 116, 139, 0.2)' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b' }
                }
            },
            plugins: {
                legend: { labels: { color: '#64748b', font: { weight: 'bold' } } }
            }
        }
    });
}

function updateChart(time, kp_value) {
    const shortTime = time.split(" ")[1] ? time.split(" ")[1].substring(0,5) : time;
    timeLabels.push(shortTime);
    kpDataHistory.push(kp_value);

    if (timeLabels.length > maxDataPoints) {
        timeLabels.shift();
        kpDataHistory.shift();
    }
    kpChartInstance.update();
}

// ==========================================
// 4. İNTERAKTİF HARİTA (WINDY STİLİ RİSK ISI HARİTASI)
// ==========================================
let map;
let heatLayer = null;
let gaziantepCoords = [37.0662, 37.3833];
let currentAstroAiAnalysis = "Veriler bekleniyor...";

function initMap() {
    map = L.map('world-map').setView(gaziantepCoords, 3);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 10,
        minZoom: 2
    }).addTo(map);

    // Sağ Alta Windy Tarzı Renk Ölçeği (Lejant) Ekle
    const legendControl = L.control({position: 'bottomright'});
    legendControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <strong>Fırtına Yoğunluğu</strong>
            <div class="legend-gradient"></div>
            <div class="legend-labels"><span>Sakin</span><span>Şiddetli</span></div>
        `;
        return div;
    };
    legendControl.addTo(map);

    // Tıklanınca açılan modern popup
    map.on('click', function(e) {
        L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <strong style="color: var(--accent-blue); font-size:1.1rem;">📍 Konum Analizi</strong><br><br>
                <b>Koordinat:</b> ${e.latlng.lat.toFixed(2)}, ${e.latlng.lng.toFixed(2)}<br><br>
                <b>Astro-AI Değerlendirmesi:</b><br>
                <i style="color: #cbd5e1;">${currentAstroAiAnalysis}</i>
            `)
            .openOn(map);
    });

    // Tam Ekran Kontrolü
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if(btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            const mapDiv = document.getElementById('world-map');
            if (!document.fullscreenElement) {
                if (mapDiv.requestFullscreen) mapDiv.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }
}

function generateHeatmapData(kp) {
    let points = [];
    let auroralBoundary = 80 - (kp * 6);
    let pointCount = 1000 + (kp * 250);

    for (let i = 0; i < pointCount; i++) {
        let lng = (Math.random() * 360) - 180;

        let latNorth = (Math.random() * (90 - auroralBoundary)) + auroralBoundary;
        let intensity = (latNorth - auroralBoundary) / (90 - auroralBoundary);
        points.push([latNorth, lng, intensity]);

        let latSouth = -((Math.random() * (90 - auroralBoundary)) + auroralBoundary);
        let intensitySouth = (Math.abs(latSouth) - auroralBoundary) / (90 - auroralBoundary);
        points.push([latSouth, lng, intensitySouth]);
    }
    return points;
}

// Haritayı ve Listeyi Kp İndeksine Göre Güncelleyen Fonksiyon
function updateMapAndList(kp) {
    let radius = 1000000;
    let color = '#10b981'; // Yeşil (Sakin)
    let regions = [];

    // Gerçek Veriye Göre Kademeli Etki Alanı ve Liste
    if (kp < 4) {
        radius = 1500000;
        color = '#10b981';
        regions = ["Kuzey Kutbu (Arktik Daire)", "Antarktika Kıtası (Güney Kutbu)"];
    } else if (kp >= 4 && kp < 6) {
        radius = 3500000;
        color = '#f59e0b'; // Sarı (Aktif)
        regions = ["Alaska ve Kuzey Kanada", "İskandinavya (Norveç, İsveç)", "Sibirya'nın Kuzeyi"];
    } else if (kp >= 6 && kp < 8) {
        radius = 5500000;
        color = '#ef4444'; // Kırmızı (Güçlü Fırtına)
        regions = ["ABD'nin Kuzey Eyaletleri", "Kuzey Avrupa ve Birleşik Krallık", "Kuzey Çin ve Japonya", "Güney Avustralya"];
    } else {
        radius = 8500000;
        color = '#8b5cf6'; // Mor (Şiddetli/Aşırı Fırtına)
        regions = ["Orta Doğu (Türkiye Dahil)", "Tüm Avrupa ve Kuzey Amerika", "Küresel Elektrik Şebekeleri (Çökme Riski)"];
    }

    // Harita Animasyonlarını Güncelle
    if (northRiskZone) {
        northRiskZone.setRadius(radius);
        northRiskZone.setStyle({color: color, fillColor: color});
    }
    if (southRiskZone) {
        southRiskZone.setRadius(radius);
        southRiskZone.setStyle({color: color, fillColor: color});
    }

    // Listeyi Güncelle
    const listEl = document.getElementById('risk-regions-list');
    if (listEl) {
        listEl.innerHTML = ''; // Eski listeyi temizle
        regions.forEach(region => {
            let li = document.createElement('li');
            li.style.padding = "10px 15px";
            li.style.backgroundColor = "var(--bg-card)";
            li.style.borderLeft = `4px solid ${color}`;
            li.style.borderRadius = "6px";
            li.style.fontSize = "0.95rem";
            li.style.fontWeight = "500";
            li.style.color = "var(--text-main)";
            li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
            li.innerText = region;
            listEl.appendChild(li);
        });
    }
}

// ==========================================
// 5. JÜRİ SİMÜLASYON KONTROL MANTIĞI
// ==========================================
const kpSlider = document.getElementById('kp-slider');
const kpSliderValue = document.getElementById('kp-slider-value');

if(kpSlider) {
    kpSlider.addEventListener('input', (e) => {
        const testKp = e.target.value;
        kpSliderValue.innerText = testKp;
        kpSliderValue.style.color = testKp >= 5 ? '#ef4444' : '#8b5cf6'; // Tehlikede kırmızı olur

        // CANLI VERİ GÜNCELLEMEYİ DURDUR VEYA JÜRİYE ÖNCELİK VER
        // Jürinin seçtiği değere göre haritayı ve listeyi anında güncelle
        updateMapAndList(parseFloat(testKp));

        // Ekrandaki Kp yazısını da test amaçlı değiştir
        if(elKpValue) elKpValue.innerText = testKp;
        if(elGScale) elGScale.innerText = `G${testKp - 4 > 0 ? testKp - 4 : 0}`;
    });
}

// ==========================================
// 5. CANLI GÜNEŞ RÜZGARI SİMÜLASYONU (CANVAS 2D)
// ==========================================
const stormCanvas = document.getElementById('stormSimulationCanvas');
const ctx = stormCanvas ? stormCanvas.getContext('2d') : null;
let particles = [];
let currentWindSpeed = 400;

if(stormCanvas) {
    function resizeCanvas() {
        stormCanvas.width = stormCanvas.parentElement.clientWidth;
        stormCanvas.height = stormCanvas.parentElement.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * -200;
            this.y = Math.random() * stormCanvas.height;
            let speedMultiplier = currentWindSpeed / 150;
            this.speedX = (Math.random() * 2 + 1) * speedMultiplier;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
            this.color = currentWindSpeed > 600 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.6)';
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            const earthX = stormCanvas.width - 50;
            const earthY = stormCanvas.height / 2;
            const dx = earthX - this.x;
            const dy = earthY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150 && this.x < earthX) {
                this.speedY += (this.y < earthY ? -0.5 : 0.5);
                this.speedX *= 0.9;
                this.color = 'rgba(59, 130, 246, 0.8)';
            }

            if (this.x > stormCanvas.width || this.y < 0 || this.y > stormCanvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
    }

    function animateSimulation() {
        ctx.fillStyle = 'rgba(5, 11, 20, 0.3)';
        ctx.fillRect(0, 0, stormCanvas.width, stormCanvas.height);

        const earthX = stormCanvas.width - 50;
        const earthY = stormCanvas.height / 2;

        ctx.beginPath();
        ctx.arc(earthX, earthY, 150, Math.PI * 0.5, Math.PI * 1.5, false);
        ctx.strokeStyle = `rgba(59, 130, 246, ${currentWindSpeed > 600 ? 0.8 : 0.3})`;
        ctx.lineWidth = currentWindSpeed > 600 ? 4 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(earthX, earthY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#3b82f6';

        ctx.shadowBlur = 0;
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animateSimulation);
    }
    animateSimulation();
}

// ==========================================
// 6. VERI ÇEKME VE EKRANI GÜNCELLEME
// ==========================================
async function fetchSpaceWeather() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Ağ hatası");
        const data = await response.json();

        // 🟢 BAĞLANTI BAŞARILI
        if(elConnectionStatus) elConnectionStatus.className = "dot bg-yesil";
        if(elConnectionText) elConnectionText.innerText = "Sistem Çevrimiçi - Veriler Canlı";

        // VERİLERİ YAZDIR
        if(elSystemStatus) elSystemStatus.innerText = data.sistem_durumu === "ALARM" ? "🚨 TEHLİKE (FIRTINA ALARMI)" : "✅ SİSTEM NORMAL";
        if(elSystemTime) elSystemTime.innerText = `Son Güncelleme: ${data.zaman_damgasi}`;

        if(elKpValue) elKpValue.innerText = data.kp_degeri !== null ? data.kp_degeri : "--";
        if(elWindSpeed) elWindSpeed.innerText = data.ruzgar_hizi !== null ? data.ruzgar_hizi : "--";

        if(elKpLevel) elKpLevel.innerText = data.kp_analizi.seviye;
        if(elKpRisk) elKpRisk.innerText = data.kp_analizi.risk;
        if(elGScale) elGScale.innerText = data.kp_analizi.g_scale || "G0";
        if(elWindStatus) elWindStatus.innerText = data.ruzgar_analizi.durum;

        if(elAiText) elAiText.innerText = `"${data.ai_analizi}"`;
        currentAstroAiAnalysis = data.ai_analizi;

        // RENK VE DURUM GÜNCELLEMELERİ
        const kpColorClass = `bg-${data.kp_analizi.renk}`;
        if(elGScale) elGScale.className = `tag ${kpColorClass}`;

        if(mainAlertCard) {
            if (data.sistem_durumu === "ALARM") {
                mainAlertCard.classList.add("alert-red");
                mainAlertCard.style.backgroundColor = "";
            } else {
                mainAlertCard.classList.remove("alert-red");
                mainAlertCard.style.backgroundColor = "";
            }
        }

        // SİMÜLASYONU GÜNCELLE
        if (data.ruzgar_hizi !== null && data.ruzgar_hizi > 0) {
            currentWindSpeed = data.ruzgar_hizi;
        }

        // GRAFİĞİ GÜNCELLE
        let simuleEdilenKp = data.kp_degeri !== null ? data.kp_degeri : (Math.random() * 3 + 1).toFixed(1);
        let ekrandaGosterilecek = (parseFloat(simuleEdilenKp) + (Math.random() * 0.4 - 0.2)).toFixed(2);
        if (ekrandaGosterilecek < 0) ekrandaGosterilecek = 0;

        updateChart(new Date().toLocaleTimeString(), ekrandaGosterilecek);

        // HARİTAYI GÜNCELLE
        updateMapAndList(data.kp_degeri);

    } catch (error) {
        // 🔴 BAĞLANTI KOPTU
        console.error("Veri çekilemedi:", error);
        if(elConnectionStatus) elConnectionStatus.className = "dot bg-kirmizi";
        if(elConnectionText) elConnectionText.innerText = "Bağlantı Hatası! API Çalışmıyor.";

        if(mainAlertCard) {
            mainAlertCard.classList.remove("alert-red");
            mainAlertCard.style.backgroundColor = "";
        }
    }
}

// ==========================================
// 7. BAŞLATICI
// ==========================================
initChart();
initMap();
fetchSpaceWeather();
setInterval(fetchSpaceWeather, 5000); // 5 saniyede bir günceller