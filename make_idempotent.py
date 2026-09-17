import re

with open('migration_019_run_this.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Regex to match CREATE POLICY "policy name" ON public.table_name
pattern = r'CREATE POLICY ("[^"]+") ON (public\.[a-zA-Z0-9_]+)'

def replace_func(match):
    policy_name = match.group(1)
    table_name = match.group(2)
    return f'DROP POLICY IF EXISTS {policy_name} ON {table_name};\nCREATE POLICY {policy_name} ON {table_name}'

new_sql = re.sub(pattern, replace_func, sql)

with open('migration_019_run_this.sql', 'w', encoding='utf-8') as f:
    f.write(new_sql)
print("Updated migration_019_run_this.sql to be idempotent.")
