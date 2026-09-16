-- Fix for Diary (missing columns)
ALTER TABLE IF EXISTS student_diaries 
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- KNOWLEDGE VAULT TABLES
CREATE TABLE IF NOT EXISTS knowledge_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  subject TEXT,
  folder TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS knowledge_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_note_id UUID REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  target_note_id UUID REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(source_note_id, target_note_id)
);

CREATE TABLE IF NOT EXISTS knowledge_flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  mastered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS POLICIES
ALTER TABLE knowledge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own knowledge notes" ON knowledge_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own knowledge notes" ON knowledge_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own knowledge notes" ON knowledge_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own knowledge notes" ON knowledge_notes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own knowledge links" ON knowledge_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own knowledge links" ON knowledge_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own knowledge links" ON knowledge_links FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own flashcards" ON knowledge_flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own flashcards" ON knowledge_flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own flashcards" ON knowledge_flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own flashcards" ON knowledge_flashcards FOR DELETE USING (auth.uid() = user_id);
