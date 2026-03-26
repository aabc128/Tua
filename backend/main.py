from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fetch_data import SpaceWeatherDataFetcher
from analyzer import SpaceWeatherAnalyzer
import google.generativeai as genai

# API Uygulamamızı başlatıyoruz
app = FastAPI(title="StarWay Uzay Havası Erken Uyarı Sistemi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fetcher = SpaceWeatherDataFetcher()
analyzer = SpaceWeatherAnalyzer()

# ==========================================
# YAPAY ZEKA (GEMINI) AYARLARI
# ==========================================
# Buraya Google AI Studio'dan aldığınız API anahtarını girebilirsiniz.
# Boş bırakırsanız sistem çevrimdışı yedek yapay zeka algoritmasını kullanır.
AI_API_KEY = ""

if AI_API_KEY:
    genai.configure(api_key=AI_API_KEY)
    ai_model = genai.GenerativeModel('gemini-1.5-flash')

# API kotalarını aşmamak için yapay zeka yanıtını hafızada tutuyoruz
son_ai_yorumu = "Sistem başlatılıyor, veriler toplanıyor..."
son_kp_degeri = None


def yapay_zeka_analiz_et(kp, hiz):
    """Verileri Yapay Zekaya gönderir ve yorumlatır."""
    global son_ai_yorumu, son_kp_degeri

    # Eğer Kp değeri değişmediyse, aynı AI yorumunu kullan (Sürekli API'ye istek atmamak için)
    if kp == son_kp_degeri and son_kp_degeri is not None:
        return son_ai_yorumu

    son_kp_degeri = kp

    # Eğer API Key girilmişse Gerçek Yapay Zekayı kullan
    if AI_API_KEY:
        try:
            prompt = f"Şu anki uzay havası verileri: Dünyanın Kp manyetik indeksi {kp}/9 ve Güneş rüzgarı hızı {hiz} km/s. Bir astrofizikçi ve teknoloji uzmanı gibi bu durumu 2 kısa cümlede özetle. Uydular ve elektrik şebekeleri için risk var mı belirt."
            response = ai_model.generate_content(prompt)
            son_ai_yorumu = response.text.strip()
        except Exception as e:
            son_ai_yorumu = f"Yapay Zeka Bağlantı Hatası. Yedek analize geçiliyor..."
    else:
        # API Key yoksa Kural Tabanlı (Simüle Edilmiş) Yapay Zeka Kullan
        if kp < 4:
            son_ai_yorumu = "Yapay Zeka Analizi: Manyetosfer şu an oldukça sakin. Güneş rüzgarları Dünya'nın manyetik kalkanı tarafından başarıyla saptırılıyor. Uydular ve yeryüzü iletişim ağları için herhangi bir elektromanyetik tehdit öngörülmüyor."
        elif 4 <= kp < 6:
            son_ai_yorumu = "Yapay Zeka Analizi: Güneş'te artan aktivite tespit edildi. Radyo iletişiminde ufak parazitlenmeler yaşanabilir, kutuplarda auroralar (Kuzey Işıkları) gözlemlenebilir."
        else:
            son_ai_yorumu = "Yapay Zeka Analizi: DİKKAT! Yüksek enerjili plazma bulutu manyetosferimize çarpıyor. GPS sinyallerinde sapmalar ve uydu devrelerinde statik elektrik birikimi riski yüksek. Elektrik şebekelerinde voltaj dalgalanmaları yaşanabilir!"

    return son_ai_yorumu


@app.get("/api/durum")
def get_space_weather_status():
    kp_data = fetcher.get_latest_kp_index()
    wind_data = fetcher.get_latest_solar_wind()

    rapor = analyzer.generate_system_report(kp_data, wind_data)

    # EKSİK OLAN SAYILARI BURADA EKLİYORUZ (Frontend'in okuyabilmesi için)
    kp_val = kp_data.get("kp_indeksi") if kp_data else 0
    wind_val = wind_data.get("hiz_kms") if wind_data else 0

    rapor["kp_degeri"] = kp_val
    rapor["ruzgar_hizi"] = wind_val

    # Yapay Zeka Yorumunu Rapora Ekle
    rapor["ai_analizi"] = yapay_zeka_analiz_et(kp_val, wind_val)

    return rapor


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)