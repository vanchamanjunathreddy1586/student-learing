from supabase import Client, create_client
from config import Config

def get_supabase_client(config: Config | None = None) -> Client | None:
    settings = config or Config()
    if not settings.supabase_configured:
        return None
    return create_client(settings.supabase_url, settings.supabase_publishable_key)