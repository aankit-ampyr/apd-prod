from db.db_config import BaseUser
from python_common.models import UserMixin


class User(UserMixin, BaseUser):
    __tablename__ = "users"