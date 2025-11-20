from supabase_client import supabase

def main():
    # intenta leer la tabla users
    response = supabase.table("users").select("*").execute()
    print("data:", response.data)

if __name__ == "__main__":
    main()
