# Data Architecture

## Database Schema

See `/lib/supabase/schema.sql` for complete PostgreSQL schema.

### Tables
1. **folders** - User's folders with custom names/colors
2. **notebooks** - Notebooks within folders, supports archiving
3. **notes** - Individual notes with auto-save
4. **quizzes** - Quiz subjects with JSON questions

### Security
- Row Level Security (RLS) on all tables
- Users only see their own data: `auth.uid() = user_id`
- Automatic updated_at timestamps

### Relationships
```
Users → Folders → Notebooks → Notes
Users → Quizzes
```