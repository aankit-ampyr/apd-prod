from db.db_config import UserBase
from python_common.models import EmailTemplateMixin

class EmailTemplate(EmailTemplateMixin, UserBase):
    __tablename__ = "templates"
