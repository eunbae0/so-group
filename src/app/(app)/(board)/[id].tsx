import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
	TextInput,
	Alert,
	ActivityIndicator,
	RefreshControl,
	Keyboard,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { VStack } from '#/components/ui/vstack';
import { HStack } from '#/components/ui/hstack';
import { Box } from '#/components/ui/box';
import { Text } from '@/shared/components/text';
import { Avatar, AvatarGroup } from '@/components/common/avatar';
import { Icon } from '#/components/ui/icon';
import { Button, ButtonIcon, ButtonText } from '@/components/common/button';
import { KeyboardAvoidingView } from '@/components/common/keyboard-view/KeyboardAvoidingView';

import { useToastStore } from '@/store/toast';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import {
	Crown,
	MessageCircle,
	ThumbsUp,
	Eye,
	MoreHorizontal,
	Pen,
	Trash,
	SendHorizontal,
	Pin,
	PinOff,
} from 'lucide-react-native';
import Header from '@/components/common/Header';
import type {
	ReactionType,
	PostReactionMetadata,
	ImageElement,
} from '@/features/board/types';
import { UserRole } from '@/features/board/types';
import type { ClientReaction } from '@/features/board/api/service';

import { useAuthStore } from '@/store/auth';
import {
	useBoardPost,
	useDeleteBoardPost,
	useIncrementViewCount,
} from '@/features/board/hooks/useBoardPosts';
import { usePinPostUtils } from '@/features/board/utils/pin';
import { checkPinnedPost } from '@/features/board/api';
import {
	useComments,
	useCreateComment,
	useUpdateComment,
	useDeleteComment,
} from '@/features/board/hooks/useComments';
import {
	useReactions,
	useReactionToggle,
} from '@/features/board/hooks/useReactions';
import { CommentItem } from '@/features/board/components/CommentItem';
import AnimatedPressable from '@/components/common/animated-pressable';
import { Divider } from '#/components/ui/divider';
import { useBottomSheet } from '@/hooks/useBottomSheet';
import {
	BottomSheetListHeader,
	BottomSheetListItem,
	BottomSheetListLayout,
} from '@/components/common/bottom-sheet';
import { goBackOrReplaceHome, openProfile } from '@/shared/utils/router';
import TextWithLinks from '@/shared/components/text-with-links';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { getImageSourceForSignedImageUrl } from '@/shared/utils/image';
import ImageModal from 'react-native-image-modal';
import { useShowStoreReview } from '@/shared/hooks/useShowStoreReview';

/**
 * 로딩 상태 컴포넌트
 */
function LoadingState() {
	return (
		<VStack className="flex-1 items-center justify-center">
			<ActivityIndicator size="large" color="#6366f1" />
			<Text className="mt-4 text-gray-500">게시글을 불러오는 중이에요</Text>
		</VStack>
	);
}

/**
 * 에러 상태 컴포넌트
 */
function ErrorState({ message }: { message: string }) {
	return (
		<VStack space="xl" className="flex-1 items-center justify-center">
			<Icon as={MessageCircle} size="xl" className="text-gray-400" />
			<Text className="text-gray-500">{message}</Text>
			<Button variant="outline" onPress={goBackOrReplaceHome}>
				<ButtonText>게시글 목록으로 돌아가기</ButtonText>
			</Button>
		</VStack>
	);
}

