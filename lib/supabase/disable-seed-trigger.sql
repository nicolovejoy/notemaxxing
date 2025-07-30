-- Temporarily disable the seed data trigger to allow signups
DROP TRIGGER IF EXISTS create_starter_content_on_signup ON auth.users;

-- You can re-enable it later by running seed-new-users-v3.sql