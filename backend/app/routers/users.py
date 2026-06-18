from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate
from app.repositories.user_repository import user_repository

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve current authenticated user's profile details.
    """
    return current_user


@router.put("/me", response_model=UserOut, status_code=status.HTTP_200_OK)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update details in the current user's profile.
    """
    updated_user = await user_repository.update(
        db, db_obj=current_user, obj_in=payload
    )
    return updated_user
