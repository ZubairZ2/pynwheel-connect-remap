'use client';

import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curProp, curTour } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { generatePropertyView } from '~/core/utils/generator/connect/property.generator';
import {
  generateElevators,
  generateStartPointRows,
  generateStartPointsMissing,
  generateStopOptions,
  generateTourStops,
  generateTsTabs,
  generateVerticalLinks,
  stopSourceOptions
} from '~/core/utils/generator/connect/tour.generator';

export const useTourSetupScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const tour = curTour(demo);

  const tsTabs = useMemo(
    () =>
      generateTsTabs(demo).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setTab({ key: 'tsTab', value: tab.id }))
      })),
    [demo, dispatch]
  );

  const tourStops = useMemo(
    () =>
      generateTourStops(demo).map((stop) => ({
        ...stop,
        onTalk: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          dispatch(demoActions.setStopTalkingPoint({ id: stop.id, value: e.target.value })),
        edit: () =>
          dispatch(
            demoActions.openModal({
              kind: 'stop',
              editingId: stop.id,
              form: {
                name: stop.name,
                type: stop.type,
                icon: stop.icon,
                floorLabel: stop.floorLabel,
                distance: String(stop.distance),
                duration: String(stop.duration),
                talkingPoint: stop.talkingPoint
              }
            })
          ),
        remove: () =>
          actions.confirm({
            title: `Remove ${stop.name}?`,
            msg: 'This deletes the stop, its content, and any pathway connections to it. You will need to publish again to push the change to the touch app.',
            label: 'Remove Stop',
            action: { type: demoActions.removeStop.type, payload: stop.id }
          }),
        moveUp: () => dispatch(demoActions.moveStop({ id: stop.id, dir: -1 })),
        moveDown: () => dispatch(demoActions.moveStop({ id: stop.id, dir: 1 })),
        view: () =>
          stop.sourceKind && stop.sourceId
            ? actions.plotItem(
                { kind: stop.sourceKind, id: stop.sourceId },
                stop.placed ? 'select' : 'plot'
              )
            : (dispatch(demoActions.pickLevel(stop.levelId ?? demo.levelId)), actions.goMapEditor())
      })),
    [demo, dispatch, actions]
  );

  const invElevators = useMemo(
    () =>
      generateElevators(demo).map((elevator) => ({
        ...elevator,
        toggleLock: () => dispatch(demoActions.toggleElevatorLock(elevator.id)),
        addPhoto: () => dispatch(demoActions.addGalleryPhoto({ kind: 'elevators', id: elevator.id })),
        photos: elevator.photos.map((photo) => ({
          ...photo,
          up: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'elevators', id: elevator.id, index: photo.index, dir: -1 })),
          down: () =>
            dispatch(demoActions.moveGalleryPhoto({ kind: 'elevators', id: elevator.id, index: photo.index, dir: 1 })),
          drop: () =>
            actions.confirm({
              title: 'Remove this photo?',
              msg: 'It is deleted from the gallery on the kiosk, the web embed, and the emailed brochure.',
              label: 'Remove Photo',
              action: {
                type: demoActions.removeGalleryPhoto.type,
                payload: { kind: 'elevators', id: elevator.id, index: photo.index }
              }
            })
        })),
        remove: () =>
          actions.confirm({
            title: `Remove ${elevator.name}?`,
            msg: 'This deletes the elevator bank and any smart-lock grant rule tied to it. Tour stops that route through it need a new vertical connection.',
            label: 'Remove Bank',
            action: { type: demoActions.removeElevator.type, payload: elevator.id }
          })
      })),
    [demo, dispatch, actions]
  );

  const pool = stopSourceOptions(demo);

  return {
    prop: generatePropertyView(demo),
    tsTabs,
    isTsStops: demo.tsTab === 'stops',
    isTsElevators: demo.tsTab === 'elevators',
    isTsRouting: demo.tsTab === 'routing',
    tourStops,
    propHasNoStops: tour.stops.length === 0,
    stopSourcePool: `${plural(pool.length, 'unit or amenity', 'units and amenities')} still available to promote`,
    addStop: () =>
      pool.length
        ? dispatch(
            demoActions.openModal({
              kind: 'stop',
              form: { source: pool[0], duration: '3', talkingPoint: '' }
            })
          )
        : dispatch(
            demoActions.showToast('Every unit and amenity is already a tour stop. Add inventory first.')
          ),
    invElevators,
    invHasElevators: invElevators.length > 0,
    addElevator: () =>
      dispatch(
        demoActions.openModal({
          kind: 'elevator',
          form: {
            ename: '',
            ebuilding: curProp(demo)?.buildings[0]?.name ?? 'Main',
            efrom: 'Lobby',
            eto: 'Floor 2',
            egated: 'Yes'
          }
        })
      ),
    startPointRows: generateStartPointRows(demo),
    startPointsMissing: generateStartPointsMissing(demo),
    startPointsMissingLabel: 'Automatic routing is disabled until every building has a starting point.',
    stopOptions: generateStopOptions(demo),
    routeFrom: demo.routeFrom,
    routeTo: demo.routeTo,
    onRouteFrom: (e: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.setRouteEnd({ key: 'routeFrom', value: e.target.value })),
    onRouteTo: (e: React.ChangeEvent<HTMLSelectElement>) =>
      dispatch(demoActions.setRouteEnd({ key: 'routeTo', value: e.target.value })),
    computeRoute: actions.computeRoute,
    routeResult: demo.routeResult,
    routeColor: demo.routeColor,
    verticalLinks: generateVerticalLinks(demo),
    publishTour: actions.publishTour,
    goMapEditor: actions.goMapEditor,
    goInventoryUnits: () => actions.goInventory('units'),
    goIntegrations: () => actions.go(CONNECT_ROUTES.integrations),
    backToProperty: () => actions.openProp(demo.propId),
    goProperties: () => actions.go(CONNECT_ROUTES.properties)
  };
};
