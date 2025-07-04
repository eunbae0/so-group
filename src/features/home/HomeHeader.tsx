import { Pressable, View } from 'react-native';
import { useState } from 'react';
import { Button, ButtonIcon, ButtonText } from '@/components/common/button';
import { HStack } from '#/components/ui/hstack';
import { VStack } from '#/components/ui/vstack';
import { Text } from '@/shared/components/text';
import { Heading } from '@/shared/components/heading';
import { Icon } from '#/components/ui/icon';
import { useShareText } from '@/shared/hooks/useShareText';
import {
	ChevronDown,
	MenuIcon,
	Library,
	Settings,
	SettingsIcon,
	Users,
	ChevronRight,
	QrCode,
} from 'lucide-react-native';
import { Divider } from '#/components/ui/divider';

import { useBottomSheet } from '@/hooks/useBottomSheet';
import {
	BottomSheetListHeader,
	BottomSheetListItem,
	BottomSheetListLayout,
} from '@/components/common/bottom-sheet';
import { Avatar, AvatarGroup } from '@/components/common/avatar';
import type { ClientGroup } from '@/api/group/types';
import { useAuthStore } from '@/store/auth';
import { router } from 'expo-router';
import { cn } from '@/shared/utils/cn';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { isAndroid, isIOS } from '@/shared/utils/platform';
import { trackAmplitudeEvent } from '@/shared/utils/amplitude';
import type { AmplitudeLocation } from '@/shared/constants/amplitude';
import { openProfile } from '@/shared/utils/router';
import { PopupMenu, PopupMenuItem, PopupMenuItemLabel } from '@/shared/components/popup-menu';
import { MemberListItem } from '../profile/components/MemberListItem';
import * as Haptics from 'expo-haptics';

const MAX_INNER_MEMBER_LIST_HEIGHT = 200;

type Props = {
	groups: ClientGroup[];
};

