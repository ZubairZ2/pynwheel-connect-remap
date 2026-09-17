'use client';

import { useMemo } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  generateHelpCount,
  generateHelpEmpty,
  generateHelpSections
} from '~/core/utils/generator/connect/admin.generator';

export const useHelpScreen = () => {
  const dispatch = useAppDispatch();
  const helpQuery = useAppSelector((s) => s.demo.helpQuery);

  const helpSections = useMemo(
    () =>
      generateHelpSections(helpQuery).map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          open: () =>
            dispatch(
              demoActions.showToast(
                `${item.kind === 'video' ? 'Playing' : 'Opening'} “${item.title}”.`
              )
            )
        }))
      })),
    [helpQuery, dispatch]
  );

  return {
    helpQuery,
    onHelpQuery: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.setHelpQuery(event.target.value)),
    helpCount: generateHelpCount(),
    helpSections,
    helpEmpty: generateHelpEmpty(helpQuery)
  };
};
