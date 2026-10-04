from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/tabs", tags=["tabs"])


@router.get("", response_model=list[schemas.TabRead])
def list_tabs(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return crud.list_tabs(db, user.id)


@router.post("", response_model=schemas.TabRead, status_code=status.HTTP_201_CREATED)
def create_tab(
    data: schemas.TabCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.tab_to_read(db, user.id, crud.create_tab(db, user.id, data))


@router.put("/{tab_id}", response_model=schemas.TabRead)
def update_tab(
    tab_id: int,
    data: schemas.TabUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.tab_to_read(db, user.id, crud.update_tab(db, user.id, tab_id, data))
    except crud.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.delete("/{tab_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tab(
    tab_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        crud.delete_tab(db, user.id, tab_id)
    except crud.NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except crud.ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
