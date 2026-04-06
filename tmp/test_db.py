import sqlalchemy
from sqlalchemy import create_url
try:
    url = "postgresql://neondb_owner:npg_6p8sxjrGKimI@ep-super-thunder-an7cooh3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    engine = sqlalchemy.create_engine(url)
    with engine.connect() as conn:
        print("Successfully connected to the Neon database!")
except Exception as e:
    print(f"Failed to connect to the Neon database: {e}")
