"""
Project Management models for BESS platform.
Uses BESS database - separate from user management DB.
Stores user_id as integer (no FK); user details fetched from User DB when needed.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    text,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from db.db_config import BessBase


class Project(BessBase):
    """
    Project entity - BESS database.
    owned_by_user_id: current responsible user (updated on reassignment)
    created_by_user_id: original creator (never changes for historical tracking)
    User IDs reference users in the separate User management DB.
    """

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )

    # User IDs - reference User DB (no FK across databases)
    owned_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @hybrid_property
    def proj_id(self):  # type: ignore
        if self.id is None:
            return None
        return f"PROJ-{self.id:04d}"  # LOG-0001, LOG-1001 — no truncation

    @proj_id.expression
    def proj_id(cls):
        # Used when filtering at DB level: Model.query.filter_by(log_id=...)
        from sqlalchemy import func, cast

        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target_len = func.greatest(id_len, 4)

        return func.concat("PROJ-", func.lpad(cast(cls.id, String), target_len, "0"))

    assignments: Mapped[List["ProjectUserAssignment"]] = relationship(
        "ProjectUserAssignment", back_populates="project", cascade="all, delete-orphan"
    )

    simulation: Mapped["Simulation"] = relationship(
        "Simulation",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )


class ProjectUserAssignment(BessBase):
    """
    Maps users to projects with roles.
    user_id references User DB (no FK across databases).
    """

    __tablename__ = "project_user_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)  # References User DB
    role: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3
    )  # 1=Admin, 2=Manager, 3=Member

    project: Mapped["Project"] = relationship("Project", back_populates="assignments")
