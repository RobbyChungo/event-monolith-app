// Minimal analytics stub for development.
export async function trackEvent(name: string, payload?: Record<string, any>): Promise<void> {
	// No-op in dev. Hook into real analytics (Segment, PostHog) later.
	// Keep return type consistent.
	return
}
