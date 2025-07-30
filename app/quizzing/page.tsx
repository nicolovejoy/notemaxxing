"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Play, Check, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { useQuizzes, useQuizActions, useSyncState } from "@/lib/store/hooks";
import type { Quiz, QuizQuestion } from "@/lib/types";

export default function QuizzingPage() {
  // Use Zustand hooks
  const { quizzes, loading } = useQuizzes();
  const { createQuiz, updateQuiz, deleteQuiz } = useQuizActions();
  const { error, setSyncError } = useSyncState();

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  
  // Quiz mode states
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);

  const handleCreateQuiz = async () => {
    if (!newSubject.trim()) return;

    try {
      await createQuiz(newSubject, []);
      // The store will be updated with the new quiz, but we need to wait a moment
      setTimeout(() => {
        const newQuiz = quizzes.find(q => q.subject === newSubject);
        if (newQuiz) {
          setSelectedQuiz(newQuiz);
        }
      }, 100);
      setIsCreatingQuiz(false);
      setNewSubject("");
    } catch (error) {
      console.error('Failed to create quiz:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to create quiz');
    }
  };

  const addQuestion = async () => {
    if (!selectedQuiz || !newQuestion.trim() || !newAnswer.trim()) return;

    const question: QuizQuestion = {
      id: Date.now().toString(),
      question: newQuestion,
      answer: newAnswer
    };

    try {
      await updateQuiz(selectedQuiz.id, {
        questions: [...selectedQuiz.questions, question]
      });
      
      // Update selected quiz from the updated list
      const updatedQuiz = quizzes.find(q => q.id === selectedQuiz.id);
      if (updatedQuiz) {
        setSelectedQuiz({
          ...updatedQuiz,
          questions: [...selectedQuiz.questions, question]
        });
      }
      
      setIsAddingQuestion(false);
      setNewQuestion("");
      setNewAnswer("");
    } catch (error) {
      console.error('Failed to add question:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to add question');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!selectedQuiz) return;

    try {
      const updatedQuestions = selectedQuiz.questions.filter(q => q.id !== questionId);
      await updateQuiz(selectedQuiz.id, {
        questions: updatedQuestions
      });
      
      // Update selected quiz from the updated list
      const updatedQuiz = quizzes.find(q => q.id === selectedQuiz.id);
      if (updatedQuiz) {
        setSelectedQuiz({
          ...updatedQuiz,
          questions: updatedQuestions
        });
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to delete question');
    }
  };

  const startQuiz = () => {
    if (!selectedQuiz || selectedQuiz.questions.length === 0) return;
    setIsQuizMode(true);
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
    setScore(0);
  };

  const nextQuestion = (correct: boolean) => {
    if (correct) setScore(score + 1);
    
    if (currentQuestionIndex < selectedQuiz!.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
    } else {
      // Quiz complete
      setIsQuizMode(false);
    }
  };

  const currentQuestion = selectedQuiz?.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="p-2 rounded-md hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Link>
              <div className="flex items-center gap-3 ml-4">
                <Logo size={36} />
                <h1 className="text-xl font-semibold italic">Quizzing</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => setSyncError(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Subjects */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium italic">Subjects</h2>
            <button
              onClick={() => setIsCreatingQuiz(true)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <Plus className="h-5 w-5 text-gray-800" />
            </button>
          </div>

          {isCreatingQuiz && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Subject name..."
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-gray-900 placeholder-gray-600"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateQuiz}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreatingQuiz(false);
                    setNewSubject("");
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : (
              quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => setSelectedQuiz(quiz)}
                  className={`w-full text-left p-3 rounded-lg hover:bg-gray-100 ${
                    selectedQuiz?.id === quiz.id ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="font-medium">{quiz.subject}</div>
                  <div className="text-sm text-gray-700 font-medium">
                    {quiz.questions.length} questions
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {selectedQuiz && !isQuizMode ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">{selectedQuiz.subject}</h2>
                <div className="flex items-center gap-2">
                  {selectedQuiz.questions.length > 0 && (
                    <button
                      onClick={startQuiz}
                      className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Quiz
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete the quiz "${selectedQuiz.subject}"?`)) {
                        try {
                          await deleteQuiz(selectedQuiz.id);
                          setSelectedQuiz(null);
                        } catch (error) {
                          console.error('Failed to delete quiz:', error);
                          setSyncError(error instanceof Error ? error.message : 'Failed to delete quiz');
                        }
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <button
                  onClick={() => setIsAddingQuestion(true)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </button>
              </div>

              {isAddingQuestion && (
                <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                  <input
                    type="text"
                    placeholder="Question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 text-gray-900 placeholder-gray-600"
                  />
                  <textarea
                    placeholder="Answer..."
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 h-24 text-gray-900 placeholder-gray-600"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addQuestion}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setNewQuestion("");
                        setNewAnswer("");
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {selectedQuiz.questions.map((q, index) => (
                  <div key={q.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium mb-2">
                          {index + 1}. {q.question}
                        </p>
                        <p className="text-gray-800">{q.answer}</p>
                      </div>
                      <button
                        onClick={() => q.id && deleteQuestion(q.id)}
                        className="ml-4 p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isQuizMode && currentQuestion ? (
            <div className="max-w-2xl mx-auto">
              <div className="mb-4 text-sm text-gray-800 font-medium">
                Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}
              </div>
              
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <h3 className="text-xl font-medium mb-6">{currentQuestion.question}</h3>
                
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Show Answer
                  </button>
                ) : (
                  <div>
                    <div className="p-4 bg-gray-50 rounded-lg mb-6">
                      <p className="text-gray-900">{currentQuestion.answer}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <button
                        onClick={() => nextQuestion(true)}
                        className="flex-1 flex items-center justify-center py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Correct
                      </button>
                      <button
                        onClick={() => nextQuestion(false)}
                        className="flex-1 flex items-center justify-center py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Incorrect
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {!isQuizMode && (
                <div className="mt-8 text-center">
                  <h3 className="text-2xl font-semibold mb-2">Quiz Complete!</h3>
                  <p className="text-gray-800">
                    You scored {score} out of {selectedQuiz.questions.length}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a subject to get started
                </h3>
                <p className="text-gray-700">
                  Choose or create a subject to begin creating quiz questions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}