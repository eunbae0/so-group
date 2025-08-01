export const formatRelativeTime = (date: Date | string | number): string => {
	const now = new Date();
	const postTime = new Date(date);
	const diffMinutes = Math.floor(
		(now.getTime() - postTime.getTime()) / (1000 * 60),
	);

	if (diffMinutes < 1) {
		return '방금 전';
	}

	if (diffMinutes < 60) {
		return `${diffMinutes}분 전`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours}시간 전`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 30) {
		return `${diffDays}일 전`;
	}

	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) {
		return `${diffMonths}달 전`;
	}

	const diffYears = Math.floor(diffMonths / 12);
	return `${diffYears}년 전`;
};
