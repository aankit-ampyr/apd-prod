from db.db_config import UserBase
from python_common.models import UserMixin


class User(UserMixin, UserBase):
    __tablename__ = "users"
