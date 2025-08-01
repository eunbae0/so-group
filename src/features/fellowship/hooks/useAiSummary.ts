import { GEMINI_API_URL } from '@/shared/constants/url';
import { useMutation } from '@tanstack/react-query';

export function useAiSummary(prompt: string) {
	return useMutation({
		mutationFn: (text: string) => generateAiSummary(text, prompt),
	});
}

async function generateAiSummary(
	text: string,
	prompt: string,
): Promise<string[]> {
	const response = await fetch(GEMINI_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			contents: [
				{
					parts: [
						{
							text: prompt.replace('{text}', text),
						},
					],
				},
			],
		}),
	});
	const data = await response.json();
	let summaries: string[] = [];
	try {
		if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
			summaries = data.candidates[0].content.parts[0].text
				.split('+')
				.map((text: string) => text.trim());
		} else {
			throw new Error('API 응답 형식이 올바르지 않습니다');
		}
	} catch (error) {
		throw new Error(`AI 응답 처리 오류: ${error}`);
	}
	return summaries;
}
