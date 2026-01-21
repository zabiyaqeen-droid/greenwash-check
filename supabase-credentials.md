# Supabase Credentials for Greenwash Check

## Environment Variables to Add to Render

```
SUPABASE_URL=https://wpkccelykmppwzbcrgkf.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable__B17V9QhKxDScVa61i7Btw_lS5AT8zg
SUPABASE_SECRET_KEY=sb_secret_epCkPqvA8ntGjr9_4_oVXQ_4zvq4jb0
```

## Database Tables Created

1. **document_chunks** - For storing document embeddings (vector DB)
2. **assessment_prompts** - For storing customizable prompts per subcategory
3. **assessment_results** - For storing assessment history

## Note
Do not commit this file to version control!
