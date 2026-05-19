import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import google.generativeai as genai
from dotenv import load_dotenv

# Load env variables from local directory
load_dotenv()

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables.")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash") # gemini-2.0-flash: higher free-tier rate limits

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def normalize_turkish_term(s: str) -> str:
    if not s:
        return ""
    # Map Turkish upper/lower characters to basic ASCII lower equivalents
    translation_table = str.maketrans({
        'ı': 'i', 'İ': 'i', 'I': 'i',
        'ş': 's', 'Ş': 's',
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ü': 'u', 'Ü': 'u',
        'ö': 'o', 'Ö': 'o',
        'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h',
        'J': 'j', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'O': 'o', 'P': 'p', 'Q': 'q',
        'R': 'r', 'S': 's', 'T': 't', 'U': 'u', 'V': 'v', 'W': 'w', 'X': 'x', 'Y': 'y',
        'Z': 'z'
    })
    return s.translate(translation_table).lower()

def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname="marketplace_db",
            user="postgres",
            password="1234",
            host="localhost",
            port=5432
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

class LLMSearchRequest(BaseModel):
    query: str

@app.get("/api/products")
def get_products(
    category: Optional[str] = None,
    color: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    gender: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 12
):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        filter_conditions = ""
        params = []
        
        if category:
            filter_conditions += " AND category = %s"
            params.append(category)
        if color:
            filter_conditions += " AND color = %s"
            params.append(color)
        if min_price is not None:
            filter_conditions += " AND price >= %s"
            params.append(min_price)
        if max_price is not None:
            filter_conditions += " AND price <= %s"
            params.append(max_price)
        if gender:
            filter_conditions += " AND gender = %s"
            params.append(gender)
        if q:
            # Split search query into individual keywords
            keywords = [w.strip() for w in q.split() if w.strip()]
            for kw in keywords:
                norm_kw = normalize_turkish_term(kw)
                # SQL-side character translation for accent/case insensitivity across all fields
                filter_conditions += """ AND (
                    TRANSLATE(LOWER(title), 'ıişğüçö', 'iisguco') LIKE %s OR 
                    TRANSLATE(LOWER(title_tr), 'ıişğüçö', 'iisguco') LIKE %s OR 
                    TRANSLATE(LOWER(description), 'ıişğüçö', 'iisguco') LIKE %s OR
                    TRANSLATE(LOWER(category), 'ıişğüçö', 'iisguco') LIKE %s OR
                    TRANSLATE(LOWER(color), 'ıişğüçö', 'iisguco') LIKE %s OR
                    TRANSLATE(LOWER(gender), 'ıişğüçö', 'iisguco') LIKE %s OR
                    TRANSLATE(LOWER(array_to_string(style_tags, ' ')), 'ıişğüçö', 'iisguco') LIKE %s
                )"""
                params.extend([f"%{norm_kw}%", f"%{norm_kw}%", f"%{norm_kw}%", f"%{norm_kw}%", f"%{norm_kw}%", f"%{norm_kw}%", f"%{norm_kw}%"])
            
        # 1. Total products count matching filters
        count_query = "SELECT COUNT(*) FROM products WHERE 1=1" + filter_conditions
        cur.execute(count_query, params)
        total_count = cur.fetchone()['count']
        
        # 2. Get paginated products
        query = "SELECT * FROM products WHERE 1=1" + filter_conditions + " ORDER BY id ASC LIMIT %s OFFSET %s"
        params_with_paging = list(params) + [limit, (page - 1) * limit]
        
        cur.execute(query, params_with_paging)
        products = cur.fetchall()
        cur.close()
        
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
        return {
            "products": products,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class ChatSearchRequest(BaseModel):
    query: str
    history: List[ChatMessage] = []

@app.post("/api/search/llm")
def llm_search(request: ChatSearchRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    # Build Gemini chat history format
    gemini_history = []
    for msg in request.history:
        gemini_history.append({
            "role": msg.role,
            "parts": [msg.content]
        })

    # System instruction: filter extraction
    system_prompt = """Sen bir online giyim mağazasının yapay zeka asistanısın. Kullanıcı sohbet geçmişini dikkate alarak ürün arama parametrelerini JSON formatında çıkar.

Çıkarılabilecek alanlar (sadece bahsedilenleri dahil et):
- category: "Tişörtler", "Gömlekler", "Pantolonlar", "Elbiseler", "Kotlar", "Spor Ayakkabılar", "Günlük Ayakkabılar", "Topuklu Ayakkabılar", "Sandaletler", "Üstler", "Şortlar", "El Çantaları", "Sırt Çantaları", "Saatler", "Güneş Gözlükleri"
- color: "Mavi", "Kırmızı", "Siyah", "Beyaz", "Yeşil", "Sarı", "Mor", "Pembe", "Bordo", "Haki", "Gri", "Bej", "Kahverengi", "Lacivert", "Turuncu", "Antrasit", "Krem"
- min_price: sayı (TL)
- max_price: sayı (TL)
- gender: "Erkek", "Kadın", "Unisex", "Çocuk Erkek", "Çocuk Kız"
- q: stil/ortam anahtar kelimeleri — veritabanındaki gerçek tag'leri kullan (aşağıya bak)

VERİTABANINDAKİ STYLE TAG'LERİ (q alanına bunları yaz):
casual, günlük, rahat, formal, resmi, şık, şık günlük, smart casual, spor, sporty, aktif, ethnic, geleneksel, seyahat, travel

YAŞAM TARZI → STYLE TAG EŞLEMESİ (kullanıcı bunları söylerse q'ya karşılık gelen tag'i ekle):
- "ofis", "iş", "toplantı", "profesyonel", "iş hayatı" → q: "formal resmi"
- "hafta sonu", "günlük", "rahat", "ev" → q: "casual günlük rahat"
- "akşam yemeği", "davet", "şık", "özel gün", "parti", "gece" → q: "şık resmi"
- "spor", "egzersiz", "koşu", "gym", "fitness", "antrenman" → q: "spor sporty aktif"
- "seyahat", "tatil", "yolculuk" → q: "seyahat travel casual"
- "plaj", "yaz", "deniz", "piknik" → q: "casual rahat"
- "düğün", "nikah", "mezuniyet" → q: "resmi şık formal"
- "okul", "üniversite", "kampüs" → q: "smart casual günlük"
- "doğa", "kamp", "yürüyüş" → q: "aktif spor rahat"

ÖNEMLİ KURALLAR:
1. Önceki mesajlardaki bağlamı koru. Kullanıcı "kırmızısı var mı?" diyorsa önceki category/filtreleri koru, sadece rengi güncelle.
2. Fiyat yorumu: "ucuz/bütçe dostu" → max_price: 200, "pahalı değil/uygun fiyatlı" → max_price: 300, "orta fiyatlı" → max_price: 500, "lüks/premium/kaliteli" → min_price: 500
3. Kullanıcı bir ortam/durum anlatıyorsa (ör. "ofiste", "spor yaparken") hem q'ya tag ekle hem de mantıklıysa category'yi de ayarla.
4. Kullanıcı cinsiyet belirtmemişse gender ekleme.

SADECE ham JSON döndür, açıklama veya markdown kullanma."""

    filter_prompt = f'Kullanıcı sorgusu: "{request.query}"\n\nJSON filtrelerini çıkar:'

    try:
        # Use multi-turn chat with history
        chat = model.start_chat(history=gemini_history)
        filter_response = chat.send_message(f"{system_prompt}\n\n{filter_prompt}")

        llm_text = filter_response.text.strip()
        if llm_text.startswith("```json"):
            llm_text = llm_text.split("```json")[1].split("```")[0].strip()
        elif llm_text.startswith("```"):
            llm_text = llm_text.split("```")[1].strip()

        filters = json.loads(llm_text)
        print("LLM Parsed Filters:", json.dumps(filters, ensure_ascii=True))

        # Build SQL query from filters
        cur = conn.cursor(cursor_factory=RealDictCursor)
        filter_conditions = ""
        params = []

        if filters.get("category"):
            filter_conditions += " AND category ILIKE %s"
            params.append(f"%{filters['category']}%")
        if filters.get("color"):
            filter_conditions += " AND color ILIKE %s"
            params.append(f"%{filters['color']}%")
        if filters.get("min_price") is not None:
            filter_conditions += " AND price >= %s"
            params.append(filters["min_price"])
        if filters.get("max_price") is not None:
            filter_conditions += " AND price <= %s"
            params.append(filters["max_price"])
        if filters.get("gender"):
            filter_conditions += " AND gender ILIKE %s"
            params.append(f"%{filters['gender']}%")
        if filters.get("q"):
            norm_q = normalize_turkish_term(filters["q"])
            filter_conditions += """ AND (
                TRANSLATE(LOWER(title), 'ıişğüçö', 'iisguco') LIKE %s OR
                TRANSLATE(LOWER(title_tr), 'ıişğüçö', 'iisguco') LIKE %s OR
                TRANSLATE(LOWER(description), 'ıişğüçö', 'iisguco') LIKE %s OR
                TRANSLATE(LOWER(array_to_string(style_tags, ' ')), 'ıişğüçö', 'iisguco') LIKE %s
            )"""
            params.extend([f"%{norm_q}%", f"%{norm_q}%", f"%{norm_q}%", f"%{norm_q}%"])

        # Count total
        count_q = "SELECT COUNT(*) FROM products WHERE 1=1" + filter_conditions
        cur.execute(count_q, params)
        total_count = cur.fetchone()["count"]

        # Fetch top 12 results
        data_q = "SELECT * FROM products WHERE 1=1" + filter_conditions + " ORDER BY id ASC LIMIT 12"
        cur.execute(data_q, params)
        products = cur.fetchall()
        cur.close()

        # Generate natural language summary — reuse the same chat session (no extra API call)
        product_names = [p["title"] for p in products[:5]]
        if product_names:
            names_str = ', '.join(product_names)
        else:
            names_str = 'Hiç ürün bulunamadı'
        summary_prompt = (
            f'Kullanıcı "{request.query}" diye sordu. '
            f'Veritabanimda {total_count} eslesme buldum. '
            f'Ilk urunler: {names_str}. '
            f'Kullaniciya kisaca Turkce samimi bir yani ver (2-3 cumle), '
            f'urün sayisini belirt, one cikan ozellikleri paylas. Emoji kullanabilirsin.'
        )
        try:
            summary_response = chat.send_message(summary_prompt)
            ai_summary = summary_response.text.strip()
        except Exception:
            # If rate-limited on summary, build a simple fallback
            if total_count > 0:
                ai_summary = f"{total_count} ürün bulundu! En iyi seçenekler listeleniyor. 🛍️"
            else:
                ai_summary = "Bu kriterlere uyan ürün bulunamadı. Farklı bir arama deneyebilirsiniz. 🔍"

        return {
            "products": products,
            "total_count": total_count,
            "parsed_filters": filters,
            "ai_summary": ai_summary,
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM yanıtı JSON formatında değil.")
    except Exception as e:
        print(f"Error in LLM chat search: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/images/{image_name}")
def get_image(image_name: str):
    image_path = os.path.join(os.path.dirname(__file__), "..", "data", "images", image_name)
    if os.path.exists(image_path):
        return FileResponse(image_path)
    # Return a 404 or a placeholder image if not found
    raise HTTPException(status_code=404, detail="Image not found")
