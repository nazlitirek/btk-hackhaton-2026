import psycopg2

try:
    conn = psycopg2.connect(
        dbname="marketplace_db",
        user="postgres",
        password="1234",
        host="localhost",
        port=5432
    )

    print("Bağlantı başarılı!")
    conn.close()

except Exception as e:
    print("Hata:")
    print(e)