'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { PAGE_TYPES } from '~/data/mock/content.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  generateBrochureLinks,
  generateContentPages,
  generateContentTabs,
  generateHomeTiles,
  generateHoodCats,
  generateHoodView,
  generatePoiResults
} from '~/core/utils/generator/connect/content.generator';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';

const PAGE_TYPE_LABEL: Record<string, string> = {
  embed: 'Embedded Page',
  link: 'External Link',
  gallery: 'Image Gallery',
  slideshow: 'Slideshow'
};

export const usePropertyContentScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const tiles = demo.tiles[demo.propId] ?? [];

  const contentTabs = useMemo(
    () =>
      generateContentTabs(demo.contentTab).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setTab({ key: 'contentTab', value: tab.id }))
      })),
    [demo.contentTab, dispatch]
  );

  const contentPages = useMemo(
    () =>
      generateContentPages(demo).map((page) => ({
        ...page,
        homeToggle: () => dispatch(demoActions.togglePageHome(page.id)),
        up: () => dispatch(demoActions.movePage({ id: page.id, dir: -1 })),
        down: () => dispatch(demoActions.movePage({ id: page.id, dir: 1 })),
        edit: () =>
          dispatch(
            demoActions.openModal({
              kind: 'page',
              editingId: page.id,
              form: {
                title: page.title,
                ptype: PAGE_TYPE_LABEL[page.type],
                detail: page.detail,
                onHome: page.onHome ? 'Yes' : 'No'
              }
            })
          ),
        remove: () =>
          actions.confirm({
            title: `Delete ${page.title}?`,
            msg: 'The page is removed from the kiosk, the web embed, and the homepage tile order. Uploaded gallery images are deleted with it.',
            label: 'Delete Page',
            action: { type: demoActions.removePage.type, payload: page.id }
          })
      })),
    [demo, dispatch, actions]
  );

  const homeTiles = useMemo(
    () =>
      generateHomeTiles(demo).map((tile) => ({
        ...tile,
        up: () => dispatch(demoActions.moveTile({ id: tile.id, dir: -1 })),
        down: () => dispatch(demoActions.moveTile({ id: tile.id, dir: 1 })),
        crop: () => dispatch(demoActions.cropTile(tile.id)),
        remove: () =>
          actions.confirm({
            title: `Remove the ${tile.label} tile?`,
            msg: `The homepage drops to ${tiles.length - 1} tiles and fills the empty slot with a platform default.`,
            label: 'Remove Tile',
            action: { type: demoActions.removeTile.type, payload: tile.id }
          })
      })),
    [demo, dispatch, actions, tiles.length]
  );

  const brochureLinks = useMemo(
    () =>
      generateBrochureLinks(demo).map((link) => ({
        ...link,
        toggle: () => dispatch(demoActions.toggleLinkButton(link.id)),
        remove: () =>
          actions.confirm({
            title: `Delete the ${link.label} button?`,
            msg: 'The button is removed from every eBrochure sent from this property going forward.',
            label: 'Delete Button',
            action: { type: demoActions.removeLinkButton.type, payload: link.id }
          })
      })),
    [demo, dispatch, actions]
  );

  const poiResults = generatePoiResults(demo);

  return {
    prop: generatePropertyView(demo),
    contentTabs,
    isContentPages: demo.contentTab === 'pages',
    isContentHome: demo.contentTab === 'home',
    isContentHood: demo.contentTab === 'hood',
    contentPages,
    contentPagesEmpty: contentPages.length === 0,
    addPage: () =>
      dispatch(
        demoActions.openModal({
          kind: 'page',
          form: { title: '', ptype: PAGE_TYPES.embed.label, detail: '', onHome: 'Yes' }
        })
      ),
    homeTiles,
    tileCount: tiles.length,
    tileFallback: tiles.length < 5,
    tileFallbackNote: `Only ${tiles.length} tiles set — the homepage fills the remaining slots with platform defaults (Floor Plans, Availability, Amenities, Map & Tour, Neighborhood).`,
    addTile: () => dispatch(demoActions.openModal({ kind: 'tile', form: { label: '', icon: 'grid' } })),
    brochureLinks,
    brochureEmpty: brochureLinks.length === 0,
    addLinkBtn: () => dispatch(demoActions.openModal({ kind: 'link', form: { label: '', url: '' } })),
    hood: generateHoodView(demo),
    hoodCats: generateHoodCats(demo).map((category) => ({
      ...category,
      pick: () => dispatch(demoActions.toggleHoodCategory(category.label))
    })),
    onHoodCenter: (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.patchHood({ center: e.target.value })),
    onHoodRadius: (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.patchHood({ radius: parseFloat(e.target.value) })),
    refreshPoi: () => dispatch(demoActions.refreshPoi()),
    poiResults,
    poiCount: poiResults.length,
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties)
  };
};
