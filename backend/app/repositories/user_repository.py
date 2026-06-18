import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:
    async def get_by_id(self, db: AsyncSession, id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == id))
        return result.scalars().first()

    async def get_by_phone(self, db: AsyncSession, phone_number: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.phone_number == phone_number))
        return result.scalars().first()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        db_obj = User(
            phone_number=obj_in.phone_number,
            email=obj_in.email,
            full_name=obj_in.full_name,
            date_of_birth=obj_in.date_of_birth,
            age=obj_in.age,
            gender=obj_in.gender,
            blood_group=obj_in.blood_group,
            emergency_contact_name=obj_in.emergency_contact_name,
            emergency_contact_phone=obj_in.emergency_contact_phone,
            allergies=obj_in.allergies,
            chronic_conditions=obj_in.chronic_conditions,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate
    ) -> User:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


user_repository = UserRepository()
