// App.jsx
import React, { useState } from 'react';
import { Upload, FileText, Sparkles, CheckCircle, XCircle } from 'lucide-react';

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.pptx') || file.name.endsWith('.ppt')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const generateQuestions = async () => {
    if (files.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          return {
            name: file.name,
            data: new Uint8Array(buffer)
          };
        })
      );

      const prompt = `PowerPoint dosyalarından 20 adet kısa, 5 şıklı çoktan seçmeli soru oluştur. Her soru için şu formatta JSON döndür (sadece JSON, başka hiçbir şey yazma):

[
  {
    "question": "Soru metni?",
    "options": ["A) Şık 1", "B) Şık 2", "C) Şık 3", "D) Şık 4", "E) Şık 5"],
    "correct": 0
  }
]

Sorular kısa ve net olsun. Doğru cevap indexi 0-4 arası olsun.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    data: btoa(String.fromCharCode(...fileContents[0].data))
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      const text = data.content.map(item => item.text || "").join("\n");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      setQuestions(parsed.slice(0, 20));
      setCurrentQuestion(0);
      setAnswers({});
      setShowResults(false);
    } catch (error) {
      console.error("Hata:", error);
      alert("Sorular oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: optionIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const finishQuiz = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct) correct++;
    });
    return correct;
  };

  const resetQuiz = () => {
    setFiles([]);
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = ((score / questions.length) * 100).toFixed(0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-50 to-rose-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-pink-600 mb-2">Tebrikler!</h2>
            <p className="text-gray-600">Sınavı tamamladınız</p>
          </div>

          <div className="bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl p-8 mb-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-pink-600 mb-2">{score}/{questions.length}</div>
              <div className="text-2xl text-pink-500">%{percentage}</div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {questions.map((q, idx) => {
              const userAnswer = answers[idx];
              const isCorrect = userAnswer === q.correct;
              
              return (
                <div key={idx} className="border-2 border-pink-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    ) : (
                      <XCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-2">{idx + 1}. {q.question}</p>
                      <p className="text-sm text-gray-600">
                        Doğru: <span className="text-green-600 font-medium">{q.options[q.correct]}</span>
                      </p>
                      {!isCorrect && userAnswer !== undefined && (
                        <p className="text-sm text-gray-600">
                          Sizin: <span className="text-red-600 font-medium">{q.options[userAnswer]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={resetQuiz}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg"
          >
            Yeni Sınav Oluştur
          </button>
        </div>
      </div>
    );
  }

  if (questions.length > 0) {
    const q = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-50 to-rose-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-pink-600">Soru {currentQuestion + 1}/{questions.length}</span>
                <span className="text-sm font-medium text-gray-500">{Object.keys(answers).length} cevaplanmış</span>
              </div>
              <div className="w-full bg-pink-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-pink-400 to-rose-400 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-6">{q.question}</h3>

            <div className="space-y-3 mb-8">
              {q.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[currentQuestion] === idx
                      ? 'border-pink-400 bg-pink-50 shadow-md'
                      : 'border-pink-100 hover:border-pink-300 hover:bg-pink-50'
                  }`}
                >
                  <span className="font-medium text-gray-800">{option}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all"
              >
                ← Önceki
              </button>
              
              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={finishQuiz}
                  className="flex-1 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg"
                >
                  Bitir ✓
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="flex-1 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg"
                >
                  Sonraki →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-50 to-rose-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
            Soru Bankası Oluşturucu
          </h1>
          <p className="text-gray-600">PowerPoint dosyalarınızdan 20 soru oluşturalım! 🌸</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-4 border-dashed rounded-3xl p-12 mb-6 transition-all ${
            isDragging 
              ? 'border-pink-400 bg-pink-50 scale-105' 
              : 'border-pink-200 bg-white hover:border-pink-300'
          }`}
        >
          <div className="text-center">
            <Upload className="mx-auto mb-4 text-pink-400" size={64} />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              PowerPoint dosyalarını buraya sürükleyin
            </h2>
            <p className="text-gray-500 mb-4">veya</p>
            <label className="inline-block bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-3 px-8 rounded-xl cursor-pointer transition-all shadow-lg">
              Dosya Seç
              <input
                type="file"
                multiple
                accept=".ppt,.pptx"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {files.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="text-pink-400" size={20} />
              Yüklenen Dosyalar ({files.length})
            </h3>
            <div className="space-y-2 mb-6">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
                  <FileText className="text-pink-400" size={20} />
                  <span className="text-gray-700 flex-1">{file.name}</span>
                  <button
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600 font-semibold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={generateQuestions}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="animate-spin" size={20} />
                  Sorular Oluşturuluyor...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  20 Soru Oluştur
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;