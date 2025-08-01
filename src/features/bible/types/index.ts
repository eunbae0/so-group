export type BookIndex = Array<BookIndexData>;

export type BookIndexData = {
	id: string;
	name_kr: string;
	name_en: string;
	filename: string;
	chapters_count: number;
	type: 'OT' | 'NT';
	group_kr: string;
	next_book: string | null;
	prev_book: string | null;
};

export type Verse = {
	verse: number;
	text: string;
	places: Array<string>;
	persons: Array<string>;
};

export type ChapterData = {
	chapter: number;
	verses: Array<Verse>;
};

export type BookData = {
	id: string;
	name_kr: string;
	name_en: string;
	chapters: ChapterData[];
};