export default function BoardPostDetailScreen() {
	const { id: postId } = useLocalSearchParams<{ id: string }>();
	const { showSuccess, showError } = useToastStore();
	const commentInputRef = useRef<TextInput>(null);
	const [commentText, setCommentText] = useState('');
	const [refreshing, setRefreshing] = useState(false);
	const { showReview } = useShowStoreReview();

	// 현재 사용자 및 그룹 정보 가져오기
	const { user, currentGroup } = useAuthStore();

	// 그룹 ID 또는 사용자 정보가 없으면 에러 처리
	if (!currentGroup || !user) {
		showError('그룹 또는 사용자 정보를 찾을 수 없어요');
		return;
	}

	const {
		data: post,
		isLoading: isPostLoading,
		isError: isPostError,
		error: postError,
		refetch: refetchPost,
	} = useBoardPost(currentGroup?.groupId || '', postId || '');

	const incrementViewCountMutation = useIncrementViewCount();

	const viewCountRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		// 이미 조회수를 증가시켰다면 실행하지 않음
		if (viewCountRef.current) return;

		if (post && currentGroup?.groupId && postId) {
			// 게시글이 로드되면 조회수 증가 (한 번만 실행)
			incrementViewCountMutation.mutate({
				groupId: currentGroup.groupId,
				postId: postId,
			});

			// 조회수 증가 한 번 실행 후 플래그 설정
			viewCountRef.current = true;
		}
	}, [post, currentGroup?.groupId, postId]);

	// 댓글 목록 가져오기
	const {
		data: comments,
		isLoading: isCommentsLoading,
		isError: isCommentsError,
		refetch: refetchComments,
	} = useComments(currentGroup?.groupId || '', postId || '');

	// 게시글 반응(좋아요) 정보 가져오기
	const reactionMetadata: PostReactionMetadata = useMemo(() => {
		return {
			targetType: 'post',
			groupId: currentGroup?.groupId || '',
			postId: postId || '',
		};
	}, [currentGroup?.groupId, postId]);

	const { data: reactions, refetch: refetchReactions } =
		useReactions(reactionMetadata);

	// 현재 사용자가 좋아요를 눌렀는지 확인
	const isLiked = useMemo(() => {
		return reactions
			? Object.values(reactions).some((reactions) =>
					reactions.some(
						(reaction) =>
							reaction.userId === user?.id && reaction.type === 'like',
					),
				)
			: false;
	}, [reactions, user]);

	// 반응(좋아요) 추가/제거 뮤테이션
	const reactionToggleMutation = useReactionToggle();

	// 좋아요 버튼 처리
	const handleLike = useCallback(() => {
		if (!post || !user || !currentGroup?.groupId) return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

		reactionToggleMutation.mutate(
			{
				metadata: reactionMetadata,
				userId: user.id,
				reactionType: 'like' as ReactionType,
				currentLikeState: isLiked,
			},
			{
				onError: () => {
					showError('반응 남기기에 실패했어요.');
				},
			},
		);
	}, [
		post,
		user,
		currentGroup?.groupId,
		reactionMetadata,
		isLiked,
		reactionToggleMutation,
		showError,
	]);

	// 댓글 생성 뮤테이션
	const createCommentMutation = useCreateComment();

	// 댓글 등록 처리
	const handleSubmitComment = () => {
		if (!commentText.trim() || !post || !user || !currentGroup?.groupId) return;

		createCommentMutation.mutate(
			{
				metadata: { groupId: currentGroup.groupId },
				commentData: {
					postId: postId || '',
					userId: user.id,
					content: commentText.trim(),
				},
			},
			{
				onSuccess: async () => {
					setCommentText('');
					showSuccess('댓글이 등록되었어요');
					// 댓글 입력 후 키보드 닫기
					commentInputRef.current?.blur();
					Keyboard.dismiss();
					await showReview();
				},
				onError: () => {
					Keyboard.dismiss();
					showError('댓글을 등록하지 못했어요');
				},
			},
		);
	};

	// 댓글 수정 뮤테이션
	const updateCommentMutation = useUpdateComment();

	// 댓글 수정 처리
	const handleEditComment = (commentId: string, newContent: string) => {
		if (!currentGroup?.groupId || !postId) return;

		updateCommentMutation.mutate(
			{
				metadata: {
					groupId: currentGroup.groupId,
					postId: postId,
					commentId: commentId,
				},
				commentData: {
					id: commentId,
					content: newContent,
				},
			},
			{
				onSuccess: () => {
					Keyboard.dismiss();
					showSuccess('댓글이 수정되었어요');
				},
				onError: () => {
					Keyboard.dismiss();
					showError('댓글을 수정하지 못했어요');
				},
			},
		);
	};

	// 댓글 삭제 뮤테이션
	const deleteCommentMutation = useDeleteComment();

	// 댓글 삭제 처리
	const handleDeleteComment = (commentId: string) => {
		if (!currentGroup?.groupId || !postId) return;

		deleteCommentMutation.mutate(
			{
				groupId: currentGroup.groupId,
				postId: postId,
				commentId: commentId,
			},
			{
				onSuccess: () => {
					showSuccess('댓글이 삭제되었어요');
				},
				onError: () => {
					showError('댓글을 삭제하지 못했어요');
				},
			},
		);
	};

	const handlePressMoreButton = () => {
		handlePostSettingOpen();
	};

	const deletePostMutation = useDeleteBoardPost();

	const handleDeletePost = () => {
		Alert.alert('게시글 삭제', '정말 이 게시글을 삭제할까요?', [
			{
				text: '취소',
				style: 'cancel',
			},
			{
				text: '삭제',
				style: 'destructive',
				onPress: () => {
					if (!currentGroup?.groupId || !postId) return;

					deletePostMutation.mutate(
						{
							groupId: currentGroup.groupId,
							postId: postId,
						},
						{
							onSuccess: () => {
								showSuccess('게시글이 삭제되었어요');
							},
							onError: () => {
								showError('게시글을 삭제하지 못했어요');
							},
							onSettled: () => {
								handlePostSettingClose();
								goBackOrReplaceHome();
							},
						},
					);
				},
			},
		]);
	};

	const { updatePostPinStatus } = usePinPostUtils();

	// 새로고침 처리 함수
	const handleRefresh = useCallback(async () => {
		if (!currentGroup?.groupId || !postId) return;

		setRefreshing(true);

		try {
			await Promise.all([refetchPost(), refetchComments(), refetchReactions()]);
		} catch (error) {
			showError('새로고침에 실패했어요');
		} finally {
			setRefreshing(false);
		}
	}, [
		currentGroup?.groupId,
		postId,
		refetchPost,
		refetchComments,
		refetchReactions,
		showError,
	]);

	const handleTogglePin = async () => {
		if (!post || !currentGroup?.groupId || !postId) return;

		// 고정 해제의 경우 바로 처리
		if (post.isPinned) {
			await updatePostPinStatus(
				post.id,
				currentGroup.groupId,
				false,
				handlePostSettingClose,
			);
			return;
		}

		// 고정하려는 경우, 이미 고정된 게시글이 있는지 확인
		const existingPinnedPost = await checkPinnedPost({
			groupId: currentGroup.groupId,
			currentPostId: postId,
		});

		if (!existingPinnedPost) {
			// 고정된 게시글이 없는 경우 바로 고정
			await updatePostPinStatus(
				post.id,
				currentGroup.groupId,
				true,
				handlePostSettingClose,
			);
			return;
		}

		// 이미 고정된 게시글이 있는 경우 확인 알림 표시
		Alert.alert(
			'현재 고정된 게시글을 바꾸시겠어요?',
			'한 번에 하나의 게시글만 고정할 수 있습니다.',
			[
				{ text: '취소', style: 'cancel' },
				{
					text: '확인',
					onPress: async () => {
						const unpinSuccess = await updatePostPinStatus(
							existingPinnedPost.id,
							currentGroup.groupId,
							false,
							handlePostSettingClose,
							false,
						);

						if (unpinSuccess) {
							await updatePostPinStatus(
								post.id,
								currentGroup.groupId,
								true,
								handlePostSettingClose,
							);
						}
					},
				},
			],
		);
	};

	const {
		BottomSheetContainer: LikeMemberListBottomSheetContainer,
		handleOpen: handleLikeMemberListOpen,
		handleClose: handleLikeMemberListClose,
	} = useBottomSheet();
	const {
		BottomSheetContainer: PostSettingBottomSheetContainer,
		handleOpen: handlePostSettingOpen,
		handleClose: handlePostSettingClose,
	} = useBottomSheet();

	// 로딩 상태 표시
	if (isPostLoading) {
		return (
			<SafeAreaView className="flex-1 bg-white">
				<Header label="게시글" />
				<LoadingState />
			</SafeAreaView>
		);
	}

	// 에러 상태 표시
	if (isPostError || !post) {
		return (
			<SafeAreaView className="flex-1 bg-white">
				<Header label="게시글" />
				<ErrorState message="게시글을 찾을 수 없어요" />
			</SafeAreaView>
		);
	}

	const categoryLabel = post.category === 'NOTICE' ? '공지사항' : '자유게시판';
	const categoryColor =
		post.category === 'NOTICE' ? 'text-amber-600' : 'text-indigo-600';

	return (
		<SafeAreaView className="flex-1">
			<KeyboardAvoidingView keyboardVerticalOffset={0}>
				<Header className="justify-between pr-3">
					<Button variant="icon" onPress={handlePressMoreButton}>
						<ButtonIcon as={MoreHorizontal} />
					</Button>
				</Header>

				<ScrollView
					className="flex-1"
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							colors={['#6366f1']}
							tintColor="#6366f1"
						/>
					}
				>
					<VStack className="flex-1 p-4">
						{/* 카테고리 태그 */}
						<Box className="mb-3">
							<Text
								className={`text-sm font-pretendard-Medium px-3 py-1 rounded-full bg-gray-100 self-start ${categoryColor}`}
							>
								{categoryLabel}
							</Text>
						</Box>

						{/* 작성자 정보 */}
						<HStack className="mb-6 items-center justify-between">
							<HStack space="sm" className="items-center">
								<AnimatedPressable onPress={() => openProfile(post.author.id)}>
									<HStack space="md" className="items-center">
										<Avatar size="md" photoUrl={post.author.photoUrl || ''} />
										<VStack space="xs">
											<HStack space="xs" className="items-center">
												<Text size="lg" className="font-pretendard-bold">
													{post.author.displayName || '이름없음'}
												</Text>
												{post.author.role === 'leader' && (
													<Icon
														as={Crown}
														size="sm"
														className="text-yellow-500"
													/>
												)}
											</HStack>
											<Text className="text-typography-500" size="md">
												{formatRelativeTime(post.createdAt)}
											</Text>
										</VStack>
									</HStack>
								</AnimatedPressable>
							</HStack>
							{post.isPinned && (
								<HStack space="xs" className="items-center">
									<Text
										size="xs"
										className="text-typography-700 font-pretendard-Medium"
									>
										고정됨
									</Text>
									<Icon as={Pin} size="xs" className="text-typography-700" />
								</HStack>
							)}
						</HStack>

						{/* 게시글 제목 */}
						<Text size="2xl" className="font-pretendard-bold mb-4">
							{post.title}
						</Text>

						{/* 게시글 내용 */}
						<Box className="mb-6">
							<TextWithLinks
								text={post?.content || ''}
								size="xl"
								className="text-typography-700"
							/>
						</Box>

						{/* 게시글 이미지 */}
						<VStack space="sm" className="mb-6">
							{post?.elements?.image
								?.sort((a, b) => a.position - b.position)
								.map((i) => {
									const image = i as ImageElement;
									return (
										// @ts-expect-error: source prop is not necessary
										<ImageModal
											key={image.position}
											style={{
												width: '100%',
												height: 300,
												aspectRatio: 1,
												borderRadius: 8,
												borderWidth: 1,
												borderColor: '#ECECEC',
											}}
											resizeMode="contain"
											renderImageComponent={({ style }) => (
												<Image
													key={image.position}
													source={getImageSourceForSignedImageUrl(image.url)}
													style={style}
													contentFit="contain"
												/>
											)}
										/>
									);
								})}
						</VStack>

						{/* 게시글 통계 */}
						{reactions?.like && reactions?.like.length > 0 && (
							<AnimatedPressable
								scale={0.98}
								onPress={handleLikeMemberListOpen}
								className="self-start"
							>
								<HStack space="sm" className="items-center pb-1">
									<AvatarGroup max={2} onPress={handleLikeMemberListOpen}>
										{reactions?.like?.map((reaction) => (
											<Avatar
												key={reaction.userId}
												size="2xs"
												photoUrl={reaction.member.photoUrl}
											/>
										)) || []}
									</AvatarGroup>
									<Text size="sm" className="text-typography-500">
										{reactions?.like?.length || 0}명이 공감했어요
									</Text>
								</HStack>
							</AnimatedPressable>
						)}
						<HStack className="items-center justify-between mb-6 pt-2">
							<HStack space="lg" className="items-center ">
								<AnimatedPressable onPress={handleLike}>
									<HStack space="xs" className="items-center">
										<Icon
											as={ThumbsUp}
											size="xl"
											fill={isLiked ? '#362303' : undefined}
											className={
												isLiked ? 'text-primary-500' : 'text-typography-500'
											}
										/>
										<Text
											size="lg"
											weight="medium"
											className={
												isLiked ? 'text-primary-500' : 'text-typography-500'
											}
										>
											{post.reactionSummary?.like || 0}
										</Text>
									</HStack>
								</AnimatedPressable>
								<HStack space="xs" className="items-center">
									<Icon
										size="xl"
										as={MessageCircle}
										className="text-typography-500"
									/>
									<Text
										size="lg"
										weight="medium"
										className="text-typography-500"
									>
										{post.commentCount}
									</Text>
								</HStack>
							</HStack>
							<HStack space="xs" className="items-center">
								<Icon size="xl" as={Eye} className="text-typography-500" />
								<Text size="sm" weight="medium" className="text-typography-500">
									{post.viewCount}
								</Text>
							</HStack>
						</HStack>

						<Divider />

						{/* 댓글 섹션 */}
						<VStack className="py-4 mb-8">
							<Text size="xl" className="font-pretendard-bold mb-2">
								댓글 {post.commentCount}개
							</Text>

							{/* 댓글 목록 */}
							<VStack className="mt-1">
								{isCommentsLoading ? (
									<VStack className="items-center py-8">
										<ActivityIndicator size="small" color="#6366f1" />
										<Text className="mt-2 text-gray-500">
											댓글을 불러오는 중이에요
										</Text>
									</VStack>
								) : isCommentsError ? (
									<VStack className="items-center py-8">
										<Text className="text-gray-500">
											댓글을 불러오지 못했어요
										</Text>
									</VStack>
								) : comments && comments.length > 0 ? (
									comments.map((comment) => (
										<CommentItem
											key={comment.id}
											comment={comment}
											onEdit={handleEditComment}
											onDelete={handleDeleteComment}
											isCurrentUser={comment.author.id === user?.id}
										/>
									))
								) : (
									<VStack className="items-center py-8">
										<Text className="text-gray-500">
											첫 번째 댓글을 남겨보세요!
										</Text>
									</VStack>
								)}
							</VStack>
						</VStack>
					</VStack>
				</ScrollView>

				{/* 댓글 입력 영역 */}
				<VStack>
					<Divider />
					<Box className="mx-4">
						{/* 댓글 입력 영역 */}
						<HStack space="md" className="items-center py-2">
							<TextInput
								className="flex-1 bg-gray-100 text-lg rounded-2xl px-4 py-2 font-pretendard-Regular"
								placeholder="댓글을 입력해주세요"
								value={commentText}
								onChangeText={setCommentText}
								multiline
							/>
							<Button
								size="sm"
								variant="icon"
								rounded
								onPress={handleSubmitComment}
								disabled={
									!commentText.trim() || createCommentMutation.isPending
								}
							>
								{createCommentMutation.isPending ? (
									<ActivityIndicator size="small" color="#6366f1" />
								) : (
									<ButtonIcon
										as={SendHorizontal}
										size="lg"
										className="text-primary-500"
									/>
								)}
							</Button>
						</HStack>
					</Box>
				</VStack>

				<PostSettingBottomSheetContainer>
					<BottomSheetListLayout className="gap-4">
						<BottomSheetListItem
							label="수정하기"
							icon={Pen}
							onPress={() => {
								handlePostSettingClose();
								router.push({
									pathname: '/(app)/(board)/create',
									params: { id: post.id, isEdit: 'true' },
								});
							}}
						/>
						{user?.id && post?.author?.role === UserRole.LEADER && (
							<BottomSheetListItem
								label={post.isPinned ? '고정 해제하기' : '고정하기'}
								icon={post.isPinned ? PinOff : Pin}
								onPress={handleTogglePin}
							/>
						)}
						<BottomSheetListItem
							label="삭제하기"
							icon={Trash}
							variant="destructive"
							onPress={handleDeletePost}
						/>
					</BottomSheetListLayout>
				</PostSettingBottomSheetContainer>
				<LikeMemberListBottomSheetContainer>
					<BottomSheetListLayout>
						<BottomSheetListHeader
							label="공감한 멤버"
							onPress={handleLikeMemberListClose}
						/>
						<ScrollView style={{ maxHeight: 300 }}>
							{reactions?.like && reactions?.like?.length > 0 ? (
								reactions?.like?.map((item: ClientReaction) => (
									<HStack
										key={item.userId}
										space="md"
										className="items-center py-3"
									>
										<Avatar size="lg" photoUrl={item.member.photoUrl} />
										<VStack>
											<Text size="lg" className="font-pretendard-semi-bold">
												{item.member.displayName}
											</Text>
											<Text size="sm" className="text-typography-500">
												{item.member.role === UserRole.LEADER ? '리더' : '멤버'}
											</Text>
										</VStack>
									</HStack>
								))
							) : (
								<Box className="items-center justify-center py-10">
									<Text className="text-typography-500">
										아직 공감한 멤버가 없어요
									</Text>
								</Box>
							)}
						</ScrollView>
					</BottomSheetListLayout>
				</LikeMemberListBottomSheetContainer>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
