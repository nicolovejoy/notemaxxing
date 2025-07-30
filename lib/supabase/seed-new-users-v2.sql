-- Function to create starter content for new users (v2 - matching UI design)
CREATE OR REPLACE FUNCTION create_starter_content_for_user()
RETURNS TRIGGER AS $$
DECLARE
  start_maxxing_folder_id UUID;
  fall_quarter_folder_id UUID;
  folder_tutorial_notebook_id UUID;
  typemaxxing_tutorial_notebook_id UUID;
  quizzing_tutorial_notebook_id UUID;
  chemistry_notebook_id UUID;
  neuro_notebook_id UUID;
  calculus_notebook_id UUID;
  culture_notebook_id UUID;
BEGIN
  -- Create "Start maxxing your notes" folder (yellow/orange)
  INSERT INTO folders (user_id, name, color)
  VALUES (NEW.id, 'Start maxxing your notes', 'bg-yellow-500')
  RETURNING id INTO start_maxxing_folder_id;

  -- Create "Fall Quarter (example)" folder (purple)
  INSERT INTO folders (user_id, name, color)
  VALUES (NEW.id, 'Fall Quarter (example)', 'bg-purple-500')
  RETURNING id INTO fall_quarter_folder_id;

  -- Create tutorial notebooks in "Start maxxing your notes" folder
  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, start_maxxing_folder_id, 'Folder & Notebook Tutorial', 'bg-cyan-200', false)
  RETURNING id INTO folder_tutorial_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, start_maxxing_folder_id, 'Typemaxxing Tutorial', 'bg-cyan-200', false)
  RETURNING id INTO typemaxxing_tutorial_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, start_maxxing_folder_id, 'Quizzing Tutorial', 'bg-purple-200', false)
  RETURNING id INTO quizzing_tutorial_notebook_id;

  -- Create example notebooks in "Fall Quarter (example)" folder
  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, fall_quarter_folder_id, 'Chemistry', 'bg-purple-200', false)
  RETURNING id INTO chemistry_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, fall_quarter_folder_id, 'Intro to neuro', 'bg-pink-200', false)
  RETURNING id INTO neuro_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, fall_quarter_folder_id, 'Calculus II', 'bg-yellow-200', false)
  RETURNING id INTO calculus_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (NEW.id, fall_quarter_folder_id, 'Culture & Ideas', 'bg-yellow-200', false)
  RETURNING id INTO culture_notebook_id;

  -- Create tutorial notes for Folder & Notebook Tutorial
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (NEW.id, folder_tutorial_notebook_id, 'Welcome to Notemaxxing!', 
'# Welcome to Notemaxxing! 🎉

Notemaxxing is your personal space for organizing thoughts, taking notes, and improving your typing skills. This tutorial will help you get started with folders and notebooks.

## What are Folders?
Folders are the top-level organization in Notemaxxing. Use them to group related notebooks by:
- Subject area (e.g., "Fall Quarter", "Work Projects")
- Time period (e.g., "2025 Goals", "Summer Internship")
- Purpose (e.g., "Personal", "Research", "Creative Writing")

## What are Notebooks?
Notebooks live inside folders and contain your actual notes. Think of them as:
- Individual courses in a semester folder
- Different projects in a work folder
- Topics within a subject area

Ready to start? Check out the next note to learn how to create your first folder!'),

  (NEW.id, folder_tutorial_notebook_id, 'Creating Your First Folder', 
'# Creating Your First Folder

Follow these simple steps to create a folder:

## Step 1: Navigate to Folders
Click on "Folders" in the navigation or go to the folders page.

## Step 2: Click "New Folder"
Look for the blue "New Folder" button in the top right corner.

## Step 3: Customize Your Folder
1. **Name it**: Choose something descriptive like "Spring 2025" or "Personal Projects"
2. **Pick a color**: Select from our color palette to make it visually distinct
3. **Click Create**: Your folder will appear instantly!

## Pro Tips
- Use different colors for different types of content
- Keep folder names short but descriptive
- You can always rename folders later by clicking on them

Next, learn how to add notebooks to your folders!'),

  (NEW.id, folder_tutorial_notebook_id, 'Adding Notebooks to Folders', 
'# Adding Notebooks to Folders

Now that you have a folder, let''s add some notebooks!

## How to Add a Notebook
1. **Open a folder** by clicking on it
2. **Click the "+" button** next to "Notebooks"
3. **Name your notebook** (e.g., "Biology 101", "Meeting Notes")
4. **Choose a color** that complements your folder
5. **Click Create**

## Organizing Your Notebooks
- Use different colors within a folder for visual organization
- Group similar topics together
- Archive old notebooks instead of deleting them

## What''s Next?
- Start adding notes to your notebooks
- Try our Typemaxxing feature to improve your typing
- Create quizzes to test your knowledge

Happy note-taking! 📝');

  -- Create tutorial notes for Typemaxxing Tutorial
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (NEW.id, typemaxxing_tutorial_notebook_id, 'Introduction to Typemaxxing', 
'# Introduction to Typemaxxing 

Typemaxxing is our built-in typing practice tool designed to help you improve your typing speed and accuracy.

## Why Typemaxxing?
- **Improve typing speed**: Track your WPM (Words Per Minute)
- **Increase accuracy**: Monitor your typing precision
- **Build muscle memory**: Practice common word patterns
- **Save time**: Type faster = take notes faster!

## Key Features
- Real-time WPM tracking
- Accuracy percentage
- Visual keyboard display
- Various difficulty levels
- Progress tracking over time

Ready to start improving your typing? Let''s dive in!'),

  (NEW.id, typemaxxing_tutorial_notebook_id, 'Getting Started with Typing Practice', 
'# Getting Started with Typing Practice

## How to Access Typemaxxing
1. Click on "Typemaxxing" in the main navigation
2. You''ll see the practice interface with:
   - Text to type at the top
   - Your input field below
   - Live stats (WPM and Accuracy)
   - Visual keyboard at the bottom

## Your First Session
1. **Read the text** displayed at the top
2. **Start typing** in the input field
3. **Watch your stats** update in real-time
4. **Complete the passage** to see your final score

## Tips for Improvement
- Focus on accuracy first, speed will follow
- Keep your fingers on the home row (ASDF - JKL;)
- Look at the screen, not the keyboard
- Practice daily for best results
- Start with shorter sessions (5-10 minutes)'),

  (NEW.id, typemaxxing_tutorial_notebook_id, 'Advanced Typing Tips', 
'# Advanced Typing Tips

## Proper Typing Posture
- Sit up straight with feet flat on floor
- Keep wrists straight and floating
- Position screen at eye level
- Relax your shoulders

## Common Mistakes to Avoid
1. **Hunting and pecking**: Learn touch typing instead
2. **Looking at keyboard**: Train yourself to look at screen
3. **Using wrong fingers**: Each key has a designated finger
4. **Typing too fast too soon**: Build accuracy first

## Practice Strategies
- **Daily practice**: Even 5 minutes helps
- **Focus on weak keys**: Practice problem letters
- **Use all fingers**: Don''t rely on just a few
- **Take breaks**: Prevent fatigue and strain

## Track Your Progress
- Note your starting WPM and accuracy
- Set realistic goals (e.g., +5 WPM per month)
- Celebrate improvements!
- Remember: Consistency > Intensity');

  -- Create tutorial notes for Quizzing Tutorial
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (NEW.id, quizzing_tutorial_notebook_id, 'Welcome to Quizzing', 
'# Welcome to Quizzing

The Quizzing feature helps you retain information by testing your knowledge. Create custom quizzes from your notes!

## Benefits of Quizzing
- **Active recall**: Strengthen memory through testing
- **Identify gaps**: Find what you need to review
- **Track progress**: See improvement over time
- **Exam prep**: Perfect for studying

## How It Works
1. Create quiz subjects (e.g., "Biology Chapter 1")
2. Add questions and answers
3. Take the quiz in practice mode
4. Review your results
5. Retake to improve!

Let''s create your first quiz!'),

  (NEW.id, quizzing_tutorial_notebook_id, 'Creating Your First Quiz', 
'# Creating Your First Quiz

## Step-by-Step Guide

### 1. Navigate to Quizzing
Click "Quizzing" in the main menu

### 2. Create a New Subject
- Click "Create Quiz"
- Enter a subject name (e.g., "Spanish Vocabulary")
- Click Create

### 3. Add Questions
- Click "Add Question"
- Type your question
- Type the answer
- Click Save
- Repeat for more questions

### 4. Best Practices
- Start with 5-10 questions
- Make questions specific
- Keep answers concise
- Mix difficulty levels

## Example Questions
- Q: "What is the capital of France?" A: "Paris"
- Q: "Define photosynthesis" A: "Process by which plants convert light into energy"
- Q: "2 + 2 = ?" A: "4"

Ready to practice? Take your quiz!'),

  (NEW.id, quizzing_tutorial_notebook_id, 'Effective Quiz Strategies', 
'# Effective Quiz Strategies

## Creating Better Questions

### Use Different Question Types
1. **Definition**: "What is X?"
2. **Application**: "How would you use X?"
3. **Comparison**: "How does X differ from Y?"
4. **Example**: "Give an example of X"

### Make Questions from Notes
- Review your notes after each study session
- Turn key concepts into questions
- Focus on information you struggle with
- Create questions while material is fresh

## Study Techniques
1. **Spaced repetition**: Review at increasing intervals
2. **Active testing**: Quiz before you feel ready
3. **Mixed practice**: Combine topics in one session
4. **Explain answers**: Say why an answer is correct

## Track Your Learning
- Note which questions you miss
- Review those topics in your notes
- Retake quizzes periodically
- Aim for 100% accuracy before exams!');

  -- Add sample content to example course notebooks
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (NEW.id, chemistry_notebook_id, 'Chapter 1: Atomic Structure', 
'# Chapter 1: Atomic Structure

## Key Concepts
- Atoms are the basic units of matter
- Composed of protons, neutrons, and electrons
- Atomic number = number of protons
- Mass number = protons + neutrons

## Important Points
1. Protons: positive charge, in nucleus
2. Neutrons: no charge, in nucleus  
3. Electrons: negative charge, orbit nucleus

## For Quiz:
- What determines an element''s identity? (Atomic number)
- Where are electrons located? (Electron shells/orbitals)
- What is an isotope? (Same element, different neutrons)'),

  (NEW.id, neuro_notebook_id, 'Lecture 1: Introduction to Neuroscience', 
'# Lecture 1: Introduction to Neuroscience

## What is Neuroscience?
The scientific study of the nervous system, including:
- Brain structure and function
- Neural networks
- Behavior and cognition
- Neurological disorders

## Major Topics This Quarter
1. Neuroanatomy
2. Neural signaling
3. Sensory systems
4. Motor control
5. Learning and memory

## Key Terms
- **Neuron**: Basic functional unit of nervous system
- **Synapse**: Junction between neurons
- **Neurotransmitter**: Chemical messengers
- **Action potential**: Electrical signal in neurons

Remember to review lecture slides!'),

  (NEW.id, calculus_notebook_id, 'Derivatives Review', 
'# Derivatives Review

## Definition
The derivative of f(x) represents the instantaneous rate of change.

## Basic Rules
1. Power Rule: d/dx(x^n) = nx^(n-1)
2. Product Rule: d/dx(uv) = u''v + uv''
3. Chain Rule: d/dx(f(g(x))) = f''(g(x)) * g''(x)

## Common Derivatives
- d/dx(sin x) = cos x
- d/dx(cos x) = -sin x
- d/dx(e^x) = e^x
- d/dx(ln x) = 1/x

## Practice Problems
1. Find d/dx(x^3 + 2x^2 - 5x + 1)
2. Find d/dx(x * sin x)
3. Find d/dx(e^(2x))

Check solutions in textbook p. 45'),

  (NEW.id, culture_notebook_id, 'Essay 1: Cultural Identity', 
'# Essay 1: Cultural Identity

## Assignment
Write a 5-page essay exploring how cultural identity is formed and expressed in contemporary society.

## Main Points to Address
1. Definition of cultural identity
2. Factors that shape identity
3. Expression through art, language, customs
4. Globalization''s impact
5. Personal reflection

## Research Sources
- Hall, Stuart. "Cultural Identity and Diaspora"
- Anderson, Benedict. "Imagined Communities"
- Said, Edward. "Orientalism"

## Due Date: October 15th

## Outline
I. Introduction - define cultural identity
II. Historical perspective
III. Modern influences
IV. Case studies
V. Conclusion - future of cultural identity');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run after new user registration
DROP TRIGGER IF EXISTS create_starter_content_on_signup ON auth.users;
CREATE TRIGGER create_starter_content_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_starter_content_for_user();

-- Admin function to manually seed a specific user
CREATE OR REPLACE FUNCTION create_starter_content_for_specific_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  start_maxxing_folder_id UUID;
  fall_quarter_folder_id UUID;
  folder_tutorial_notebook_id UUID;
  typemaxxing_tutorial_notebook_id UUID;
  quizzing_tutorial_notebook_id UUID;
  chemistry_notebook_id UUID;
  neuro_notebook_id UUID;
  calculus_notebook_id UUID;
  culture_notebook_id UUID;
BEGIN
  -- Check if user already has folders
  IF EXISTS (SELECT 1 FROM folders WHERE user_id = target_user_id) THEN
    RAISE NOTICE 'User already has folders, skipping seed data';
    RETURN;
  END IF;

  -- Create "Start maxxing your notes" folder (yellow/orange)
  INSERT INTO folders (user_id, name, color)
  VALUES (target_user_id, 'Start maxxing your notes', 'bg-yellow-500')
  RETURNING id INTO start_maxxing_folder_id;

  -- Create "Fall Quarter (example)" folder (purple)
  INSERT INTO folders (user_id, name, color)
  VALUES (target_user_id, 'Fall Quarter (example)', 'bg-purple-500')
  RETURNING id INTO fall_quarter_folder_id;

  -- Create tutorial notebooks in "Start maxxing your notes" folder
  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, start_maxxing_folder_id, 'Folder & Notebook Tutorial', 'bg-cyan-200', false)
  RETURNING id INTO folder_tutorial_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, start_maxxing_folder_id, 'Typemaxxing Tutorial', 'bg-cyan-200', false)
  RETURNING id INTO typemaxxing_tutorial_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, start_maxxing_folder_id, 'Quizzing Tutorial', 'bg-purple-200', false)
  RETURNING id INTO quizzing_tutorial_notebook_id;

  -- Create example notebooks in "Fall Quarter (example)" folder
  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, fall_quarter_folder_id, 'Chemistry', 'bg-purple-200', false)
  RETURNING id INTO chemistry_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, fall_quarter_folder_id, 'Intro to neuro', 'bg-pink-200', false)
  RETURNING id INTO neuro_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, fall_quarter_folder_id, 'Calculus II', 'bg-yellow-200', false)
  RETURNING id INTO calculus_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, fall_quarter_folder_id, 'Culture & Ideas', 'bg-yellow-200', false)
  RETURNING id INTO culture_notebook_id;

  -- Create tutorial notes for Folder & Notebook Tutorial
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, folder_tutorial_notebook_id, 'Welcome to Notemaxxing!', 
'# Welcome to Notemaxxing! 🎉

Notemaxxing is your personal space for organizing thoughts, taking notes, and improving your typing skills. This tutorial will help you get started with folders and notebooks.

## What are Folders?
Folders are the top-level organization in Notemaxxing. Use them to group related notebooks by:
- Subject area (e.g., "Fall Quarter", "Work Projects")
- Time period (e.g., "2025 Goals", "Summer Internship")
- Purpose (e.g., "Personal", "Research", "Creative Writing")

## What are Notebooks?
Notebooks live inside folders and contain your actual notes. Think of them as:
- Individual courses in a semester folder
- Different projects in a work folder
- Topics within a subject area

Ready to start? Check out the next note to learn how to create your first folder!'),

  (target_user_id, folder_tutorial_notebook_id, 'Creating Your First Folder', 
'# Creating Your First Folder

Follow these simple steps to create a folder:

## Step 1: Navigate to Folders
Click on "Folders" in the navigation or go to the folders page.

## Step 2: Click "New Folder"
Look for the blue "New Folder" button in the top right corner.

## Step 3: Customize Your Folder
1. **Name it**: Choose something descriptive like "Spring 2025" or "Personal Projects"
2. **Pick a color**: Select from our color palette to make it visually distinct
3. **Click Create**: Your folder will appear instantly!

## Pro Tips
- Use different colors for different types of content
- Keep folder names short but descriptive
- You can always rename folders later by clicking on them

Next, learn how to add notebooks to your folders!'),

  (target_user_id, folder_tutorial_notebook_id, 'Adding Notebooks to Folders', 
'# Adding Notebooks to Folders

Now that you have a folder, let''s add some notebooks!

## How to Add a Notebook
1. **Open a folder** by clicking on it
2. **Click the "+" button** next to "Notebooks"
3. **Name your notebook** (e.g., "Biology 101", "Meeting Notes")
4. **Choose a color** that complements your folder
5. **Click Create**

## Organizing Your Notebooks
- Use different colors within a folder for visual organization
- Group similar topics together
- Archive old notebooks instead of deleting them

## What''s Next?
- Start adding notes to your notebooks
- Try our Typemaxxing feature to improve your typing
- Create quizzes to test your knowledge

Happy note-taking! 📝');

  -- Create tutorial notes for Typemaxxing Tutorial
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, typemaxxing_tutorial_notebook_id, 'Introduction to Typemaxxing', 
'# Introduction to Typemaxxing 

Typemaxxing is our built-in typing practice tool designed to help you improve your typing speed and accuracy.

## Why Typemaxxing?
- **Improve typing speed**: Track your WPM (Words Per Minute)
- **Increase accuracy**: Monitor your typing precision
- **Build muscle memory**: Practice common word patterns
- **Save time**: Type faster = take notes faster!

## Key Features
- Real-time WPM tracking
- Accuracy percentage
- Visual keyboard display
- Various difficulty levels
- Progress tracking over time

Ready to start improving your typing? Let''s dive in!'),

  (target_user_id, typemaxxing_tutorial_notebook_id, 'Getting Started with Typing Practice', 
'# Getting Started with Typing Practice

## How to Access Typemaxxing
1. Click on "Typemaxxing" in the main navigation
2. You''ll see the practice interface with:
   - Text to type at the top
   - Your input field below
   - Live stats (WPM and Accuracy)
   - Visual keyboard at the bottom

## Your First Session
1. **Read the text** displayed at the top
2. **Start typing** in the input field
3. **Watch your stats** update in real-time
4. **Complete the passage** to see your final score

## Tips for Improvement
- Focus on accuracy first, speed will follow
- Keep your fingers on the home row (ASDF - JKL;)
- Look at the screen, not the keyboard
- Practice daily for best results
- Start with shorter sessions (5-10 minutes)'),

  (target_user_id, typemaxxing_tutorial_notebook_id, 'Advanced Typing Tips', 
'# Advanced Typing Tips

## Proper Typing Posture
- Sit up straight with feet flat on floor
- Keep wrists straight and floating
- Position screen at eye level
- Relax your shoulders

## Common Mistakes to Avoid
1. **Hunting and pecking**: Learn touch typing instead
2. **Looking at keyboard**: Train yourself to look at screen
3. **Using wrong fingers**: Each key has a designated finger
4. **Typing too fast too soon**: Build accuracy first

## Practice Strategies
- **Daily practice**: Even 5 minutes helps
- **Focus on weak keys**: Practice problem letters
- **Use all fingers**: Don''t rely on just a few
- **Take breaks**: Prevent fatigue and strain

## Track Your Progress
- Note your starting WPM and accuracy
- Set realistic goals (e.g., +5 WPM per month)
- Celebrate improvements!
- Remember: Consistency > Intensity');

  -- Create tutorial notes for Quizzing Tutorial
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, quizzing_tutorial_notebook_id, 'Welcome to Quizzing', 
'# Welcome to Quizzing

The Quizzing feature helps you retain information by testing your knowledge. Create custom quizzes from your notes!

## Benefits of Quizzing
- **Active recall**: Strengthen memory through testing
- **Identify gaps**: Find what you need to review
- **Track progress**: See improvement over time
- **Exam prep**: Perfect for studying

## How It Works
1. Create quiz subjects (e.g., "Biology Chapter 1")
2. Add questions and answers
3. Take the quiz in practice mode
4. Review your results
5. Retake to improve!

Let''s create your first quiz!'),

  (target_user_id, quizzing_tutorial_notebook_id, 'Creating Your First Quiz', 
'# Creating Your First Quiz

## Step-by-Step Guide

### 1. Navigate to Quizzing
Click "Quizzing" in the main menu

### 2. Create a New Subject
- Click "Create Quiz"
- Enter a subject name (e.g., "Spanish Vocabulary")
- Click Create

### 3. Add Questions
- Click "Add Question"
- Type your question
- Type the answer
- Click Save
- Repeat for more questions

### 4. Best Practices
- Start with 5-10 questions
- Make questions specific
- Keep answers concise
- Mix difficulty levels

## Example Questions
- Q: "What is the capital of France?" A: "Paris"
- Q: "Define photosynthesis" A: "Process by which plants convert light into energy"
- Q: "2 + 2 = ?" A: "4"

Ready to practice? Take your quiz!'),

  (target_user_id, quizzing_tutorial_notebook_id, 'Effective Quiz Strategies', 
'# Effective Quiz Strategies

## Creating Better Questions

### Use Different Question Types
1. **Definition**: "What is X?"
2. **Application**: "How would you use X?"
3. **Comparison**: "How does X differ from Y?"
4. **Example**: "Give an example of X"

### Make Questions from Notes
- Review your notes after each study session
- Turn key concepts into questions
- Focus on information you struggle with
- Create questions while material is fresh

## Study Techniques
1. **Spaced repetition**: Review at increasing intervals
2. **Active testing**: Quiz before you feel ready
3. **Mixed practice**: Combine topics in one session
4. **Explain answers**: Say why an answer is correct

## Track Your Learning
- Note which questions you miss
- Review those topics in your notes
- Retake quizzes periodically
- Aim for 100% accuracy before exams!');

  -- Add sample content to example course notebooks
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, chemistry_notebook_id, 'Chapter 1: Atomic Structure', 
'# Chapter 1: Atomic Structure

## Key Concepts
- Atoms are the basic units of matter
- Composed of protons, neutrons, and electrons
- Atomic number = number of protons
- Mass number = protons + neutrons

## Important Points
1. Protons: positive charge, in nucleus
2. Neutrons: no charge, in nucleus  
3. Electrons: negative charge, orbit nucleus

## For Quiz:
- What determines an element''s identity? (Atomic number)
- Where are electrons located? (Electron shells/orbitals)
- What is an isotope? (Same element, different neutrons)'),

  (target_user_id, neuro_notebook_id, 'Lecture 1: Introduction to Neuroscience', 
'# Lecture 1: Introduction to Neuroscience

## What is Neuroscience?
The scientific study of the nervous system, including:
- Brain structure and function
- Neural networks
- Behavior and cognition
- Neurological disorders

## Major Topics This Quarter
1. Neuroanatomy
2. Neural signaling
3. Sensory systems
4. Motor control
5. Learning and memory

## Key Terms
- **Neuron**: Basic functional unit of nervous system
- **Synapse**: Junction between neurons
- **Neurotransmitter**: Chemical messengers
- **Action potential**: Electrical signal in neurons

Remember to review lecture slides!'),

  (target_user_id, calculus_notebook_id, 'Derivatives Review', 
'# Derivatives Review

## Definition
The derivative of f(x) represents the instantaneous rate of change.

## Basic Rules
1. Power Rule: d/dx(x^n) = nx^(n-1)
2. Product Rule: d/dx(uv) = u''v + uv''
3. Chain Rule: d/dx(f(g(x))) = f''(g(x)) * g''(x)

## Common Derivatives
- d/dx(sin x) = cos x
- d/dx(cos x) = -sin x
- d/dx(e^x) = e^x
- d/dx(ln x) = 1/x

## Practice Problems
1. Find d/dx(x^3 + 2x^2 - 5x + 1)
2. Find d/dx(x * sin x)
3. Find d/dx(e^(2x))

Check solutions in textbook p. 45'),

  (target_user_id, culture_notebook_id, 'Essay 1: Cultural Identity', 
'# Essay 1: Cultural Identity

## Assignment
Write a 5-page essay exploring how cultural identity is formed and expressed in contemporary society.

## Main Points to Address
1. Definition of cultural identity
2. Factors that shape identity
3. Expression through art, language, customs
4. Globalization''s impact
5. Personal reflection

## Research Sources
- Hall, Stuart. "Cultural Identity and Diaspora"
- Anderson, Benedict. "Imagined Communities"
- Said, Edward. "Orientalism"

## Due Date: October 15th

## Outline
I. Introduction - define cultural identity
II. Historical perspective
III. Modern influences
IV. Case studies
V. Conclusion - future of cultural identity');

END;
$$ LANGUAGE plpgsql;