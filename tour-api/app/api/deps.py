"""Request dependencies: the container, the signed-in Super Admin, the property."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Path, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..container import Container
from ..repositories.properties import PropertyRow
from ..services.auth import AuthContext

bearer_scheme = HTTPBearer(auto_error=False, description="The access token returned by POST /api/v1/auth/login.")


def get_container(request: Request) -> Container:
    return request.app.state.container


ContainerDep = Annotated[Container, Depends(get_container)]


def current_user(container: ContainerDep, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]) -> AuthContext:
    token = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else None
    return container.auth.authenticate(token)


CurrentUser = Annotated[AuthContext, Depends(current_user)]


def get_property(container: ContainerDep, user: CurrentUser, property_id: Annotated[int, Path(ge=1, description="The property (CMS community) id.")]) -> PropertyRow:
    """The property, when it exists and the signed-in user may see it (else 404)."""
    return container.properties.get(user, property_id)


PropertyDep = Annotated[PropertyRow, Depends(get_property)]


def get_tour_property(container: ContainerDep, property_row: PropertyDep) -> PropertyRow:
    """A property whose Self-Guided Tour is on (else 422 tour_disabled)."""
    return container.properties.require_tour(property_row)


TourPropertyDep = Annotated[PropertyRow, Depends(get_tour_property)]
