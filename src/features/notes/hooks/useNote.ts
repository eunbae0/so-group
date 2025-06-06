import { getUserNote, updateUserNote, deleteUserNote } from '@/api/notes';
import { Note } from '@/api/notes/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from '@react-native-firebase/firestore';
import type { ClientWorshipType } from '@/api/worship-types/types';
import { useToastStore } from '@/store/toast';
import { trackAmplitudeEvent } from '@/shared/utils/amplitude';

interface UpdateNoteData {
	title: string;
	date: Date;
	content?: string;
	sermon?: string;
	preacher?: string;
	worshipType: ClientWorshipType;
}

interface UpdateNoteParams {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}

/**
 * Custom hook to fetch a single note by ID
 * @param id The ID of the note to fetch
 * @returns Object containing note data, loading state, and error
 */
export function useNote(id: string | undefined) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['note', id],
		queryFn: async () => {
			if (!id) return null;
			return await getUserNote(id);
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	return {
		note: data,
		isLoading,
		error,
	};
}

/**
 * Custom hook for updating a note using React Query
 * @param id The ID of the note to update
 * @param params Optional callbacks for success and error handling
 * @returns Object containing mutation function and state
 */
export function useUpdateNote(
	id: string | undefined,
	{ onSuccess, onError }: UpdateNoteParams = {},
) {
	const queryClient = useQueryClient();
	const { showError } = useToastStore();

	const { mutate, isPending, error, isSuccess } = useMutation({
		mutationFn: async (noteData: UpdateNoteData) => {
			if (!id) throw new Error('Note ID is required');

			// Format worshipType to match ClientWorshipType structure
			const worshipType =
				typeof noteData.worshipType === 'string'
					? {
							id: `worship-type-${Date.now()}`, // Generate a temporary ID if not provided
							name: noteData.worshipType,
						}
					: noteData.worshipType;

			const formattedData = {
				...noteData,
				date: Timestamp.fromDate(noteData.date),
				content: noteData.content || '',
				sermon: noteData.sermon || '',
				preacher: noteData.preacher || '',
				worshipType,
			};

			await updateUserNote(id, formattedData);
			return { id, ...formattedData };
		},
		onSuccess: (note) => {
			// Invalidate and refetch the note query
			queryClient.invalidateQueries({ queryKey: ['note', id] });
			// Also invalidate the notes list
			queryClient.invalidateQueries({ queryKey: ['notes'] });
			onSuccess?.();
			// tracking amplitude
			trackAmplitudeEvent('노트 수정', {
				screen: 'Note_Detail',
				note_has_sermon: !!note.sermon,
				note_has_preacher: !!note.preacher,
				note_content_length: note.content?.length || 0,
			});
		},
		onError: (error: Error) => {
			showError('노트를 수정하는데 실패했어요.');
			onError?.(error);
		},
	});

	return {
		updateNote: mutate,
		isLoading: isPending,
		error,
		isSuccess,
	};
}

/**
 * Custom hook for deleting a note using React Query
 * @param id The ID of the note to delete
 * @param params Optional callbacks for success and error handling
 * @returns Object containing mutation function and state
 */
export function useDeleteNote(
	id: string | undefined,
	{ onSuccess, onError }: UpdateNoteParams = {},
) {
	const queryClient = useQueryClient();
	const { showError } = useToastStore();

	const { mutate, isPending, error, isSuccess } = useMutation({
		mutationFn: async () => {
			if (!id) throw new Error('Note ID is required');
			await deleteUserNote(id);
			return id;
		},
		onSuccess: () => {
			// Invalidate and refetch the notes list
			queryClient.invalidateQueries({ queryKey: ['notes'] });
			onSuccess?.();
		},
		onError: (error: Error) => {
			showError('노트를 삭제하는데 실패했어요.');
			onError?.(error);
		},
	});

	return {
		deleteNote: mutate,
		isLoading: isPending,
		error,
		isSuccess,
	};
}
