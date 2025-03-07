"use client";

import { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

interface PromptConfig {
  id: string;
  name: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

const defaultConfig: Omit<PromptConfig, "id" | "name"> = {
  prompt: "",
  temperature: 0.7,
  maxTokens: 200,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export default function AIPromptStudioPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [savedPrompts, setSavedPrompts] = useState<PromptConfig[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<PromptConfig & { id: string }>({
    id: crypto.randomUUID(),
    name: "",
    ...defaultConfig,
  });
  const [apiResponse, setApiResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/signin");
    }
  }, [user, isAuthLoading, router]);

  // Check if API key is set (this is a client-side check, there will be a server-side check as well)
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch("/api/openai/check-api-key");
        const data = await response.json();
        setIsApiKeySet(data.isSet);
        if (!data.isSet) {
          setError("OpenAI API key is not set. Please configure it in your environment variables.");
        }
      } catch (error) {
        console.error("Error checking API key:", error);
        setError("Could not verify OpenAI API key status.");
      }
    };

    checkApiKey();
  }, []);

  // Load saved prompts from localStorage
  useEffect(() => {
    const loadSavedPrompts = () => {
      const savedPromptsStr = localStorage.getItem("aiPrompts");
      if (savedPromptsStr) {
        try {
          const parsed = JSON.parse(savedPromptsStr);
          setSavedPrompts(parsed);
        } catch (error) {
          console.error("Error parsing saved prompts:", error);
        }
      }
    };

    loadSavedPrompts();
  }, []);

  const handleInputChange = (field: keyof PromptConfig, value: string | number) => {
    setCurrentPrompt((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePrompt = () => {
    if (!currentPrompt.name.trim()) {
      setError("Please provide a name for your prompt");
      return;
    }

    if (!currentPrompt.prompt.trim()) {
      setError("Please provide a prompt");
      return;
    }

    const updatedPrompts = [...savedPrompts];
    const existingIndex = updatedPrompts.findIndex((p) => p.id === currentPrompt.id);

    if (existingIndex >= 0) {
      updatedPrompts[existingIndex] = currentPrompt;
    } else {
      updatedPrompts.push(currentPrompt);
    }

    setSavedPrompts(updatedPrompts);
    localStorage.setItem("aiPrompts", JSON.stringify(updatedPrompts));
    setError(null);
    
    // Create a new prompt with a new ID
    setCurrentPrompt({
      id: crypto.randomUUID(),
      name: "",
      ...defaultConfig,
    });
  };

  const handleLoadPrompt = (id: string) => {
    const promptToLoad = savedPrompts.find((p) => p.id === id);
    if (promptToLoad) {
      setCurrentPrompt(promptToLoad);
    }
  };

  const handleDeletePrompt = (id: string) => {
    const updatedPrompts = savedPrompts.filter((p) => p.id !== id);
    setSavedPrompts(updatedPrompts);
    localStorage.setItem("aiPrompts", JSON.stringify(updatedPrompts));

    // If we're currently editing this prompt, reset the form
    if (currentPrompt.id === id) {
      setCurrentPrompt({
        id: crypto.randomUUID(),
        name: "",
        ...defaultConfig,
      });
    }
  };

  const handleExecutePrompt = async () => {
    if (!currentPrompt.prompt.trim()) {
      setError("Please provide a prompt to execute");
      return;
    }

    if (!isApiKeySet) {
      setError("OpenAI API key is not set. Please configure it in your environment variables.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiResponse("");

    try {
      const response = await fetch("/api/openai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: currentPrompt.prompt,
          temperature: currentPrompt.temperature,
          max_tokens: currentPrompt.maxTokens,
          top_p: currentPrompt.topP,
          frequency_penalty: currentPrompt.frequencyPenalty,
          presence_penalty: currentPrompt.presencePenalty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate text");
      }

      setApiResponse(data.text);
    } catch (error) {
      console.error("Error executing prompt:", error);
      setError(typeof error === "object" && error !== null && "message" in error
        ? (error as Error).message
        : "An error occurred while executing the prompt");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return <PageLayout>Loading...</PageLayout>;
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">AI Prompt Studio</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel - Saved prompts */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow p-4 h-min">
            <h2 className="text-lg font-semibold mb-4">Saved Prompts</h2>
            {savedPrompts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No saved prompts yet</p>
            ) : (
              <ul className="space-y-2">
                {savedPrompts.map((prompt) => (
                  <li key={prompt.id} className="border-b pb-2 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleLoadPrompt(prompt.id)}
                        className="text-left font-medium hover:text-brand-primary dark:hover:text-brand-primaryDark transition-colors"
                      >
                        {prompt.name}
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Middle panel - Prompt configuration */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Prompt Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prompt Name</label>
                <input
                  type="text"
                  value={currentPrompt.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full p-2 border rounded dark:bg-dark-input dark:border-dark-accent"
                  placeholder="My awesome prompt"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Prompt</label>
                <textarea
                  value={currentPrompt.prompt}
                  onChange={(e) => handleInputChange("prompt", e.target.value)}
                  className="w-full p-2 border rounded h-32 resize-y dark:bg-dark-input dark:border-dark-accent"
                  placeholder="Write your prompt here..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Temperature: {currentPrompt.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={currentPrompt.temperature}
                  onChange={(e) => handleInputChange("temperature", parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>More Focused</span>
                  <span>More Creative</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Tokens: {currentPrompt.maxTokens}
                </label>
                <input
                  type="range"
                  min="50"
                  max="4000"
                  step="50"
                  value={currentPrompt.maxTokens}
                  onChange={(e) => handleInputChange("maxTokens", parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Top P: {currentPrompt.topP}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentPrompt.topP}
                  onChange={(e) => handleInputChange("topP", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Frequency Penalty: {currentPrompt.frequencyPenalty}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={currentPrompt.frequencyPenalty}
                  onChange={(e) => handleInputChange("frequencyPenalty", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Presence Penalty: {currentPrompt.presencePenalty}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={currentPrompt.presencePenalty}
                  onChange={(e) => handleInputChange("presencePenalty", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleSavePrompt}
                  className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors"
                >
                  Save Prompt
                </button>
                <button
                  onClick={handleExecutePrompt}
                  disabled={isLoading || !isApiKeySet}
                  className={`px-4 py-2 rounded transition-colors ${
                    isLoading || !isApiKeySet
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {isLoading ? "Generating..." : "Execute Prompt"}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel - API response */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow p-4 max-h-screen overflow-auto">
            <h2 className="text-lg font-semibold mb-4">API Response</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <span className="animate-pulse">Generating response...</span>
              </div>
            ) : apiResponse ? (
              <div className="bg-gray-50 dark:bg-dark-input p-4 rounded border dark:border-dark-accent whitespace-pre-wrap">
                {apiResponse}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Execute a prompt to see the response here
              </p>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 