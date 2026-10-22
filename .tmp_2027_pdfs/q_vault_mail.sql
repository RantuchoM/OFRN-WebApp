select name from vault.decrypted_secrets
where name ilike '%gmail%' or name ilike '%mail%'
order by name;
