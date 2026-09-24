'use client';

import { useMemo } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generateChatConvos,
  generateChatFilters,
  generateChatStaffRows,
  generateChatStats,
  generateThread
} from '~/core/utils/generator/connect/engagement.generator';

export const useLiveChatScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const chatFilters = useMemo(
    () =>
      generateChatFilters(demo).map((filter) => ({
        ...filter,
        go: () => dispatch(demoActions.setChatPropFilter(filter.id))
      })),
    [demo, dispatch]
  );

  const chatConvos = useMemo(
    () =>
      generateChatConvos(demo).map((convo) => ({
        ...convo,
        assign: () => dispatch(demoActions.assignConvo(convo.id)),
        open: () => dispatch(demoActions.openThread(convo.id))
      })),
    [demo, dispatch]
  );

  const chatStaffRows = useMemo(
    () =>
      generateChatStaffRows(demo).map((staff) => ({
        ...staff,
        toggle: () =>
          staff.inRotation
            ? actions.confirm({
                title: `Remove ${staff.name} from rotation?`,
                msg: `New visitor chats at this property stop routing to ${staff.name}. Conversations already assigned to them stay open.`,
                label: 'Remove from Rotation',
                action: { type: demoActions.toggleRotation.type, payload: staff.id }
              })
            : dispatch(demoActions.toggleRotation(staff.id))
      })),
    [demo, dispatch, actions]
  );

  const thread = generateThread(demo);

  return {
    chatStats: generateChatStats(demo),
    chatFilters,
    chatConvos,
    chatConvosEmpty: chatConvos.length === 0,
    chatStaffRows,
    threadOpen: !!demo.threadId,
    thread,
    threadDraft: demo.threadDraft,
    onThreadDraft: (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      dispatch(demoActions.setThreadDraft(event.target.value)),
    sendThread: () => dispatch(demoActions.sendThread()),
    closeThread: () => dispatch(demoActions.closeThread()),
    closeConvo: () =>
      actions.confirm({
        title: 'Close this conversation?',
        msg: `${thread.visitor} can still send a new message, which starts a fresh conversation. Nothing in the transcript is deleted.`,
        label: 'Close Conversation',
        action: { type: demoActions.closeConvo.type }
      })
  };
};
