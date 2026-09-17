'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { AI_REVIEW_QUEUE, generateAiProps } from '~/core/utils/generator/connect/admin.generator';

export const useAiServicesScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);

  const aiProps = useMemo(
    () =>
      generateAiProps(demo).map((row) => ({
        ...row,
        toggle: () => dispatch(demoActions.toggleAi(row.id)),
        open: () => actions.openProp(row.id)
      })),
    [demo, dispatch, actions]
  );

  const reviewQueue = AI_REVIEW_QUEUE.map((item, index) => ({
    ...item,
    review: () => dispatch(demoActions.openTranscript(index))
  }));

  return {
    aiProps,
    reviewQueue,
    reviewCount: reviewQueue.length,
    goLiveChat: () => actions.go(CONNECT_ROUTES.liveChat)
  };
};