function HomeHeader({ groups }: Props) {
	const { user, currentGroup, updateCurrentGroup } = useAuthStore();
	const [isExpanded, setIsExpanded] = useState(false);

	const {
		handleOpen: handleOpenMenu,
		handleClose: handleCloseMenu,
		BottomSheetContainer: MenuBottomSheetContainer,
	} = useBottomSheet();
	const {
		handleOpen: handleOpenMember,
		handleClose: handleCloseMember,
		BottomSheetContainer: MemberBottomSheetContainer,
	} = useBottomSheet({
		onClose: () => {
			setIsExpanded(false);
		},
	});

	const group = groups.find((group) => group.id === currentGroup?.groupId);

	const handlePressMainScreenSetting = () => {
		trackAmplitudeEvent('메인 화면 편집 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
			location: 'Group_Menu_Bottom_Sheet',
		});
		router.push('/(app)/(setting)/main-screen-setting');
		handleCloseMenu();
	};

	const handlePressMemberGroup = () => {
		trackAmplitudeEvent('홈 아바타 그룹 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
		});
		setIsExpanded((prev) => !prev);
		handleOpenMember();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
			.then(() =>
				setTimeout(() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
				}, 50));
	};

	const handlePressManageMember = () => {
		trackAmplitudeEvent('소그룹 관리하기 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
			location: 'Group_Menu_Bottom_Sheet',
		});
		router.push('/(app)/(group)/(manage-group)');
		handleCloseMenu();
	};

	const isLeader =
		group?.members?.find((m) => m.id === user?.id)?.role === 'leader';

	const handlePressManageMyGroup = () => {
		trackAmplitudeEvent('내 그룹 관리하기 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
			location: 'Group_List_Menu',
		});
		router.push('/(app)/(group)/manage-my-group');
		handleCloseMenu();
	};

	const handlePressGroupMemberList = (
		location: keyof typeof AmplitudeLocation,
	) => {
		trackAmplitudeEvent('그룹원 목록 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
			location,
		});
		handleCloseMember();
		handleCloseMenu();
		router.push('/(app)/(group)/member-list');
	};

	const handlePressQrCode = () => {
		trackAmplitudeEvent('QR코드 보기 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
			location: 'Group_List_Menu',
		});
		handleCloseMember();
		handleCloseMenu();
		router.push({
			pathname: '/(app)/inviteQrCodeModal',
			params: {
				inviteCode: group?.inviteCode,
			},
		});
	};

	const handlePressMenu = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
		trackAmplitudeEvent('홈 메뉴 클릭', {
			screen: 'Tab_Home',
			symbol: 'Home_Header',
			location: 'Group_Menu_Bottom_Sheet',
		});
		handleOpenMenu();
	}

	const { shareText } = useShareText();

	return (
		<HStack
			className={cn(
				'items-center justify-between pl-4 pr-2',
				isIOS ? 'pt-2' : 'pt-5',
			)}
		>
			<PopupMenu
				placement="bottom left"
				offset={5}
				trigger={({ ...triggerProps }) => {
					return (
						<Pressable
							{...triggerProps}
							onPress={() => {
								trackAmplitudeEvent('홈 소그룹 더보기 클릭', {
									screen: 'Tab_Home',
									symbol: 'Home_Header',
									location: 'Group_List_Menu',
								});
								triggerProps?.onPress();
							}}
						>
							<HStack space="xs" className="items-center">
								<Heading size="2xl">{group?.groupName}</Heading>
								<Icon
									as={ChevronDown}
									className="w-7 h-7 color-typography-900"
								/>
							</HStack>
						</Pressable>
					);
				}}
			>
				{groups.length > 0 &&
					groups.map((group) => (
						<PopupMenuItem
							key={group.id}
							// textValue={group.groupName}
							closeOnSelect
							onPress={() => {
								trackAmplitudeEvent('소그룹 선택', {
									screen: 'Tab_Home',
									symbol: 'Home_Header',
									location: 'Group_List_Menu',
								});
								updateCurrentGroup({ groupId: group.id });
							}}
						>
							<PopupMenuItemLabel size="lg" disabled={group.id !== currentGroup?.groupId}>{group.groupName}</PopupMenuItemLabel>
						</PopupMenuItem>
					))}
				<PopupMenuItem
					key="Plugins"
					// textValue="Plugins"
					onPress={handlePressManageMyGroup}
				>
					<Icon as={SettingsIcon} size="lg" className="mr-2 opacity-70" />
					<PopupMenuItemLabel size="lg" disabled>내 그룹 관리하기</PopupMenuItemLabel>
				</PopupMenuItem>
			</PopupMenu>
			<HStack space="xs" className="items-center">
				<AvatarGroup onPress={handlePressMemberGroup} isExpanded={isExpanded}>
					{group?.members
						? group.members.map((member) => (
							<Avatar
								key={member.id}
								photoUrl={member.photoUrl ?? undefined}
								size="sm"
								className="bg-primary-400"
							/>
						))
						: []}
				</AvatarGroup>

				<Button
					size="xl"
					variant="icon"
					onPress={handlePressMenu}
				>
					<ButtonIcon as={MenuIcon} />
				</Button>
			</HStack>
			<MenuBottomSheetContainer>
				<BottomSheetListLayout>
					<BottomSheetListHeader
						label="소그룹 메뉴"
						onPress={handleCloseMenu}
					/>
					{/* <BottomSheetListItem
						label="기도 제목 모아보기"
						icon={HandHelping}
						onPress={handlePressPrayerRequestList}
					/> */}
					<BottomSheetListItem
						label="그룹원 목록"
						icon={Users}
						onPress={() =>
							handlePressGroupMemberList('Group_Menu_Bottom_Sheet')
						}
					/>
					<Divider />
					<BottomSheetListItem
						label="메인 화면 편집"
						icon={Library}
						onPress={handlePressMainScreenSetting}
					/>

					{isLeader && (
						<>
							<Divider />
							<BottomSheetListItem
								label="소그룹 관리하기"
								icon={Settings}
								onPress={handlePressManageMember}
							/>
						</>
					)}
				</BottomSheetListLayout>
			</MenuBottomSheetContainer>

			{/* Group Members Bottom Sheet */}
			<MemberBottomSheetContainer>
				<VStack className="px-6 py-2">
					<BottomSheetListHeader
						label="그룹원 목록"
						onPress={handleCloseMember}
					/>

					{/* Group Members List */}
					<View className="pb-5">
						{group?.members && group.members.length > 0 ? (
							<FlatList
								data={group.members}
								renderItem={({ item: member }) => (
									<MemberListItem
										key={member.id}
										member={member}
										onPress={() => {
											handleCloseMember();
											openProfile(member.id);
										}}
									/>
								)}
								keyExtractor={(member) => member.id}
								showsVerticalScrollIndicator={false}
								contentContainerStyle={{ paddingHorizontal: 16 }}
								style={{ maxHeight: MAX_INNER_MEMBER_LIST_HEIGHT }}
							/>
						) : (
							<Text className="text-center py-4">그룹원이 없어요.</Text>
						)}
					</View>
					<VStack space="sm" className="py-2">
						<Text size="sm">
							아래 코드를 공유하여 새로운 그룹원을 초대해보세요
						</Text>
						<HStack className="items-center justify-between bg-gray-100 rounded-lg p-4">
							<Text size="lg" className="font-pretendard-semi-bold">
								{group?.inviteCode}
							</Text>
							<Button size="sm" variant="outline" onPress={handlePressQrCode}>
								<ButtonIcon
									as={QrCode}
									size="md"
									className="text-primary-500"
								/>
								<ButtonText>QR코드 보기</ButtonText>
							</Button>
						</HStack>
						<HStack space="sm" className="w-full py-2">
							<Button
								size="lg"
								variant="solid"
								className="flex-1"
								onPress={() => shareText(group?.inviteCode || '')}
							>
								<ButtonText>초대코드 공유하기</ButtonText>
							</Button>
							{isAndroid && (
								<Button
									size="lg"
									variant="outline"
									className="flex-1"
									onPress={() =>
										handlePressGroupMemberList('Group_Member_List_Bottom_Sheet')
									}
								>
									<ButtonText>그룹원 더보기</ButtonText>
									<ButtonIcon as={ChevronRight} />
								</Button>
							)}
						</HStack>
					</VStack>
				</VStack>
			</MemberBottomSheetContainer>
		</HStack>
	);
}

export default HomeHeader;
