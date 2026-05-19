import json
import psycopg2
from psycopg2.extras import execute_values
import os



# Script'in bulunduğu klasör
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# JSON dosya yolu
json_path = os.path.join(BASE_DIR, 'products_data.json')

# JSON'dan veriyi yükle
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
    products = data['products']

# Database'e bağlan
conn = psycopg2.connect(
    dbname='marketplace_db',
    user='postgres',
    password='1234',
    host='localhost',
    port='5432'
)
cur = conn.cursor()

# Tabloyu oluştur
cur.execute('''
    DROP TABLE IF EXISTS products;

    CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        title_tr TEXT,
        description TEXT,
        price DECIMAL(10, 2),
        category TEXT,
        color TEXT,
        sizes TEXT[],
        brand TEXT,
        style_tags TEXT[],
        condition TEXT,
        gender TEXT,
        image_path TEXT
    );
''')

print("✅ Tablo oluşturuldu!")

# Veriyi ekle
insert_query = '''
    INSERT INTO products 
    (id, title, title_tr, description, price, category, color, sizes, brand, style_tags, condition, gender, image_path)
    VALUES %s
'''

values = [
    (
        p['id'],
        p['title'],
        p['title_tr'],
        p['description'],
        p['price'],
        p['category'],
        p['color'],
        p['sizes'],
        p['brand'],
        p['style_tags'],
        p['condition'],
        p['gender'],
        p['image_path']
    )
    for p in products
]

execute_values(cur, insert_query, values)

conn.commit()

print(f"✅ {len(products)} ürün eklendi!")

cur.execute("SELECT COUNT(*) FROM products;")
row = cur.fetchone()
count = row[0] if row is not None else 0
print(f"📊 Toplam veritabanında: {count} ürün")

cur.close()
conn.close()

print("\n🎉 Database hazır!")