// Minimal AI suggester stub used in development.
export async function suggestTopics(prompt: string): Promise<string[]> {
	// Replace with real AI integration later (OpenAI, local model, etc.)
	if (!prompt) return []
	return ['Networking', 'Q&A', 'Keynote']
}
