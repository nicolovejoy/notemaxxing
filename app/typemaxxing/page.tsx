"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Timer, RotateCcw } from "lucide-react";

export default function TypingPage() {
  const [text] = useState(
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice."
  );
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (userInput.length === text.length && !isComplete) {
      setEndTime(Date.now());
      setIsComplete(true);
    }
  }, [userInput, text, isComplete]);

  const handleInputChange = (value: string) => {
    if (!startTime && value.length > 0) {
      setStartTime(Date.now());
    }

    if (value.length <= text.length) {
      setUserInput(value);

      // Count errors
      let errorCount = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== text[i]) {
          errorCount++;
        }
      }
      setErrors(errorCount);
    }
  };

  const calculateWPM = () => {
    if (!startTime || !endTime) return 0;
    const minutes = (endTime - startTime) / 60000;
    const words = text.split(" ").length;
    return Math.round(words / minutes);
  };

  const reset = () => {
    setUserInput("");
    setStartTime(null);
    setEndTime(null);
    setErrors(0);
    setIsComplete(false);
  };

  const accuracy = userInput.length > 0 ? Math.round(((userInput.length - errors) / userInput.length) * 100) : 100;

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
              <h1 className="ml-4 text-xl font-semibold italic">Typemaxxing</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light italic mb-2">Typing Practice</h2>
          <p className="text-gray-800">Improve your typing speed and accuracy</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 text-center">
            <Timer className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-semibold">{isComplete ? calculateWPM() : "0"}</p>
            <p className="text-sm text-gray-800 font-medium">WPM</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold">{accuracy}%</p>
            <p className="text-sm text-gray-800 font-medium">Accuracy</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold">{errors}</p>
            <p className="text-sm text-gray-800 font-medium">Errors</p>
          </div>
        </div>

        {/* Typing Area */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-lg leading-relaxed font-mono">
              {text.split("").map((char, index) => {
                let className = "text-gray-800";
                if (index < userInput.length) {
                  className = userInput[index] === char ? "text-green-600" : "text-red-600 bg-red-100";
                } else if (index === userInput.length) {
                  className = "bg-blue-100";
                }
                return (
                  <span key={index} className={className}>
                    {char}
                  </span>
                );
              })}
            </p>
          </div>

          <textarea
            value={userInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Start typing..."
            disabled={isComplete}
            className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg font-mono resize-none focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-600"
          />

          {isComplete && (
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-green-600 mb-4">
                Great job! You completed the exercise.
              </p>
              <button
                onClick={reset}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Keyboard Visual */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-10 gap-1">
              {"QWERTYUIOP".split("").map((key) => (
                <div
                  key={key}
                  className="aspect-square border border-gray-300 rounded flex items-center justify-center text-xs font-mono bg-gray-50"
                >
                  {key}
                </div>
              ))}
              {"ASDFGHJKL".split("").map((key) => (
                <div
                  key={key}
                  className="aspect-square border border-gray-300 rounded flex items-center justify-center text-xs font-mono bg-gray-50"
                >
                  {key}
                </div>
              ))}
              {"ZXCVBNM".split("").map((key) => (
                <div
                  key={key}
                  className="aspect-square border border-gray-300 rounded flex items-center justify-center text-xs font-mono bg-gray-50"
                >
                  {key}
                </div>
              ))}
              <div className="col-span-3"></div>
              <div className="col-span-4 border border-gray-300 rounded flex items-center justify-center text-xs font-mono bg-gray-50">
                SPACE
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}